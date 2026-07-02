import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type ParsedDataDocument = ParsedData & Document;

@Schema({
  timestamps: true,
  toJSON: { getters: true, virtuals: true },
  toObject: { getters: true, virtuals: true },
})
export class ParsedData {
  @Prop({ required: true })
  fileName!: string;

  @Prop({ required: true })
  fileType!: string;

  @Prop({ type: Object, required: true })
  content!: Record<string, any>[];

  @Prop({ default: 'processed' })
  status!: string;
}

export const ParsedDataSchema = SchemaFactory.createForClass(ParsedData);
ParsedDataSchema.index({
  'content.title': 'text',
  'content.description': 'text',
});
