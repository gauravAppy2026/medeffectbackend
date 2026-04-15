import { IsOptional, IsString, IsBoolean, IsArray, Matches, MinLength, IsEmail } from 'class-validator';

export class UpdateUserDto {
  @IsOptional() @IsString() firstName?: string;
  @IsOptional() @IsString() lastName?: string;
  @IsOptional() @IsEmail() email?: string;
  @IsOptional()
  @IsString()
  @MinLength(12)
  @Matches(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])[A-Za-z\d@$!%*?&#]{12,}$/,
    { message: 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character (@$!%*?&#)' },
  )
  password?: string;
  @IsOptional() @IsString() phone?: string;
  @IsOptional() @IsString() licenseNumber?: string;
  @IsOptional() @IsString() gender?: string;
  @IsOptional() @IsString() address?: string;
  @IsOptional() @IsString() city?: string;
  @IsOptional() @IsString() state?: string;
  @IsOptional() @IsString() zipCode?: string;
  @IsOptional() @IsString() dob?: string;
  @IsOptional() @IsArray() assignedDoctors?: string[];
  @IsOptional() @IsBoolean() isActive?: boolean;
}
