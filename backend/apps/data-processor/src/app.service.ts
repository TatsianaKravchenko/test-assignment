import {
  ParsedData,
  ParsedDataDocument,
  Product,
  ProductDocument,
} from '@app/shared';
import { HttpService } from '@nestjs/axios';
import {
  Injectable,
  InternalServerErrorException,
  OnApplicationBootstrap,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { AnyBulkWriteOperation } from 'mongodb';
import { Model } from 'mongoose';
import { firstValueFrom } from 'rxjs';
import * as fs from 'fs';
import * as path from 'path';
import { RedisTimeSeriesService } from './redis-time-series.service';

type RawProduct = Record<string, any>;

const DEFAULT_PUBLIC_API_URL = 'https://dummyjson.com/products?limit=100';

@Injectable()
export class AppService implements OnApplicationBootstrap {
  constructor(
    @InjectModel(ParsedData.name)
    private parsedDataModel: Model<ParsedDataDocument>,
    @InjectModel(Product.name)
    private productModel: Model<ProductDocument>,
    private readonly httpService: HttpService,
    private readonly redisTimeSeriesService: RedisTimeSeriesService,
    private readonly configService: ConfigService,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    try {
      const count = await this.productModel.estimatedDocumentCount().exec();
      if (count === 0) {
        await this.fetchAndSaveFromApi();
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(
        `[DataProcessor] Initial data load on bootstrap failed: ${message}`,
      );
    }
  }

  async fetchAndSaveFromApi() {
    try {
      const apiUrl =
        this.configService.get<string>('PUBLIC_API_URL') ??
        DEFAULT_PUBLIC_API_URL;
      const response = await firstValueFrom(this.httpService.get(apiUrl));

      const fileName = `api_products_${Date.now()}.json`;
      const filePath = path.join(__dirname, '..', '..', '..', fileName);
      fs.writeFileSync(
        filePath,
        JSON.stringify(response.data, null, 2),
        'utf-8',
      );

      const fileContent = fs.readFileSync(filePath, 'utf-8');
      const products = this.parseProductsFile(fileContent);
      const inserted = await this.upsertProducts(products);

      await this.logIngestion(fileName, 'json', inserted);
      await this.redisTimeSeriesService.logAction('fetch');

      return {
        message:
          'Data fetched from the public API, saved to file and inserted into MongoDB',
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

  private parseProductsFile(raw: string): RawProduct[] {
    const payload = JSON.parse(raw);
    if (Array.isArray(payload)) return payload as RawProduct[];
    if (payload && typeof payload === 'object') {
      const products = (payload as RawProduct).products;
      if (Array.isArray(products)) return products as RawProduct[];
    }
    return [];
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
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
