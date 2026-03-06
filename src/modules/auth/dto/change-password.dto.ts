import { IsNotEmpty, IsString, MinLength, Matches } from 'class-validator';

export class ChangePasswordDto {
  @IsString()
  @IsNotEmpty()
  currentPassword: string;

  // HIPAA: Strong password policy - 12+ chars with uppercase, lowercase, number, special char
  @IsString()
  @IsNotEmpty()
  @MinLength(12)
  @Matches(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])[A-Za-z\d@$!%*?&#]{12,}$/,
    { message: 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character (@$!%*?&#)' },
  )
  newPassword: string;
}
