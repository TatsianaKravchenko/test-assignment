import { Module } from '@nestjs/common';
import { SharedService } from './shared.service';
import { MongooseModule } from '@nestjs/mongoose';
import { ParsedData, ParsedDataSchema } from './schemas/parsed-data.schema';

@Module({
  imports: [
    MongooseModule.forRoot('mongodb://localhost:27017/data_processor_db'),
    MongooseModule.forFeature([
      { name: ParsedData.name, schema: ParsedDataSchema },
    ]),
  ],
  providers: [SharedService],
  exports: [SharedService, MongooseModule],
})
export class SharedModule {}
