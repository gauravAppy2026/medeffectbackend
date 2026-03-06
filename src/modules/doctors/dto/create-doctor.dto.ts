import { IsNotEmpty, IsOptional, IsString, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class AddressDto {
  @IsOptional() @IsString() street?: string;
  @IsOptional() @IsString() city?: string;
  @IsOptional() @IsString() state?: string;
  @IsOptional() @IsString() zipCode?: string;
}

export class CreateDoctorDto {
  @IsString() @IsNotEmpty() firstName: string;
  @IsString() @IsNotEmpty() lastName: string;
  @IsString() @IsNotEmpty() department: string;
  @IsOptional() @IsString() gender?: string;
  @IsOptional() @IsString() email?: string;
  @IsOptional() @IsString() phone?: string;
  @IsOptional() @IsString() licenseNumber?: string;
  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => AddressDto) addresses?: AddressDto[];
  @IsOptional() @IsString() assignedSalesRep?: string;
}
