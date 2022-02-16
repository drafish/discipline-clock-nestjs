import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RecordEntity } from './record.entity';

@Injectable()
export class RecordService {
  constructor(
    @InjectRepository(RecordEntity)
    private readonly recordRepository: Repository<RecordEntity>,
  ) {}

  async save(record: any): Promise<any> {
    return await this.recordRepository.save(record);
  }

  async find(pageNum: number, pageSize: number): Promise<any> {
    return await this.recordRepository
      .createQueryBuilder('record')
      .leftJoin('record.user', 'user')
      .select([
        'record.id',
        'record.recordDate',
        'record.createTime',
        'record.userId',
        'user.nickname',
      ])
      .skip(pageSize * (pageNum - 1))
      .take(pageSize)
      .orderBy('record.createTime', 'DESC')
      .getManyAndCount();
  }

  async findById(id: number): Promise<any> {
    return await this.recordRepository.findOne(id);
  }

  async findOne(conditions: { [key: string]: any }): Promise<any> {
    return await this.recordRepository.findOne(conditions);
  }

  async delete(id: number): Promise<any> {
    return await this.recordRepository.delete(id);
  }
}
