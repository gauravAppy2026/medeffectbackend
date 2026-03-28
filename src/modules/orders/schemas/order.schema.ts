import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type OrderDocument = Order & Document;

@Schema({ timestamps: true })
export class Order {
  @Prop({ unique: true, index: true })
  orderId: string;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  patient: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Doctor', required: true })
  doctor: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Product' })
  product: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  salesRep: Types.ObjectId;

  @Prop({ min: 1 })
  quantity: number;

  @Prop({
    type: [{ product: { type: Types.ObjectId, ref: 'Product' }, quantity: { type: Number, min: 1 }, shippedQuantity: { type: Number, min: 0 } }],
    default: [],
  })
  lineItems: Array<{ product: Types.ObjectId; quantity: number; shippedQuantity?: number }>;

  @Prop({ type: Object })
  address: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
  };

  @Prop()
  deliveryDate: Date;

  @Prop()
  comment: string;

  @Prop({
    type: String,
    enum: ['submitted', 'approved', 'shipped', 'completed', 'cancelled'],
    default: 'submitted',
  })
  status: string;

  @Prop({ type: String, enum: ['normal', 'urgent', 'critical'], default: 'normal' })
  priority: string;

  @Prop()
  trackingNumber: string;

  @Prop()
  rejectionReason: string;

  @Prop({
    type: [
      {
        status: String,
        changedBy: { type: Types.ObjectId, ref: 'User' },
        changedAt: Date,
        note: String,
      },
    ],
    default: [],
  })
  statusHistory: Array<{
    status: string;
    changedBy: Types.ObjectId;
    changedAt: Date;
    note: string;
  }>;

  @Prop()
  patientName: string;
}

export const OrderSchema = SchemaFactory.createForClass(Order);
