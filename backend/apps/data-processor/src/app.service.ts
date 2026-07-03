import { ParsedData, ParsedDataDocument } from '@app/shared';
import { HttpService } from '@nestjs/axios';
import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { firstValueFrom } from 'rxjs';
import * as fs from 'fs';
import * as path from 'path';
import { RedisTimeSeriesService } from './redis-time-series.service';

@Injectable()
export class AppService {
  constructor(
    @InjectModel(ParsedData.name)
    private parsedDataModel: Model<ParsedDataDocument>,
    private readonly httpService: HttpService,
    private readonly redisTimeSeriesService: RedisTimeSeriesService,
  ) {}

  async onApplicationBootstrap() {
    try {
      const count = await this.parsedDataModel.countDocuments().exec();
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
      const largeData = response.data;
      const fileName = `api_products_${Date.now()}.json`;
      const filePath = path.join(__dirname, '..', '..', '..', fileName);

      fs.writeFileSync(filePath, JSON.stringify(largeData, null, 2), 'utf-8');

      const newRecord = new this.parsedDataModel({
        fileName,
        fileType: 'json',
        content: largeData.products,
        status: 'pending',
      });
      const savedRecord = await newRecord.save();

      await this.redisTimeSeriesService.logAction('fetch');

      return {
        message:
          'Data fetched from DummyJSON, saved to file and robustly inserted to Mongo',
        file: fileName,
        mongoId: savedRecord._id,
        totalItemsInserted: largeData.products.length,
      };
    } catch (error: any) {
      throw new InternalServerErrorException(
        `Failed to fetch and process API data: ${error.message}`,
      );
    }
  }

  async processUploadedFile(file: Express.Multer.File) {
    const fileName = file.originalname;
    const fileExtension = fileName.split('.').pop()?.toLowerCase();
    let parsedContent: any;

    try {
      if (fileExtension === 'json') {
        parsedContent = JSON.parse(file.buffer.toString('utf-8'));
      } else if (fileExtension === 'csv') {
        parsedContent = { rawLines: file.buffer.toString('utf-8').split('\n') };
      } else {
        throw new BadRequestException(
          'Unsupported file type. Only JSON/CSV are allowed.',
        );
      }

      const newRecord = new this.parsedDataModel({
        fileName,
        fileType: fileExtension,
        content: parsedContent,
        status: 'processed',
      });

      const savedRecord = await newRecord.save();

      await this.redisTimeSeriesService.logAction('upload');

      return {
        message: 'File uploaded and processed successfully',
        id: savedRecord._id,
        fileName: savedRecord.fileName,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      throw new BadRequestException(`Failed to process file: ${errorMessage}`);
    }
  }

  async searchProducts(query: string, limit: number = 10, skip: number = 0) {
    const parsedLimit = Number(limit) || 10;
    const parsedSkip = Number(skip) || 0;
    const pipeline: any[] = [];

    pipeline.push({ $unwind: '$content' });

    if (query && query.trim().length > 0) {
      pipeline.push({
        $match: {
          'content.title': { $regex: query, $options: 'i' },
        },
      });
    }

    pipeline.push(
      { $project: { _id: 0, product: '$content' } },
      {
        $facet: {
          results: [{ $skip: parsedSkip }, { $limit: Number(parsedLimit) }],
          totalCount: [{ $count: 'count' }],
        },
      },
    );

    const resultsFromDb = await this.parsedDataModel.aggregate(pipeline).exec();

    const aggregationResult = resultsFromDb && resultsFromDb[0];

    const results = aggregationResult?.results
      ? aggregationResult.results.map((r: any) => r.product).filter(Boolean)
      : [];

    const total = aggregationResult?.totalCount?.[0]?.count || 0;

    if (query && query.trim().length > 0) {
      await this.redisTimeSeriesService.logAction('search');
    }

    return {
      data: results,
      meta: {
        total,
        skip: parsedSkip,
        limit: parsedLimit,
      },
    };
  }
}
