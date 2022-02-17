import { IsString } from 'class-validator';

export class WxAuthorizeDto {
  @IsString()
  readonly encryptedData: string;

  @IsString()
  readonly iv: string;
}
