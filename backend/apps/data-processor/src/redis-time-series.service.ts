import { Injectable, Inject, OnModuleInit } from '@nestjs/common';
import { REDIS_CLIENT } from '@app/shared';
import { type RedisClientType } from 'redis';

@Injectable()
export class RedisTimeSeriesService implements OnModuleInit {
  constructor(
    @Inject(REDIS_CLIENT) private readonly redisClient: RedisClientType,
  ) {}

  async onModuleInit() {
    const actions: ('fetch' | 'upload' | 'search')[] = [
      'fetch',
      'upload',
      'search',
    ];

    for (const action of actions) {
      const key = `action:${action}`;

      try {
        await this.redisClient.sendCommand([
          'TS.CREATE',
          key,
          'RETENTION',
          '0',
        ]);
      } catch (error: unknown) {
        if (error instanceof Error) {
          if (!error.message.includes('key already exists')) {
            console.error(
              `[RedisTimeSeries] Failed to initialize time-series key "${key}":`,
              error.message,
            );
          }
        } else {
          console.error(
            `[RedisTimeSeries] Unknown error during initialization of "${key}":`,
            error,
          );
        }
      }
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
