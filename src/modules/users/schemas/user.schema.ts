import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type UserDocument = User & Document;

@Schema({ timestamps: true })
export class User {
  @Prop({ required: true })
  firstName: string;

  @Prop({ required: true })
  lastName: string;

  @Prop({ required: true, unique: true, lowercase: true, index: true })
  email: string;

  @Prop({ required: true })
  password: string;

  @Prop()
  phone: string;

  @Prop({ type: String, enum: ['patient', 'admin', 'sales_rep'], default: 'patient' })
  role: string;

  @Prop({ type: Object })
  address: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
  };

  @Prop()
  dateOfBirth: Date;

  @Prop({ type: String, enum: ['male', 'female', 'other'] })
  gender: string;

  @Prop()
  licenseNumber: string;

  @Prop()
  licenseExpiry: Date;

  @Prop({ type: [{ type: Types.ObjectId, ref: 'Doctor' }] })
  assignedDoctors: Types.ObjectId[];

  @Prop({ default: false })
  biometricEnabled: boolean;

  @Prop({ default: true })
  isActive: boolean;

  @Prop()
  refreshToken: string;

  @Prop()
  lastActivity: Date;

  // HIPAA: Account lockout after failed login attempts
  @Prop({ default: 0 })
  failedLoginAttempts: number;

  @Prop({ type: Date, default: null })
  lockedUntil: Date;
}

export const UserSchema = SchemaFactory.createForClass(User);
