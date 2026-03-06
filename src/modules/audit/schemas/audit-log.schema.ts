import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type AuditLogDocument = AuditLog & Document;

@Schema({ timestamps: true })
export class AuditLog {
  @Prop({ required: true, index: true })
  action: string; // LOGIN, LOGIN_FAILED, LOGOUT, CREATE, READ, UPDATE, DELETE, EXPORT, PASSWORD_CHANGE

  @Prop({ required: true, index: true })
  resource: string; // orders, doctors, users, ivr, products, shipments, reports, auth, cms

  @Prop({ type: Types.ObjectId, ref: 'User', index: true })
  userId: Types.ObjectId;

  @Prop()
  userEmail: string;

  @Prop()
  userRole: string;

  @Prop()
  resourceId: string; // ID of the affected record

  @Prop()
  description: string; // Human-readable summary

  @Prop()
  method: string; // GET, POST, PUT, DELETE

  @Prop()
  endpoint: string; // /api/orders, /api/auth/login, etc.

  @Prop()
  ipAddress: string;

  @Prop()
  userAgent: string;

  @Prop({ type: Number })
  statusCode: number;

  @Prop({ type: Object })
  metadata: Record<string, any>; // Extra context (e.g., changed fields)
}

export const AuditLogSchema = SchemaFactory.createForClass(AuditLog);

// Index for fast queries by date
AuditLogSchema.index({ createdAt: -1 });
AuditLogSchema.index({ action: 1, createdAt: -1 });
AuditLogSchema.index({ userId: 1, createdAt: -1 });

// HIPAA: Auto-delete audit logs after 6 years (189,216,000 seconds)
AuditLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 189216000 });
