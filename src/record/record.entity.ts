import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { UserEntity } from '../user/user.entity';

@Entity('record')
@Index('user_date', ['userId', 'recordDate'], { unique: true })
export class RecordEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'user_id', comment: '用户ID' })
  userId: number;

  @Column({ comment: '拜忏' })
  baichan: number;

  @Column({ comment: '诵经' })
  songjing: number;

  @Column({ comment: '念佛' })
  nianfo: number;

  @Column({ comment: '行善' })
  xingshan: number;

  @Column({ name: 'record_date', comment: '打卡日期', type: 'date' })
  recordDate: string;

  @Column({ name: 'create_time', comment: '创建时间', type: 'datetime' })
  createTime: string;

  @ManyToOne(() => UserEntity, (user) => user.records)
  @JoinColumn({ name: 'user_id' })
  user: UserEntity;
}
