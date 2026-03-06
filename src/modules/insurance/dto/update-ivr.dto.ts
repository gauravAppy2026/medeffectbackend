import { IsOptional, IsString, IsIn } from 'class-validator';

export class UpdateIVRDto {
  @IsIn(['approved', 'rejected']) status: string;
  @IsOptional() @IsString() approvalDocument?: string;
  @IsOptional() @IsString() note?: string;
}
