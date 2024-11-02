import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsString, Min } from 'class-validator';

export class CreatePostDto {
  @ApiProperty()
  @Type(() => Number)
  @Min(1)
  @IsInt()
  userId: number;

  @ApiProperty()
  @Type(() => String)
  @IsString()
  title: string;

  @ApiProperty()
  @Type(() => String)
  @IsString()
  body: string;
}
