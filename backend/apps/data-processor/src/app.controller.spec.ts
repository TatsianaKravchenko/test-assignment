import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';

describe('AppController', () => {
  let appController: AppController;
  let appService: jest.Mocked<Pick<AppService, 'searchProducts' | 'processUploadedFile'>>;

  beforeEach(async () => {
    appService = {
      searchProducts: jest.fn(),
      processUploadedFile: jest.fn(),
    };

    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [{ provide: AppService, useValue: appService }],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  it('should be defined', () => {
    expect(appController).toBeDefined();
  });

  describe('search', () => {
    it('delegates query/limit/skip to the service', async () => {
      const expected = { data: [], meta: { total: 0, skip: 0, limit: 10 } };
      appService.searchProducts.mockResolvedValue(expected as never);

      const result = await appController.search('phone', 10, 0);

      expect(appService.searchProducts).toHaveBeenCalledWith('phone', 10, 0);
      expect(result).toBe(expected);
    });

    it('defaults query to an empty string when omitted', async () => {
      appService.searchProducts.mockResolvedValue({} as never);

      await appController.search(undefined, undefined, undefined);

      expect(appService.searchProducts).toHaveBeenCalledWith('', undefined, undefined);
    });
  });

  describe('uploadFile', () => {
    it('throws BadRequestException when no file is provided', async () => {
      await expect(
        appController.uploadFile(undefined as unknown as Express.Multer.File),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(appService.processUploadedFile).not.toHaveBeenCalled();
    });
  });
});
