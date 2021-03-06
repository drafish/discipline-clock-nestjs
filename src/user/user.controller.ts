import {
  Get,
  Post,
  Body,
  Controller,
  Req,
  UsePipes,
  ValidationPipe,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
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
  WxLoginDto,
  WxAuthorizeDto,
} from './dto';

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
    private readonly configService: ConfigService,
    private readonly logger: Logger,
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
    const emailConfig = {
      user: this.configService.get('email.user'),
      password: this.configService.get('email.password'),
      host: this.configService.get('email.host'),
      ssl: true,
    };
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
      const client = new SMTPClient(emailConfig);

      await client.sendAsync(
        new Message({
          text: `???????????????????????????????????????${captcha}???????????????5??????`,
          from: `${emailConfig.user}@126.com`,
          to: email,
          // cc: `${emailConfig.user}@126.com`,
          subject: '?????????????????????',
        }),
      );
    } catch (err) {
      console.error(err);
      session.email = undefined;
      return {
        code: 'EMAIL_ERROR',
        msg: '????????????????????????????????????',
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
        msg: '?????????????????????',
      };
    }

    const user = await this.userService.findOne({ email });

    if (!user) {
      return {
        code: 'USER_NOT_EXIST',
        msg: '???????????????',
      };
    } else if (user.password !== md5(password)) {
      return {
        code: 'PASSWORD_ERROR',
        msg: '????????????',
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
        msg: '??????????????????',
      };
    }

    if (new Date().getTime() - session.email.createTime >= 5 * 60 * 1000) {
      return {
        code: 'CAPTCHA_EXPIRE',
        msg: '????????????????????????????????????',
      };
    }

    if (captcha !== session.email.captcha) {
      return {
        code: 'CAPTCHA_ERROR',
        msg: '???????????????',
      };
    }

    if (/^(?=.*?[0-9])(?=.*?[a-z])[0-9a-z]{8,}$/.test(password) === false) {
      return {
        code: 'PASSWORD_NOT_SAFE',
        msg: '??????????????????????????????????????? 8~16 ??????????????????????????????????????????????????????',
      };
    }

    const user = await this.userService.findOne({ email });
    if (user) {
      return {
        code: 'USER_EXIST',
        msg: '???????????????',
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
        msg: '??????????????????????????????????????? 8~16 ??????????????????????????????????????????????????????',
      };
    }

    if (user.password !== md5(oldPassword)) {
      return {
        code: 'PASSWORD_ERROR',
        msg: '???????????????????????????',
      };
    }

    await this.userService.update(session.userId, {
      password: md5(newPassword),
    });

    session.userId = undefined;

    return {
      code: 'SUCCESS',
      msg: '????????????????????????????????????',
    };
  }

  @UsePipes(new ValidationPipe())
  @Post('wxLogin')
  async wxLogin(
    @Body() { code }: WxLoginDto,
    @Req() { session }: Request,
  ): Promise<any> {
    const appid = this.configService.get('weixin.appid');
    const secret = this.configService.get('weixin.secret');
    try {
      const { data } = await firstValueFrom(
        this.httpService.get(
          `https://api.weixin.qq.com/sns/jscode2session?appid=${appid}&secret=${secret}&js_code=${code}&grant_type=authorization_code`,
        ),
      );
      const { openid, session_key } = data;
      if (!session_key) {
        this.logger.error(JSON.stringify(data));
        session.wx = undefined;
        return { code: 'ERROR', msg: 'wx.login fail' };
      }
      session.wx = { openId: openid, sessionKey: session_key };
      return { code: 'SUCCESS' };
    } catch (error) {
      this.logger.error(JSON.stringify(error));
      return { code: 'ERROR', msg: 'wx.login fail' };
    }
  }

  @UsePipes(new ValidationPipe())
  @Post('wxAuthorize')
  async wxAuthorize(
    @Body() { encryptedData, iv }: WxAuthorizeDto,
    @Req() { session }: Request,
  ): Promise<any> {
    const appid = this.configService.get('weixin.appid');
    if (!session.wx) {
      return {
        code: 'ERROR',
        msg: 'wx.login first',
      };
    }
    const sessionKeyBuffer = Buffer.from(session.wx.sessionKey, 'base64');
    const encryptedDataBuffer = Buffer.from(encryptedData, 'base64');
    const ivBuffer = Buffer.from(iv, 'base64');

    try {
      // ??????
      const decipher = crypto.createDecipheriv(
        'aes-128-cbc',
        sessionKeyBuffer,
        ivBuffer,
      );
      // ???????????? padding ??? true?????????????????????
      decipher.setAutoPadding(true);
      const decoded =
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        decipher.update(encryptedDataBuffer, 'binary', 'utf8') +
        decipher.final('utf8');
      const result = JSON.parse(decoded);
      if (result.watermark.appid !== appid) {
        this.logger.error(
          JSON.stringify(`appid error: ${result.watermark.appid}`),
        );
        return { code: 'ERROR', msg: 'appid error' };
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
    } catch (error) {
      this.logger.error(JSON.stringify(error));
      return { code: 'ERROR', msg: 'parse error' };
    }
  }
}
