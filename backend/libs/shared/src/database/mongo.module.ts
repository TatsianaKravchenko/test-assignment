import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ParsedData, ParsedDataSchema } from '../schemas/parsed-data.schema';
import { Product, ProductSchema } from '../schemas/product.schema';

@Module({
  imports: [
    MongooseModule.forRoot(
      `mongodb://${process.env.MONGO_HOST || 'localhost'}:27017/nest`,
    ),
    MongooseModule.forFeature([
      { name: ParsedData.name, schema: ParsedDataSchema },
      { name: Product.name, schema: ProductSchema },
    ]),
  ],
  exports: [MongooseModule],
})
export class MongoModule {}
