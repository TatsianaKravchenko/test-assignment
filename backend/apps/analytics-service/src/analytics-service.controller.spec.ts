import { Test, TestingModule } from '@nestjs/testing';
import { ClientGrpc } from '@nestjs/microservices';
import { of } from 'rxjs';
import type { Response } from 'express';
import { AnalyticsServiceController } from './analytics-service.controller';
import { AnalyticsServiceService } from './analytics-service.service';
import { REPORT_PACKAGE, ReportReply } from './report/report.interface';

describe('AnalyticsServiceController', () => {
  let controller: AnalyticsServiceController;
  let service: jest.Mocked<Pick<AnalyticsServiceService, 'getLogs'>>;
  let generateReport: jest.Mock;

  beforeEach(async () => {
    service = { getLogs: jest.fn() };
    generateReport = jest.fn();

    const clientGrpc: ClientGrpc = {
      getService: jest.fn().mockReturnValue({ generateReport }),
      getClientByServiceName: jest.fn(),
    };

    const app: TestingModule = await Test.createTestingModule({
      controllers: [AnalyticsServiceController],
      providers: [
        { provide: AnalyticsServiceService, useValue: service },
        { provide: REPORT_PACKAGE, useValue: clientGrpc },
      ],
    }).compile();

    controller = app.get<AnalyticsServiceController>(AnalyticsServiceController);
    controller.onModuleInit();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getLogs', () => {
    it('forwards the filters to the service', async () => {
      const logs = [{ id: '1', action: 'fetch' }];
      service.getLogs.mockResolvedValue(logs as never);

      const result = await controller.getLogs('fetch', '2026-01-01', '2026-01-02');

      expect(service.getLogs).toHaveBeenCalledWith('fetch', '2026-01-01', '2026-01-02');
      expect(result).toBe(logs);
    });
  });

  describe('getPdfReport', () => {
    it('streams the PDF produced by the gRPC report service', async () => {
      const reply: ReportReply = {
        pdf: Buffer.from('%PDF-1.7'),
        filename: 'analytics_report.pdf',
      };
      generateReport.mockReturnValue(of(reply));

      const res = { set: jest.fn(), end: jest.fn() } as unknown as Response;
      await controller.getPdfReport(res);

      expect(generateReport).toHaveBeenCalledWith({});
      expect(res.set).toHaveBeenCalledWith(
        expect.objectContaining({ 'Content-Type': 'application/pdf' }),
      );
      expect(res.end).toHaveBeenCalledWith(reply.pdf);
    });
  });
});
