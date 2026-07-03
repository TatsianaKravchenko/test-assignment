import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { SharedModule } from '@app/shared/shared.module';
import { HttpModule } from '@nestjs/axios';
import { RedisTimeSeriesService } from './redis-time-series.service';

@Module({
  imports: [SharedModule, HttpModule],
  controllers: [AppController],
  providers: [AppService, RedisTimeSeriesService],
})
export class AppModule {}
