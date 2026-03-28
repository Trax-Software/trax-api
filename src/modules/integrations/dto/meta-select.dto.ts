import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class MetaSelectDto {
  @ApiProperty({ example: 'act_1234567890' })
  @IsString()
  @IsNotEmpty()
  adAccountId!: string;

  @ApiProperty({ example: '123456789012345' })
  @IsString()
  @IsNotEmpty()
  pageId!: string;
}
