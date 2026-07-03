import { Injectable, Inject, OnModuleInit } from '@nestjs/common';
import { type RedisClientType } from 'redis';

@Injectable()
export class RedisTimeSeriesService implements OnModuleInit {
  constructor(
    @Inject('REDIS_CLIENT') private readonly redisClient: RedisClientType,
  ) {}

  async onModuleInit() {
    const actions = ['action:fetch', 'action:upload', 'action:search'];

    for (const action of actions) {
      try {
        await this.redisClient.sendCommand([
          'TS.CREATE',
          action,
          'DUPLICATION_POLICY',
          'FIRST',
        ]);
      } catch (e) {}
    }
  }

  async logAction(actionType: 'fetch' | 'upload' | 'search') {
    const key = `action:${actionType}`;
    const timestamp = Date.now();
    const value = '1';

    try {
      await this.redisClient.sendCommand([
        'TS.ADD',
        key,
        timestamp.toString(),
        value,
      ]);

      await this.redisClient.publish(
        'api-events',
        JSON.stringify({
          action: actionType,
          timestamp,
        }),
      );

      console.log(`[RedisTimeSeries] Logged and published event: ${key}`);
    } catch (error) {
      console.error('Failed to log metric to RedisTimeSeries', error);
    }
  }
}
