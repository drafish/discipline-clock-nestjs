import {
  Module,
  MiddlewareConsumer,
  NestModule,
  RequestMethod,
} from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
// import { AppController } from './app.controller';
import { UserModule } from './user/user.module';
import { RecordModule } from './record/record.module';
import { AuthMiddleware } from './auth.middleware';

@Module({
  imports: [TypeOrmModule.forRoot(), UserModule, RecordModule],
  // controllers: [AppController],
})
export class AppModule implements NestModule {
  public configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(AuthMiddleware)
      .forRoutes(
        { path: 'user/updatePwd', method: RequestMethod.POST },
        { path: 'record/create', method: RequestMethod.POST },
        { path: 'record/update', method: RequestMethod.POST },
        { path: 'record/delete', method: RequestMethod.DELETE },
      );
  }
}
