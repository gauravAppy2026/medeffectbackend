import { IsOptional, IsString, IsIn, IsArray } from 'class-validator';

export class UpdateOrderDto {
  @IsOptional()
  @IsIn(['submitted', 'approved', 'shipped', 'in_transit', 'completed', 'rejected', 'cancelled'])
  status?: string;

  @IsOptional() @IsString() rejectionReason?: string;
  @IsOptional() @IsString() note?: string;
  @IsOptional() @IsString() trackingNumber?: string;
  @IsOptional() @IsArray() shippedItems?: Array<{ product: string; shippedQuantity: number }>;
}

export class AssignOrderDto {
  @IsString() salesRepId: string;
}

export class UpdateTrackingDto {
  @IsString() trackingNumber: string;
  @IsOptional() @IsString() carrier?: string;
  @IsOptional() @IsString() estimatedDelivery?: string;
}
