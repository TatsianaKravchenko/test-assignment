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

@Injectable()
export class AppService {
  constructor(
    @InjectModel(ParsedData.name)
    private parsedDataModel: Model<ParsedDataDocument>,
    private readonly httpService: HttpService,
  ) {}

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

  async searchProducts(query: string, page: number = 1, limit: number = 10) {
    const skip = (page - 1) * limit;
    const pipeline: any[] = [{ $unwind: '$content' }];

    if (query) {
      pipeline.push({
        $match: {
          $or: [
            { 'content.title': { $regex: query, $options: 'i' } },
            { 'content.description': { $regex: query, $options: 'i' } },
          ],
        },
      });
    }

    pipeline.push(
      { $project: { _id: 0, product: '$content' } },
      {
        $facet: {
          results: [{ $skip: skip }, { $limit: Number(limit) }],
          totalCount: [{ $count: 'count' }],
        },
      },
    );

    const [aggregationResult] = await this.parsedDataModel
      .aggregate(pipeline)
      .exec();

    const results = aggregationResult?.results.map((r: any) => r.product) || [];
    const total = aggregationResult?.totalCount[0]?.count || 0;

    return {
      data: results,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}
