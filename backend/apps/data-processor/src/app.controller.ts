import {
  Controller,
  Get,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AppService, type MulterFile } from './app.service';
import { SearchQueryDto } from './dto/search-query.dto';
import {
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';

@ApiTags('Data Processor (Service A)')
@Controller('data')
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get('fetch')
  @ApiOperation({
    summary:
      'Fetch products from the public API, save to a JSON file, parse it and insert into MongoDB',
  })
  async fetchApiData() {
    return this.appService.fetchAndSaveFromApi();
  }

  @Post('upload')
  @ApiOperation({
    summary:
      'Upload a JSON file, parse it and insert the products into MongoDB',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
      },
    },
  })
  @UseInterceptors(FileInterceptor('file'))
  async upload(@UploadedFile() file: MulterFile) {
    return this.appService.uploadAndParse(file);
  }

  @Get('search')
  @ApiOperation({
    summary: 'Search API with efficient pagination over stored products',
  })
  async search(@Query() searchQuery: SearchQueryDto) {
    return this.appService.searchProducts(
      searchQuery.query ?? '',
      searchQuery.limit,
      searchQuery.skip,
    );
  }
}
