import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import session from 'express-session';
import fileStoreFunction from 'session-file-store';
import { AppModule } from './app.module';

const FileStore = fileStoreFunction(session);

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);
  app.use(
    session({
      name: configService.get('session.name'),
      secret: configService.get('session.secret'),
      store: new FileStore(),
      resave: false,
      saveUninitialized: false,
      cookie: {
        maxAge: 30 * 24 * 3600 * 1000,
      },
    }),
  );
  await app.listen(configService.get('PORT') || 3000);
}
bootstrap();
