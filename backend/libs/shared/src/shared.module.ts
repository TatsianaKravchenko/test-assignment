import { Module } from '@nestjs/common';
import { SharedService } from './shared.service';
import { MongooseModule } from '@nestjs/mongoose';
import { ParsedData, ParsedDataSchema } from './schemas/parsed-data.schema';
import { createClient } from 'redis';

@Module({
  imports: [
    MongooseModule.forRoot('mongodb://localhost:27017/data_processor_db'),
    MongooseModule.forFeature([
      { name: ParsedData.name, schema: ParsedDataSchema },
    ]),
  ],
  providers: [
    SharedService,
    {
      provide: 'REDIS_CLIENT',
      useFactory: async () => {
        const client = createClient({
          url: 'redis://localhost:6379',
        });
        await client.connect();
        return client;
      },
    },
  ],
  exports: [SharedService, MongooseModule, 'REDIS_CLIENT'],
})
export class SharedModule {}
