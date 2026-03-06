import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type CmsPageDocument = CmsPage & Document;

@Schema({ timestamps: true })
export class CmsPage {
  @Prop({ required: true, unique: true, index: true })
  key: string;

  @Prop({ required: true })
  title: string;

  @Prop({ default: '' })
  content: string;

  @Prop({ default: '' })
  contactPhone: string;

  @Prop({ default: '' })
  contactEmail: string;

  @Prop({ default: '' })
  url: string;

  @Prop({ default: true })
  isActive: boolean;
}

export const CmsPageSchema = SchemaFactory.createForClass(CmsPage);
