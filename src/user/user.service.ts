import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserEntity } from './user.entity';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
  ) {}

  async findOne(conditions: { [key: string]: any }): Promise<UserEntity> {
    return await this.userRepository.findOne(conditions);
  }

  async findOneById(id: number): Promise<UserEntity> {
    return await this.userRepository.findOne({ id });
  }

  async findById(id: number): Promise<any> {
    const user = await this.userRepository.findOne(id, {
      select: ['id', 'nickname'],
    });
    return {
      nickname: user.nickname,
      id: user.id,
    };
  }

  async update(id: number, user: { [key: string]: any }): Promise<any> {
    await this.userRepository.save({ id, ...user });
  }

  async create(user: any): Promise<any> {
    return await this.userRepository.save(user);
  }
}
