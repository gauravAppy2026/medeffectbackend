import { IsNotEmpty, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class PatientInfoDto {
  @IsString() @IsNotEmpty() firstName: string;
  @IsString() @IsNotEmpty() lastName: string;
  @IsOptional() @IsString() dateOfBirth?: string;
  @IsOptional() @IsString() gender?: string;
  @IsOptional() @IsString() phone?: string;
  @IsOptional() @IsString() address?: string;
}

class InsuranceInfoDto {
  @IsOptional() @IsString() insuranceName?: string;
  @IsOptional() @IsString() policyNumber?: string;
  @IsOptional() @IsString() medicareId?: string;
  @IsOptional() @IsString() subscriberName?: string;
}

export class CreateIVRDto {
  @ValidateNested() @Type(() => PatientInfoDto) patient: PatientInfoDto;
  @IsOptional() @ValidateNested() @Type(() => InsuranceInfoDto) insurance?: InsuranceInfoDto;
  @IsOptional() @IsString() comment?: string;
  @IsOptional() documents?: string[];
}
