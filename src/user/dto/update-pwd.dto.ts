import { IsString } from 'class-validator';

export class UpdatePwdDto {
  @IsString()
  readonly oldPassword: string;

  @IsString()
  readonly newPassword: string;
}
