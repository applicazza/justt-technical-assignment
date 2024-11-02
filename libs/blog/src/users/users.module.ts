import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { HttpModule } from '@nestjs/axios';
import { CacheModule } from '@nestjs/cache-manager';
import { ConfigModule, ConfigService } from '@nestjs/config';

@Module({
  imports: [
    CacheModule.register(),
    HttpModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        baseURL: `${configService.get('JSON_PLACEHOLDER_BASE_URL')}/users`,
      }),
      inject: [ConfigService],
    }),
  ],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
