import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateShipmentDto {
  @IsString() @IsNotEmpty() order: string;
  @IsString() @IsNotEmpty() trackingNumber: string;
  @IsOptional() @IsString() carrier?: string;
  @IsOptional() @IsString() estimatedDelivery?: string;
}
