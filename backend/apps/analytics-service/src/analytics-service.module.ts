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
      host: 'localhost',
      port: 5432,
      username: 'user',
      password: 'password',
      database: 'analytics_db',
      entities: [ApiLog],
      synchronize: true,
    }),
    TypeOrmModule.forFeature([ApiLog]),
  ],
  controllers: [AnalyticsServiceController],
  providers: [AnalyticsServiceService],
})
export class AnalyticsServiceModule {}
