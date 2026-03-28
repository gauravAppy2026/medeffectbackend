import { IsOptional, IsString, IsIn, IsArray } from 'class-validator';

export class UpdateOrderDto {
  @IsOptional()
  @IsIn(['submitted', 'approved', 'shipped', 'completed', 'cancelled'])
  status?: string;

  @IsOptional() @IsString() rejectionReason?: string;
  @IsOptional() @IsString() note?: string;
  @IsOptional() @IsString() trackingNumber?: string;
  @IsOptional() @IsArray() shippedItems?: Array<{ product: string; shippedQuantity: number }>;
  @IsOptional() @IsArray() lineItems?: Array<{ product: string; quantity: number }>;
}

export class AssignOrderDto {
  @IsString() salesRepId: string;
}

export class UpdateTrackingDto {
  @IsString() trackingNumber: string;
  @IsOptional() @IsString() carrier?: string;
  @IsOptional() @IsString() estimatedDelivery?: string;
}
