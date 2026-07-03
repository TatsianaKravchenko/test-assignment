import { Module } from '@nestjs/common';
import { AnalyticsServiceController } from './analytics-service.controller';
import { AnalyticsServiceService } from './analytics-service.service';
import { SharedModule } from '@app/shared/shared.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ApiLog } from './entities/log.entity';

@Module({
  imports: [
    SharedModule,
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.POSTGRES_HOST || 'localhost',
      port: Number(process.env.POSTGRES_PORT) || 5432,
      username: process.env.POSTGRES_USER || 'user',
      password: process.env.POSTGRES_PASSWORD || 'password',
      database: process.env.POSTGRES_DB || 'analytics_db',
      entities: [ApiLog],
      synchronize: true,
    }),
    TypeOrmModule.forFeature([ApiLog]),
  ],
  controllers: [AnalyticsServiceController],
  providers: [AnalyticsServiceService],
})
export class AnalyticsServiceModule {}
