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
    console.log(
      '[Analytics Service] Initializing Redis Pub/Sub subscription...',
    );

    this.subClient = this.redisClient.duplicate() as RedisClientType;
    await this.subClient.connect();

    await this.subClient.subscribe('api-events', async (message) => {
      try {
        const eventData = JSON.parse(message);
        console.log(
          `[Analytics Service] Received event from Service A:`,
          eventData,
        );

        const newLog = this.logRepository.create({
          action: eventData.action,
          eventTimestamp: eventData.timestamp.toString(),
        });

        const savedLog = await this.logRepository.save(newLog);
        console.log(
          `[Analytics Service] Log successfully saved to PostgreSQL. ID: ${savedLog.id}`,
        );
      } catch (error) {
        console.error(
          '[Analytics Service] Failed to process or save intercepted event:',
          error,
        );
      }
    });

    console.log(
      '[Analytics Service] Successfully subscribed to channel: "api-events"',
    );
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
