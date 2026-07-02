import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type ParsedDataDocument = ParsedData & Document;

@Schema({ timestamps: true })
export class ParsedData {
  @Prop({ required: true })
  fileName!: string;

  @Prop({ required: true })
  fileType!: string;

  @Prop({ type: Object, required: true })
  content!: Record<string, any>;

  @Prop({ default: 'processed' })
  status!: string;
}

export const ParsedDataSchema = SchemaFactory.createForClass(ParsedData);
