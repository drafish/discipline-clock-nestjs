import { NestMiddleware, Injectable } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { UserService } from './user/user.service';

@Injectable()
export class AuthMiddleware implements NestMiddleware {
  constructor(private readonly userService: UserService) {}

  async use(
    { session: { userId } }: Request,
    res: Response,
    next: NextFunction,
  ) {
    if (!userId) {
      res.json({ code: 'NOT_LOGIN' });
      return;
    }

    next();
  }
}
