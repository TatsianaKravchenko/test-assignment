import { Module } from '@nestjs/common';
import { AnalyticsServiceController } from './analytics-service.controller';
import { AnalyticsServiceService } from './analytics-service.service';
import { RedisModule } from '@app/shared';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { join } from 'path';
import { ApiLog } from './entities/log.entity';
import { REPORT_PACKAGE } from './report/report.interface';

@Module({
  imports: [
    RedisModule,
    ClientsModule.register([
      {
        name: REPORT_PACKAGE,
        transport: Transport.GRPC,
        options: {
          package: 'report',
          protoPath: join(__dirname, 'report', 'report.proto'),
          url: process.env.REPORT_GRPC_URL || 'localhost:50051',
        },
      },
    ]),
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
