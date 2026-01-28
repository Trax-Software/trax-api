import { PartialType } from '@nestjs/swagger';
import { CreateCampaignDto } from './create-campaign.dto';

// O PartialType faz todos os campos (targetAudience, brandTone, etc) ficarem opcionais automaticamente
export class UpdateCampaignDto extends PartialType(CreateCampaignDto) {}