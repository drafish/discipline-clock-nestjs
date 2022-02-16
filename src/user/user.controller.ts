import {
  Get,
  Post,
  Body,
  Controller,
  Req,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { Request } from 'express';
import md5 from 'md5';
import pick from 'lodash/pick';
import svgCaptcha from 'svg-captcha';
import { SMTPClient, Message } from 'emailjs';
import crypto from 'crypto';
import { UserService } from './user.service';
import {
  LoginUserDto,
  UpdatePwdDto,
  RegisterUserDto,
  SendEmailDto,
} from './dto';
import config from '../../config.json';

const client = new SMTPClient(config.email);

const { appid, secret } = config.weixin;

declare module 'express-session' {
  interface SessionData {
    userId?: number;
    captcha?: string;
    email?: {
      captcha: string;
      createTime: number;
    };
    wx?: {
      sessionKey?: string;
      openId?: string;
    };
  }
}

@Controller('user')
export class UserController {
  constructor(
    private readonly userService: UserService,
    private readonly httpService: HttpService,
  ) {}

  @Get('logout')
  async logout(@Req() { session }: Request): Promise<any> {
    session.userId = undefined;
    session.captcha = undefined;
    session.email = undefined;
    session.wx = undefined;
    return {
      code: 'SUCCESS',
    };
  }

  @Get('captcha')
  async captcha(@Req() { session }: Request): Promise<any> {
    const captcha = svgCaptcha.create();
    session.captcha = captcha.text;
    return {
      code: 'SUCCESS',
      detail: `data:image/svg+xml;charset=utf8,${encodeURIComponent(
        captcha.data,
      )}`,
    };
  }

  @UsePipes(new ValidationPipe())
  @Post('email')
  async email(
    @Req() { session }: Request,
    @Body() { email }: SendEmailDto,
  ): Promise<any> {
    if (
      session.email &&
      new Date().getTime() - session.email.createTime < 5 * 60 * 1000
    ) {
      return {
        code: 'SUCCESS',
      };
    }
    const captcha = Math.random().toFixed(6).slice(-6);
    session.email = { captcha, createTime: new Date().getTime() };
    try {
      await client.sendAsync(
        new Message({
          text: `欢迎使用打卡服务，验证码：${captcha}。有效时间5分钟`,
          from: `${config.email.user}@126.com`,
          to: email,
          // cc: `${config.email.user}@126.com`,
          subject: '打卡注册验证码',
        }),
      );
    } catch (err) {
      console.error(err);
      session.email = undefined;
      return {
        code: 'EMAIL_ERROR',
        msg: '邮件服务异常，请稍后再试',
      };
    }
    return {
      code: 'SUCCESS',
    };
  }

  @UsePipes(new ValidationPipe())
  @Post('login')
  async login(
    @Body() { email, password, captcha }: LoginUserDto,
    @Req() { session }: Request,
  ): Promise<any> {
    if (captcha.toLowerCase() !== session.captcha.toLowerCase()) {
      return {
        code: 'CAPTCHA_ERROR',
        msg: '图片验证码错误',
      };
    }

    const user = await this.userService.findOne({ email });

    if (!user) {
      return {
        code: 'USER_NOT_EXIST',
        msg: '用户不存在',
      };
    } else if (user.password !== md5(password)) {
      return {
        code: 'PASSWORD_ERROR',
        msg: '密码错误',
      };
    } else {
      session.userId = user.id;
      return {
        code: 'SUCCESS',
        detail: pick(user, ['nickname', 'email', 'id']),
      };
    }
  }

  @UsePipes(new ValidationPipe())
  @Post('register')
  async register(
    @Body() { email, password, captcha, nickname }: RegisterUserDto,
    @Req() { session }: Request,
  ): Promise<any> {
    if (!session.email) {
      return {
        code: 'CAPTCHA_NOT_EXIST',
        msg: '验证码不存在',
      };
    }

    if (new Date().getTime() - session.email.createTime >= 5 * 60 * 1000) {
      return {
        code: 'CAPTCHA_EXPIRE',
        msg: '验证码已过期，请重新获取',
      };
    }

    if (captcha !== session.email.captcha) {
      return {
        code: 'CAPTCHA_ERROR',
        msg: '验证码错误',
      };
    }

    if (/^(?=.*?[0-9])(?=.*?[a-z])[0-9a-z]{8,}$/.test(password) === false) {
      return {
        code: 'PASSWORD_NOT_SAFE',
        msg: '密码不符合安全要求，密码限 8~16 位，必须包含数字、英文字母和特殊字符',
      };
    }

    const user = await this.userService.findOne({ email });
    if (user) {
      return {
        code: 'USER_EXIST',
        msg: '邮箱已注册',
      };
    }

    const oldUser = await this.userService.findOne({ nickname });
    if (oldUser && oldUser.email.endsWith('budda.com')) {
      await this.userService.update(oldUser.id, {
        email,
        password: md5(password),
      });
      session.userId = oldUser.id;
      return {
        code: 'SUCCESS',
        detail: { email, nickname, id: oldUser.id },
      };
    }

    const newUser = await this.userService.create({
      email,
      nickname,
      password: md5(password),
    });
    session.userId = newUser.id;
    return {
      code: 'SUCCESS',
      detail: pick(newUser, ['nickname', 'email', 'id']),
    };
  }

  @UsePipes(new ValidationPipe())
  @Post('updatePwd')
  async resetPwd(
    @Body() { oldPassword, newPassword }: UpdatePwdDto,
    @Req() { session }: Request,
  ): Promise<any> {
    const user = await this.userService.findOneById(session.userId);

    if (/^(?=.*?[0-9])(?=.*?[a-z])[0-9a-z]{8,}$/.test(newPassword) === false) {
      return {
        code: 'PASSWORD_NOT_SAFE',
        msg: '密码不符合安全要求，密码限 8~16 位，必须包含数字、英文字母和特殊字符',
      };
    }

    if (user.password !== md5(oldPassword)) {
      return {
        code: 'PASSWORD_ERROR',
        msg: '当前密码输入不正确',
      };
    }

    await this.userService.update(session.userId, {
      password: md5(newPassword),
    });

    session.userId = undefined;

    return {
      code: 'SUCCESS',
      msg: '密码更改成功，请重新登录',
    };
  }

  @UsePipes(new ValidationPipe())
  @Post('wxLogin')
  async wxLogin(
    @Body()
    { code }: { code: string },
    @Req() { session }: Request,
  ): Promise<any> {
    const {
      data: { openid, session_key },
    } = await firstValueFrom(
      this.httpService.get(
        `https://api.weixin.qq.com/sns/jscode2session?appid=${appid}&secret=${secret}&js_code=${code}&grant_type=authorization_code`,
      ),
    );
    if (!session_key) {
      session.wx = undefined;
      return { code: 'ERROR', msg: 'wx.login调用失败' };
    }
    session.wx = { openId: openid, sessionKey: session_key };
    return { code: 'SUCCESS' };
  }

  @UsePipes(new ValidationPipe())
  @Post('wxAuthorize')
  async wxAuthorize(
    @Body()
    { encryptedData, iv }: { encryptedData: string; iv: string },
    @Req() { session }: Request,
  ): Promise<any> {
    if (!session.wx) {
      return {
        code: 'ERROR',
        msg: '请先调用wx.login',
      };
    }
    const sessionKeyBuffer = Buffer.from(session.wx.sessionKey, 'base64');
    const encryptedDataBuffer = Buffer.from(encryptedData, 'base64');
    const ivBuffer = Buffer.from(iv, 'base64');

    try {
      // 解密
      const decipher = crypto.createDecipheriv(
        'aes-128-cbc',
        sessionKeyBuffer,
        ivBuffer,
      );
      // 设置自动 padding 为 true，删除填充补位
      decipher.setAutoPadding(true);
      const decoded =
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        decipher.update(encryptedDataBuffer, 'binary', 'utf8') +
        decipher.final('utf8');
      const result = JSON.parse(decoded);
      if (result.watermark.appid !== appid) {
        throw new Error('Illegal Buffer');
      }
      const { nickName, avatarUrl } = result;
      const user = await this.userService.findOne({ nickname: nickName });
      if (user) {
        if (!user.openId) {
          await this.userService.update(user.id, {
            avatarUrl,
            openId: session.wx.openId,
          });
        }
        session.userId = user.id;
        return {
          code: 'SUCCESS',
          detail: { ...pick(user, ['email', 'nickname', 'id']), avatarUrl },
        };
      } else {
        const newUser = await this.userService.create({
          nickname: nickName,
          avatarUrl,
          openId: session.wx.openId,
        });
        session.userId = newUser.id;
        return {
          code: 'SUCCESS',
          detail: pick(newUser, ['nickname', 'email', 'id', 'avatarUrl']),
        };
      }
    } catch (err) {
      throw new Error('Illegal Buffer');
    }
  }
}
