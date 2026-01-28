import { IsEnum, IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { CampaignObjective, AdPlatform } from '@prisma/client';

export class CreateCampaignDto {
  @ApiProperty({ example: 'Black Friday 2026' })
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  name!: string;

  @ApiProperty({ enum: CampaignObjective, example: 'SALES' })
  @IsEnum(CampaignObjective)
  objective!: CampaignObjective;

  @ApiProperty({ enum: AdPlatform, example: 'META', required: false })
  @IsOptional()
  @IsEnum(AdPlatform)
  platform?: AdPlatform; // Agora suportamos META, GOOGLE, LINKEDIN

  // --- Novos Campos de Estratégia ---

  @ApiProperty({ 
    example: 'Mulheres de 25-40 anos, interessadas em fitness e vida saudável',
    description: 'Descrição detalhada do público-alvo para guiar a IA'
  })
  @IsOptional() // Opcional porque pode começar como Rascunho (DRAFT)
  @IsString()
  targetAudience?: string;

  @ApiProperty({ 
    example: 'Tecnologia de amortecimento, design leve, cores vibrantes',
    description: 'Pontos chave que a IA deve ressaltar no texto'
  })
  @IsOptional()
  @IsString()
  keyBenefits?: string;

  @ApiProperty({ 
    example: 'Energético, Motivador e Moderno',
    description: 'Tom de voz específico para esta campanha'
  })
  @IsOptional()
  @IsString()
  brandTone?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  description?: string;
}