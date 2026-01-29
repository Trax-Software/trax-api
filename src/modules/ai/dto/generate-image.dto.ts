import { IsNotEmpty, IsString, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class GenerateImageDto {
  @ApiProperty({ example: 'Cinematic shot of a shoe...' })
  @IsString()
  @IsNotEmpty()
  prompt!: string;

  @ApiProperty({ example: '4810d7ed-cc70-4167-bded-26213f126ae3' })
  @IsUUID() // 🛡️ Validação estrita de UUID
  @IsNotEmpty()
  campaignId!: string;
}