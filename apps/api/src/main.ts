import { NestFactory } from '@nestjs/core';
import { ApiModule } from './api.module';
import { ConfigService } from '@nestjs/config';
import { Logger, ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(ApiModule);
  app.useGlobalPipes(new ValidationPipe({ transform: true }));

  const openApiConfig = new DocumentBuilder()
    .setTitle('Blog API')
    .setDescription('Blog API')
    .setVersion('1.0')
    .addTag('blog')
    .build();
  const documentFactory = () =>
    SwaggerModule.createDocument(app, openApiConfig);
  SwaggerModule.setup('api', app, documentFactory);

  const config = app.get(ConfigService);

  const host = config.get<string>('HOST');
  const port = config.get<number>('PORT');

  await app.listen(port, host);

  const url = await app.getUrl();

  Logger.log(`🚀 Listening on ${url}`);
}
bootstrap();
