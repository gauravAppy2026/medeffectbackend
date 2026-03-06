import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type ShipmentDocument = Shipment & Document;

@Schema({ timestamps: true })
export class Shipment {
  @Prop({ type: Types.ObjectId, ref: 'Order', required: true })
  order: Types.ObjectId;

  @Prop({ required: true })
  trackingNumber: string;

  @Prop()
  carrier: string;

  @Prop({
    type: String,
    enum: ['pending', 'in_transit', 'delivered', 'completed'],
    default: 'pending',
  })
  status: string;

  @Prop()
  estimatedDelivery: Date;

  @Prop({
    type: [
      {
        status: String,
        updatedAt: Date,
        note: String,
      },
    ],
    default: [],
  })
  statusHistory: Array<{
    status: string;
    updatedAt: Date;
    note: string;
  }>;
}

export const ShipmentSchema = SchemaFactory.createForClass(Shipment);
