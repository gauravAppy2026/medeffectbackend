import { IsOptional, IsString, IsIn } from 'class-validator';

export class UpdateIVRDto {
  @IsIn(['rejected', 'covered', 'not_covered']) status: string;
  @IsOptional() @IsString() approvalDocument?: string;
  @IsOptional() @IsString() note?: string;
}
