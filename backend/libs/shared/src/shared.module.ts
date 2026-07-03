import { Module } from '@nestjs/common';
import { SharedService } from './shared.service';
import { MongooseModule } from '@nestjs/mongoose';
import { ParsedData, ParsedDataSchema } from './schemas/parsed-data.schema';
import { createClient } from 'redis';

@Module({
  imports: [
    MongooseModule.forRoot(
      `mongodb://${process.env.MONGO_HOST || 'localhost'}:27017/nest`,
    ),
    MongooseModule.forFeature([
      { name: ParsedData.name, schema: ParsedDataSchema },
    ]),
  ],
  providers: [
    SharedService,
    {
      provide: 'REDIS_CLIENT',
      useFactory: async () => {
        const redisHost = process.env.REDIS_HOST || 'localhost';
        const client = createClient({
          url: `redis://${redisHost}:6379`,
        });
        await client.connect();
        return client;
      },
    },
  ],
  exports: [SharedService, MongooseModule, 'REDIS_CLIENT'],
})
export class SharedModule {}
