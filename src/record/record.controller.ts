import {
  Controller,
  Get,
  Delete,
  Query,
  Body,
  Req,
  Post,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { Request } from 'express';
import dayjs from 'dayjs';
import { RecordService } from './record.service';
import { CreateRecordDto, UpdateRecordDto } from './dto';

@Controller('record')
export class RecordController {
  constructor(private readonly recordService: RecordService) {}

  @Get('detail')
  async detail(@Query() { id }: { id: number }): Promise<any> {
    const result = await this.recordService.findById(id);
    result.createTime = dayjs(result.createTime).format('YYYY-MM-DD HH:mm:ss');
    return { code: 'SUCCESS', detail: result };
  }

  @Get('list')
  async list(
    @Query() { pageNum, pageSize }: { pageNum: number; pageSize: number },
  ): Promise<any> {
    const result = await this.recordService.find(pageNum, pageSize);
    return {
      code: 'SUCCESS',
      detail: {
        pageNum: Number(pageNum),
        pageSize: Number(pageSize),
        totalCount: result[1],
        list: result[0].map((item) => {
          item.createTime = dayjs(item.createTime).format(
            'YYYY-MM-DD HH:mm:ss',
          );
          return item;
        }),
      },
    };
  }

  @UsePipes(new ValidationPipe())
  @Post('create')
  async create(
    @Body() body: CreateRecordDto,
    @Req() { session: { userId } }: Request,
  ): Promise<any> {
    const record = await this.recordService.findOne({
      userId,
      recordDate: body.recordDate,
    });
    if (record) {
      return { code: 'RECORD_EXIST', msg: '打卡记录已存在', record };
    }
    const result = await this.recordService.save({
      ...body,
      userId,
      createTime: dayjs().format('YYYY-MM-DD HH:mm:ss'),
    });
    return { code: 'SUCCESS', detail: result };
  }

  @UsePipes(new ValidationPipe())
  @Post('update')
  async update(
    @Body() body: UpdateRecordDto,
    @Req() { session: { userId } }: Request,
  ): Promise<any> {
    const record = await this.recordService.findById(body.id);
    if (!record) {
      return { code: 'RECORD_NOT_EXIST', msg: '打卡记录不存在' };
    }
    if (record.userId !== userId) {
      return { code: 'NO_PERMISSION', msg: '无权限' };
    }
    const result = await this.recordService.save({
      ...body,
    });
    return { code: 'SUCCESS', detail: result };
  }

  @Delete('delete')
  async delete(
    @Query() { id }: { id: number },
    @Req() { session: { userId } }: Request,
  ): Promise<any> {
    const record = await this.recordService.findById(id);
    if (!record) {
      return { code: 'RECORD_NOT_EXIST', msg: '打卡记录不存在' };
    }
    if (record.userId !== userId) {
      return { code: 'NO_PERMISSION', msg: '无权限' };
    }
    const result = await this.recordService.delete(id);
    return { code: 'SUCCESS', detail: result };
  }
}
