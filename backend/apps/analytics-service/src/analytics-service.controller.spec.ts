import { Test, TestingModule } from '@nestjs/testing';
import type { Response } from 'express';
import { AnalyticsServiceController } from './analytics-service.controller';
import { AnalyticsServiceService } from './analytics-service.service';

describe('AnalyticsServiceController', () => {
  let controller: AnalyticsServiceController;
  let service: jest.Mocked<Pick<AnalyticsServiceService, 'getLogs' | 'generatePdfReport'>>;

  beforeEach(async () => {
    service = {
      getLogs: jest.fn(),
      generatePdfReport: jest.fn(),
    };

    const app: TestingModule = await Test.createTestingModule({
      controllers: [AnalyticsServiceController],
      providers: [{ provide: AnalyticsServiceService, useValue: service }],
    }).compile();

    controller = app.get<AnalyticsServiceController>(AnalyticsServiceController);
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
    it('streams the generated PDF with the correct headers', async () => {
      const pdf = Buffer.from('%PDF-1.7');
      service.generatePdfReport.mockResolvedValue(pdf);

      const res = { set: jest.fn(), end: jest.fn() } as unknown as Response;
      await controller.getPdfReport(res);

      expect(res.set).toHaveBeenCalledWith(
        expect.objectContaining({ 'Content-Type': 'application/pdf' }),
      );
      expect(res.end).toHaveBeenCalledWith(pdf);
    });
  });
});
