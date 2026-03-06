import { IsEmail, IsNotEmpty, IsOptional, IsString, MinLength, IsIn, Matches } from 'class-validator';

export class RegisterDto {
  @IsString()
  @IsNotEmpty()
  firstName: string;

  @IsString()
  @IsNotEmpty()
  lastName: string;

  @IsEmail()
  @IsNotEmpty()
  email: string;

  // HIPAA: Strong password policy - 12+ chars with uppercase, lowercase, number, special char
  @IsString()
  @IsNotEmpty()
  @MinLength(12)
  @Matches(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])[A-Za-z\d@$!%*?&#]{12,}$/,
    { message: 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character (@$!%*?&#)' },
  )
  password: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsIn(['patient', 'sales_rep'])
  role?: string;
}
