import { IsNumber, IsDateString } from 'class-validator';

export class UpdateRecordDto {
  @IsNumber()
  id: number;

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
