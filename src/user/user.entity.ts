import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  Unique,
  OneToMany,
} from 'typeorm';
import { RecordEntity } from 'src/record/record.entity';

@Entity('user')
export class UserEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ comment: '用户昵称' })
  nickname: string;

  @Unique('email_UNIQUE', ['email'])
  @Column({ comment: '邮箱', default: null })
  email: string;

  @Column({ comment: '登录密码' })
  password: string;

  @OneToMany(() => RecordEntity, (record) => record.user)
  records: RecordEntity[];

  @Unique('openId_UNIQUE', ['openId'])
  @Column({ name: 'open_id', comment: '微信openid', default: null })
  openId: string;

  @Column({ name: 'avatar_url', comment: '头像', default: null })
  avatarUrl: string;
}
