import { BlogModule } from '@app/blog';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import * as joi from 'joi';

@Module({
  imports: [
    ConfigModule.forRoot({
      validationSchema: joi.object({
        NODE_ENV: joi
          .string()
          .valid('development', 'production', 'test', 'provision')
          .default('development'),
        HOST: joi
          .string()
          .ip({ version: ['ipv4'] })
          .default('127.0.0.1'),
        PORT: joi.number().default(3000),
      }),
    }),
    BlogModule,
  ],
})
export class ApiModule {}
