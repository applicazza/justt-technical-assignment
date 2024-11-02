import { NestFactory } from '@nestjs/core';
import { ApiModule } from './api.module';
import { ConfigService } from '@nestjs/config';
import { Logger } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(ApiModule);

  const config = app.get(ConfigService);

  const host = config.get<string>('HOST');
  const port = config.get<number>('PORT');

  await app.listen(port, host);

  const url = await app.getUrl();

  Logger.log(`🚀 Listening on ${url}`);
}
bootstrap();
