import { IsEnum, IsOptional } from 'class-validator';
import { ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { CampaignStatus } from '@prisma/client';
import { CreateCampaignDto } from './create-campaign.dto';

/**
 * DTO para atualização de campanha.
 * Todos os campos de CreateCampaignDto são opcionais (via PartialType).
 * Adiciona o campo `status` para permitir transições de estado.
 */
export class UpdateCampaignDto extends PartialType(CreateCampaignDto) {
  @ApiPropertyOptional({
    enum: CampaignStatus,
    description: 'Novo status da campanha (transição de estado)',
    example: 'GENERATING_ASSETS',
  })
  @IsOptional()
  @IsEnum(CampaignStatus)
  status?: CampaignStatus;
}