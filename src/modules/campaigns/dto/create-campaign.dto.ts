import { IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString, IsUrl, MinLength } from 'class-validator';
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
  platform?: AdPlatform;

  // --- Estratégia / Público ---

  @ApiProperty({ 
    example: 'Mulheres de 25-40 anos, interessadas em fitness e vida saudável',
    description: 'Descrição detalhada do público-alvo para guiar a IA'
  })
  @IsOptional()
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

  // --- Novos Campos de Produto ---

  @ApiProperty({ example: 'Tenis Air Max 2026', required: false })
  @IsOptional()
  @IsString()
  productName?: string;

  @ApiProperty({ example: 'Calçados Esportivos', required: false })
  @IsOptional()
  @IsString()
  productCategory?: string;

  @ApiProperty({ example: 499.90, required: false })
  @IsOptional()
  @IsNumber()
  productPrice?: number;

  @ApiProperty({ example: 699.90, required: false })
  @IsOptional()
  @IsNumber()
  productOriginalPrice?: number;

  @ApiProperty({ example: 'https://loja.com/airmax', required: false })
  @IsOptional()
  @IsString()
  productUrl?: string;

  @ApiProperty({ 
    example: 'O único com tecnologia de nitrogênio líquido na sola', 
    required: false 
  })
  @IsOptional()
  @IsString()
  productUsp?: string;

  // --- Oferta ---

  @ApiProperty({ example: 'DISCOUNT', description: 'Tipo de oferta', required: false })
  @IsOptional()
  @IsString()
  offerType?: string;

  @ApiProperty({ example: '2026-12-31T23:59:59Z', required: false })
  @IsOptional()
  @IsString()
  offerDeadline?: string;

  @ApiProperty({ example: 'Compre Agora', required: false })
  @IsOptional()
  @IsString()
  ctaText?: string;

  // --- Orçamento ---

  @ApiProperty({ example: 50.00, required: false })
  @IsOptional()
  @IsNumber()
  budgetDaily?: number;

  @ApiProperty({ example: 1500.00, required: false })
  @IsOptional()
  @IsNumber()
  budgetTotal?: number;
}