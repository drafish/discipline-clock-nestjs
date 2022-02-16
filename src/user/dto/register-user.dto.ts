import { IsString, IsEmail } from 'class-validator';

export class RegisterUserDto {
  @IsEmail()
  readonly email: string;

  @IsString()
  readonly nickname: string;

  @IsString()
  readonly password: string;

  @IsString()
  readonly captcha: string;
}
