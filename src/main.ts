import { NestFactory } from '@nestjs/core';
import session from 'express-session';
import fileStoreFunction from 'session-file-store';
import { AppModule } from './app.module';
import config from '../config.json';

const FileStore = fileStoreFunction(session);

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.use(
    session({
      name: config.session.name,
      secret: config.session.secret,
      store: new FileStore(),
      resave: false,
      saveUninitialized: false,
      cookie: {
        maxAge: 30 * 24 * 3600 * 1000,
      },
    }),
  );
  await app.listen(process.env.PORT || 3000);
}
bootstrap();
