import { ParsedData, ParsedDataDocument } from '@app/shared';
import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

@Injectable()
export class AppService {
  constructor(
    @InjectModel(ParsedData.name)
    private parsedDataModel: Model<ParsedDataDocument>,
  ) {}

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
}
