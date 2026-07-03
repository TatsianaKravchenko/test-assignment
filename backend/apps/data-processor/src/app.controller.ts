import {
  BadRequestException,
  Controller,
  Get,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { AppService } from './app.service';
import {
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { Multer } from 'multer';

@ApiTags('Data Processor (Service A)')
@Controller('data')
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get('fetch')
  @ApiOperation({
    summary:
      'Automatically fetch products from DummyJSON API, save to local file and Mongo',
  })
  async fetchApiData() {
    return this.appService.fetchAndSaveFromApi();
  }

  @Get('search')
  @ApiOperation({
    summary: 'Search API with efficient pagination over stored products',
  })
  @ApiQuery({
    name: 'q',
    required: false,
    description: 'Search query for product title or description',
  })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 10 })
  async search(
    @Query('q') q: string = '',
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
  ) {
    return this.appService.searchProducts(q, page, limit);
  }

  @Post('upload')
  @ApiOperation({ summary: 'Upload and parse data file (JSON/CSV)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('File is required');
    }

    return this.appService.processUploadedFile(file);
  }
}
