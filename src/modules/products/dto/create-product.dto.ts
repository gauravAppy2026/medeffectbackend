import { IsNotEmpty, IsOptional, IsString, IsNumber, Min, IsIn } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateProductDto {
  @IsString() @IsNotEmpty() name: string;
  @IsString() @IsNotEmpty() sku: string;
  @IsString() @IsNotEmpty() category: string;
  @IsNumber() @Min(0) @Type(() => Number) price: number;
  @IsNumber() @Min(0) @Type(() => Number) stock: number;
  @IsOptional() @IsIn(['doctors', 'patients', 'both']) availableFor?: string;
  @IsOptional() @IsString() description?: string;
}
