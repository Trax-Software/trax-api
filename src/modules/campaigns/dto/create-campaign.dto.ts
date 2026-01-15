import { IsEnum, IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { CampaignObjective } from '@prisma/client';

export class CreateCampaignDto {
  @ApiProperty({ example: 'Black Friday 2026' })
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  name!: string;

  @ApiProperty({ enum: CampaignObjective, example: 'SALES' })
  @IsEnum(CampaignObjective)
  objective!: CampaignObjective;

  @ApiProperty({ example: 'Foco em conversão de leads frios', required: false })
  @IsOptional()
  @IsString()
  description?: string;
}