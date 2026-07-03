import { Controller, Get, Query, Res } from '@nestjs/common';
import { AnalyticsServiceService } from './analytics-service.service';
import { ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { type Response } from 'express';

@ApiTags('Analytics')
@Controller('analytics')
export class AnalyticsServiceController {
  constructor(
    private readonly analyticsServiceService: AnalyticsServiceService,
  ) {}

  @Get('logs')
  @ApiOperation({ summary: 'Get captured API logs with optional filters' })
  @ApiQuery({
    name: 'action',
    required: false,
    example: 'fetch',
    description: 'Can be fetch, upload or search',
  })
  @ApiQuery({
    name: 'startDate',
    required: false,
    description: 'ISO date string',
  })
  @ApiQuery({
    name: 'endDate',
    required: false,
    description: 'ISO date string',
  })
  async getLogs(
    @Query('action') action?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.analyticsServiceService.getLogs(action, startDate, endDate);
  }

  @Get('report')
  @ApiOperation({
    summary: 'Generate PDF Report with charts from RedisTimeSeries metrics',
  })
  async getPdfReport(@Res() res: Response) {
    const pdfBuffer = await this.analyticsServiceService.generatePdfReport();

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'attachment; filename=analytics_report.pdf',
      'Content-Length': pdfBuffer.length,
    });

    res.end(pdfBuffer);
  }
}
