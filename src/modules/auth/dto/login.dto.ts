import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class LoginDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;

  // HIPAA: No MinLength on login — existing users may have shorter passwords
  // Password strength is enforced at registration and change-password time
  @IsString()
  @IsNotEmpty()
  password: string;
}
