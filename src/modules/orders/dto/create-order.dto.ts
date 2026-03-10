import { IsNotEmpty, IsOptional, IsString, IsNumber, Min, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class AddressDto {
  @IsOptional() @IsString() street?: string;
  @IsOptional() @IsString() city?: string;
  @IsOptional() @IsString() state?: string;
  @IsOptional() @IsString() zipCode?: string;
}

class LineItemDto {
  @IsString() @IsNotEmpty() product: string;
  @IsNumber() @Min(1) @Type(() => Number) quantity: number;
}

export class CreateOrderDto {
  @IsString() @IsNotEmpty() doctor: string;

  // Single product (backward compat)
  @IsOptional() @IsString() product?: string;
  @IsOptional() @IsNumber() @Min(1) @Type(() => Number) quantity?: number;

  // Multi-product
  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => LineItemDto) lineItems?: LineItemDto[];

  @IsOptional() @IsString() patientName?: string;
  @IsOptional() @ValidateNested() @Type(() => AddressDto) address?: AddressDto;
  @IsOptional() @IsString() deliveryDate?: string;
  @IsOptional() @IsString() comment?: string;
  @IsOptional() @IsString() priority?: string;
}
