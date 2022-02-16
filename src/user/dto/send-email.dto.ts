import { IsEmail } from 'class-validator';

export class SendEmailDto {
  @IsEmail()
  readonly email: string;
}
