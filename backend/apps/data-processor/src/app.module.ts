import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { MongoModule, RedisModule } from '@app/shared';
import { HttpModule } from '@nestjs/axios';
import { RedisTimeSeriesService } from './redis-time-series.service';

@Module({
  imports: [MongoModule, RedisModule, HttpModule],
  controllers: [AppController],
  providers: [AppService, RedisTimeSeriesService],
})
export class AppModule {}
