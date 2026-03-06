import { IsNotEmpty, IsOptional, IsString, IsNumber, Min, IsObject, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class AddressDto {
  @IsOptional() @IsString() street?: string;
  @IsOptional() @IsString() city?: string;
  @IsOptional() @IsString() state?: string;
  @IsOptional() @IsString() zipCode?: string;
}

export class CreateOrderDto {
  @IsString() @IsNotEmpty() doctor: string;
  @IsString() @IsNotEmpty() product: string;
  @IsNumber() @Min(1) @Type(() => Number) quantity: number;
  @IsOptional() @IsString() patientName?: string;
  @IsOptional() @ValidateNested() @Type(() => AddressDto) address?: AddressDto;
  @IsOptional() @IsString() deliveryDate?: string;
  @IsOptional() @IsString() comment?: string;
  @IsOptional() @IsString() priority?: string;
}
