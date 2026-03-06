import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type DoctorDocument = Doctor & Document;

@Schema({ timestamps: true })
export class Doctor {
  @Prop({ required: true })
  firstName: string;

  @Prop({ required: true })
  lastName: string;

  @Prop({ required: true })
  department: string;

  @Prop({ type: String, enum: ['male', 'female', 'other'] })
  gender: string;

  @Prop()
  email: string;

  @Prop()
  phone: string;

  @Prop()
  licenseNumber: string;

  @Prop({
    type: [
      {
        street: String,
        city: String,
        state: String,
        zipCode: String,
      },
    ],
    default: [],
  })
  addresses: Array<{
    street: string;
    city: string;
    state: string;
    zipCode: string;
  }>;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  assignedSalesRep: Types.ObjectId;

  @Prop({ default: true })
  isActive: boolean;
}

export const DoctorSchema = SchemaFactory.createForClass(Doctor);
