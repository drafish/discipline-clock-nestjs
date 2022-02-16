import { IsNumber, IsDateString } from 'class-validator';

export class CreateRecordDto {
  @IsNumber()
  baichan: number;

  @IsNumber()
  songjing: number;

  @IsNumber()
  nianfo: number;

  @IsNumber()
  xingshan: number;

  @IsDateString()
  recordDate: string;
}
