import { IsOptional, IsString, IsBoolean } from 'class-validator';

export class UpdateCmsDto {
  @IsOptional() @IsString() title?: string;
  @IsOptional() @IsString() content?: string;
  @IsOptional() @IsString() contactPhone?: string;
  @IsOptional() @IsString() contactEmail?: string;
  @IsOptional() @IsString() url?: string;
  @IsOptional() @IsBoolean() isActive?: boolean;
}
