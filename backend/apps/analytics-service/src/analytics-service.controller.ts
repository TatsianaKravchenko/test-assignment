import {
  Controller,
  Get,
  Inject,
  OnModuleInit,
  Query,
  Res,
} from '@nestjs/common';
import { AnalyticsServiceService } from './analytics-service.service';
import { ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { type ClientGrpc } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import { type Response } from 'express';
import {
  REPORT_PACKAGE,
  REPORT_SERVICE_NAME,
  ReportServiceClient,
} from './report/report.interface';

@ApiTags('Analytics')
@Controller('analytics')
export class AnalyticsServiceController implements OnModuleInit {
  private reportService!: ReportServiceClient;

  constructor(
    private readonly analyticsServiceService: AnalyticsServiceService,
    @Inject(REPORT_PACKAGE) private readonly reportClient: ClientGrpc,
  ) {}

  onModuleInit() {
    this.reportService =
      this.reportClient.getService<ReportServiceClient>(REPORT_SERVICE_NAME);
  }

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
    summary:
      'Generate PDF report (rendered by the Go report-service over gRPC) from RedisTimeSeries metrics',
  })
  async getPdfReport(@Res() res: Response) {
    const reply = await firstValueFrom(
      this.reportService.generateReport({}),
    );

    const pdf = Buffer.isBuffer(reply.pdf)
      ? reply.pdf
      : Buffer.from(reply.pdf as unknown as Uint8Array);

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename=${reply.filename || 'analytics_report.pdf'}`,
      'Content-Length': pdf.length,
    });

    res.end(pdf);
  }
}
