import { IsNotEmpty, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class PatientInfoDto {
  @IsString() @IsNotEmpty() firstName: string;
  @IsString() @IsNotEmpty() lastName: string;
  @IsOptional() @IsString() dateOfBirth?: string;
}

class InsuranceInfoDto {
  @IsOptional() @IsString() medicareId?: string;
}

export class CreateIVRDto {
  @ValidateNested() @Type(() => PatientInfoDto) patient: PatientInfoDto;
  @IsOptional() @ValidateNested() @Type(() => InsuranceInfoDto) insurance?: InsuranceInfoDto;
  @IsOptional() @IsString() comment?: string;
  @IsOptional() documents?: string[];
}
