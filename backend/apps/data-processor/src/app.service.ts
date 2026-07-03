import {
  ParsedData,
  ParsedDataDocument,
  Product,
  ProductDocument,
} from '@app/shared';
import { HttpService } from '@nestjs/axios';
import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { AnyBulkWriteOperation } from 'mongodb';
import { Model } from 'mongoose';
import { firstValueFrom } from 'rxjs';
import * as fs from 'fs';
import * as path from 'path';
import { RedisTimeSeriesService } from './redis-time-series.service';

type RawProduct = Record<string, any>;

@Injectable()
export class AppService {
  constructor(
    @InjectModel(ParsedData.name)
    private parsedDataModel: Model<ParsedDataDocument>,
    @InjectModel(Product.name)
    private productModel: Model<ProductDocument>,
    private readonly httpService: HttpService,
    private readonly redisTimeSeriesService: RedisTimeSeriesService,
  ) {}

  async onApplicationBootstrap() {
    try {
      const count = await this.productModel.estimatedDocumentCount().exec();
      if (count === 0) {
        await this.fetchAndSaveFromApi();
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(
        `[DataProcessor] Initial data seeding on bootstrap failed: ${message}`,
      );
    }
  }

  async fetchAndSaveFromApi() {
    try {
      const response = await firstValueFrom(
        this.httpService.get('https://dummyjson.com/products?limit=100'),
      );
      const products: RawProduct[] = response.data?.products ?? [];

      const fileName = `api_products_${Date.now()}.json`;
      const filePath = path.join(__dirname, '..', '..', '..', fileName);
      fs.writeFileSync(
        filePath,
        JSON.stringify(response.data, null, 2),
        'utf-8',
      );

      const inserted = await this.upsertProducts(products);
      await this.logIngestion(fileName, 'json', inserted);
      await this.redisTimeSeriesService.logAction('fetch');

      return {
        message:
          'Data fetched from DummyJSON, saved to file and inserted one-per-document into Mongo',
        file: fileName,
        totalItemsInserted: inserted,
      };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      throw new InternalServerErrorException(
        `Failed to fetch and process API data: ${message}`,
      );
    }
  }

  async processUploadedFile(file: Express.Multer.File) {
    const fileName = file.originalname;
    const fileExtension = fileName.split('.').pop()?.toLowerCase();

    try {
      let products: RawProduct[];
      if (fileExtension === 'json') {
        products = this.extractProducts(
          JSON.parse(file.buffer.toString('utf-8')),
        );
      } else if (fileExtension === 'csv') {
        products = this.parseCsv(file.buffer.toString('utf-8'));
      } else {
        throw new BadRequestException(
          'Unsupported file type. Only JSON/CSV are allowed.',
        );
      }

      if (products.length === 0) {
        throw new BadRequestException('No records found in the uploaded file.');
      }

      const inserted = await this.upsertProducts(products);
      await this.logIngestion(fileName, fileExtension ?? 'unknown', inserted);
      await this.redisTimeSeriesService.logAction('upload');

      return {
        message: 'File uploaded and processed successfully',
        fileName,
        totalItemsInserted: inserted,
      };
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      const message = error instanceof Error ? error.message : 'Unknown error';
      throw new BadRequestException(`Failed to process file: ${message}`);
    }
  }

  async searchProducts(query: string, limit: number = 10, skip: number = 0) {
    const parsedLimit = Number(limit) || 10;
    const parsedSkip = Number(skip) || 0;
    const trimmed = (query ?? '').trim();

    const filter = trimmed
      ? {
          $or: [
            { title: { $regex: escapeRegex(trimmed), $options: 'i' } },
            { description: { $regex: escapeRegex(trimmed), $options: 'i' } },
          ],
        }
      : {};

    const [data, total] = await Promise.all([
      this.productModel
        .find(filter)
        .skip(parsedSkip)
        .limit(parsedLimit)
        .lean()
        .exec(),
      this.productModel.countDocuments(filter).exec(),
    ]);

    if (trimmed.length > 0) {
      await this.redisTimeSeriesService.logAction('search');
    }

    return {
      data,
      meta: {
        total,
        skip: parsedSkip,
        limit: parsedLimit,
      },
    };
  }

  private async upsertProducts(products: RawProduct[]): Promise<number> {
    const withTitle = products.filter((p) => p && typeof p.title === 'string');
    if (withTitle.length === 0) return 0;

    const ops: AnyBulkWriteOperation<RawProduct>[] = withTitle.map((product) =>
      product.id !== undefined
        ? {
            updateOne: {
              filter: { id: product.id },
              update: { $set: product },
              upsert: true,
            },
          }
        : { insertOne: { document: product } },
    );

    await this.productModel.bulkWrite(ops, { ordered: false });
    return withTitle.length;
  }

  private async logIngestion(
    fileName: string,
    fileType: string,
    recordCount: number,
  ): Promise<void> {
    await this.parsedDataModel.create({
      fileName,
      fileType,
      recordCount,
      status: 'processed',
    });
  }

  private extractProducts(payload: unknown): RawProduct[] {
    if (Array.isArray(payload)) return payload as RawProduct[];
    if (payload && typeof payload === 'object') {
      const products = (payload as RawProduct).products;
      if (Array.isArray(products)) return products as RawProduct[];
      return [payload as RawProduct];
    }
    return [];
  }

  private parseCsv(raw: string): RawProduct[] {
    const lines = raw
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.length > 0);
    if (lines.length < 2) return [];

    const headers = lines[0].split(',').map((h) => h.trim());
    return lines.slice(1).map((line) => {
      const cells = line.split(',');
      const record: RawProduct = {};
      headers.forEach((header, index) => {
        record[header] = cells[index]?.trim() ?? '';
      });
      return record;
    });
  }
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
