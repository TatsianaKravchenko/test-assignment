import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppService } from './app.service';

describe('AppController', () => {
  let appController: AppController;
  let appService: jest.Mocked<Pick<AppService, 'searchProducts' | 'fetchAndSaveFromApi'>>;

  beforeEach(async () => {
    appService = {
      searchProducts: jest.fn(),
      fetchAndSaveFromApi: jest.fn(),
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

  describe('fetch', () => {
    it('delegates to the fetch-and-ingest pipeline', async () => {
      const result = { message: 'ok', file: 'f.json', totalItemsInserted: 100 };
      appService.fetchAndSaveFromApi.mockResolvedValue(result as never);

      await expect(appController.fetchApiData()).resolves.toBe(result);
      expect(appService.fetchAndSaveFromApi).toHaveBeenCalledTimes(1);
    });
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
});
