import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type IVRRequestDocument = IVRRequest & Document;

@Schema({ timestamps: true })
export class IVRRequest {
  @Prop({ unique: true, index: true })
  requestId: string;

  @Prop({
    type: {
      firstName: String,
      lastName: String,
      dateOfBirth: Date,
      gender: { type: String, enum: ['male', 'female', 'other'] },
      phone: String,
      address: String,
    },
    required: true,
  })
  patient: {
    firstName: string;
    lastName: string;
    dateOfBirth: Date;
    gender: string;
    phone: string;
    address: string;
  };

  @Prop({
    type: {
      medicareId: String,
    },
  })
  insurance: {
    medicareId: string;
  };

  @Prop()
  comment: string;

  @Prop({ type: [String], default: [] })
  documents: string[];

  @Prop()
  approvalDocument: string;

  @Prop()
  adminNote: string;

  @Prop({ type: String, enum: ['submitted', 'rejected', 'covered', 'not_covered'], default: 'submitted' })
  status: string;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  reviewedBy: Types.ObjectId;

  @Prop()
  reviewedAt: Date;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  submittedBy: Types.ObjectId;
}

export const IVRRequestSchema = SchemaFactory.createForClass(IVRRequest);
