import { Inject, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { REDIS_CLIENT } from '@app/shared';
import { type RedisClientType } from 'redis';
import { ApiLog } from './entities/log.entity';
import { Repository } from 'typeorm';

@Injectable()
export class AnalyticsServiceService {
  private subClient!: RedisClientType;

  constructor(
    @InjectRepository(ApiLog)
    private readonly logRepository: Repository<ApiLog>,
    @Inject(REDIS_CLIENT)
    private readonly redisClient: RedisClientType,
  ) {}

  async onModuleInit() {
    this.subClient = this.redisClient.duplicate() as RedisClientType;
    await this.subClient.connect();

    await this.subClient.subscribe('api-events', async (message) => {
      try {
        const eventData = JSON.parse(message);

        const newLog = this.logRepository.create({
          action: eventData.action,
          eventTimestamp: eventData.timestamp.toString(),
        });

        await this.logRepository.save(newLog);
      } catch (error) {
        console.error(
          '[Analytics Service] Failed to process or save intercepted event:',
          error,
        );
      }
    });
  }

  async getLogs(action?: string, startDate?: string, endDate?: string) {
    const queryBuilder = this.logRepository.createQueryBuilder('log');

    if (action) {
      queryBuilder.andWhere('log.action = :action', { action });
    }

    if (startDate) {
      queryBuilder.andWhere('log.createdAt >= :startDate', {
        startDate: new Date(startDate),
      });
    }

    if (endDate) {
      queryBuilder.andWhere('log.createdAt <= :endDate', {
        endDate: new Date(endDate),
      });
    }

    queryBuilder.orderBy('log.createdAt', 'DESC');

    return queryBuilder.getMany();
  }

  async onModuleDestroy() {
    if (this.subClient) {
      await this.subClient.disconnect();
    }
  }
}
