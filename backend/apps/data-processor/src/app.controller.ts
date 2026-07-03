import { Controller, Get, Query } from '@nestjs/common';
import { AppService } from './app.service';
import { ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';

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

  @Get('search')
  @ApiOperation({
    summary: 'Search API with efficient pagination over stored products',
  })
  @ApiQuery({
    name: 'query',
    required: false,
    description: 'Search query for product title or description',
  })
  @ApiQuery({ name: 'limit', required: false, example: 10 })
  @ApiQuery({ name: 'skip', required: false, example: 0 })
  async search(
    @Query('query') query?: string,
    @Query('limit') limit?: number,
    @Query('skip') skip?: number,
  ) {
    return this.appService.searchProducts(query ?? '', limit, skip);
  }
}
