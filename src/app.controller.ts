import { Controller, Get } from '@nestjs/common';
import XLSX from 'xlsx';
import path from 'path';
import uniq from 'lodash/uniq';
import uniqBy from 'lodash/uniqBy';
import md5 from 'md5';
import dayjs from 'dayjs';
import { RecordService } from './record/record.service';
import { UserService } from './user/user.service';

const {
  read,
  utils: { sheet_to_json },
} = XLSX;

@Controller()
export class AppController {
  constructor(
    private readonly userService: UserService,
    private readonly recordService: RecordService,
  ) {}

  @Get('initData')
  async initData(): Promise<any> {
    const wb: XLSX.WorkBook = read(
      path.join(__dirname, '../../initData.xlsx'),
      {
        type: 'file',
        cellDates: true,
      },
    );
    const ws: XLSX.WorkSheet = wb.Sheets[wb.SheetNames[0]];
    const titles = [
      '提交者（自动）',
      '提交时间（自动）',
      '经典',
      '柔忏瑜伽',
      '其他（已删除）',
      '吃素（已删除）',
      '口号（已删除）',
      '行善',
      '名号',
    ];
    const data = sheet_to_json(ws, { header: 1, raw: true })
      .filter((item: any) => item.length > 0)
      .slice(1);
    const parseResult = [];
    data.forEach((item: any) => {
      const record = {};
      titles.forEach((title, index) => {
        record[title] = item[index];
      });
      parseResult.push(record);
    });
    const nicknames = uniq(parseResult.map((item) => item['提交者（自动）']));
    const users = nicknames.map((item, index) => ({
      nickname: item,
      email: `${index}@budda.com`,
      password: md5('liubuqu'),
    }));
    const result = await this.userService.create(users);
    const nameMap = {};
    result.forEach((item: any) => {
      nameMap[item.nickname] = item.id;
    });
    const records = parseResult.map((item) => ({
      userId: nameMap[item['提交者（自动）']],
      baichan: item['柔忏瑜伽']
        ? Number(item['柔忏瑜伽'].replace(/[\u4e00-\u9fa5]{1,}/, ''))
        : 0,
      songjing: item['经典']
        ? Number(item['经典'].replace(/[\u4e00-\u9fa5]{1,}/, ''))
        : 0,
      xingshan: item['行善']
        ? Number(item['行善'].replace(/[\u4e00-\u9fa5]{1,}/, ''))
        : 0,
      nianfo:
        item['口号（已删除）'] || item['名号']
          ? Number(
              (item['口号（已删除）'] || item['名号']).replace(
                /[\u4e00-\u9fa5]{1,}/,
                '',
              ),
            )
          : 0,
      recordDate: dayjs(item['提交时间（自动）']).format('YYYY-MM-DD'),
      createTime: dayjs(item['提交时间（自动）']).format('YYYY-MM-DD HH:mm:ss'),
    }));
    await this.recordService.save(
      uniqBy(records, (item) => item.userId + item.recordDate),
    );
    return {
      code: 'SUCCESS',
    };
  }
}
