import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../iam/authentication/guards/jwt-auth.guard';
import { AiService } from './ai.service';
import { GenerateCopyDto } from './dto/generate-copy.dto';

@ApiTags('Inteligência Artificial')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('ai')
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Post('generate-copy')
  @ApiOperation({ summary: 'Gerar copy para anúncio usando IA' })
  generateCopy(@Body() dto: GenerateCopyDto) {
    return this.aiService.generateCampaignCopy(dto.productName, dto.objective);
  }
}