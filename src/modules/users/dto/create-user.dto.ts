import { IsEmail, IsNotEmpty, IsOptional, IsString, MinLength, IsIn, IsArray, Matches } from 'class-validator';

export class CreateUserDto {
  @IsString() @IsNotEmpty() firstName: string;
  @IsString() @IsNotEmpty() lastName: string;
  @IsEmail() @IsNotEmpty() email: string;
  @IsString()
  @IsNotEmpty()
  @MinLength(12)
  @Matches(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])[A-Za-z\d@$!%*?&#]{12,}$/,
    { message: 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character (@$!%*?&#)' },
  )
  password: string;
  @IsOptional() @IsString() phone?: string;
  @IsIn(['admin', 'sales_rep', 'patient']) role: string;
  @IsOptional() @IsString() licenseNumber?: string;
  @IsOptional() @IsString() gender?: string;
  @IsOptional() @IsString() address?: string;
  @IsOptional() @IsString() city?: string;
  @IsOptional() @IsString() state?: string;
  @IsOptional() @IsString() zipCode?: string;
  @IsOptional() @IsString() dob?: string;
  @IsOptional() @IsArray() assignedDoctors?: string[];
}
