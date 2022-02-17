import { IsString } from 'class-validator';

export class WxLoginDto {
  @IsString()
  readonly code: string;
}
