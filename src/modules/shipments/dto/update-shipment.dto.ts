import { IsOptional, IsString, IsIn } from 'class-validator';

export class UpdateShipmentDto {
  @IsOptional() @IsIn(['pending', 'in_transit', 'delivered', 'completed']) status?: string;
  @IsOptional() @IsString() trackingNumber?: string;
  @IsOptional() @IsString() carrier?: string;
  @IsOptional() @IsString() note?: string;
}
