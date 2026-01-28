import { 
  Body, 
  Controller, 
  Get, 
  Post, 
  Patch, 
  UseGuards, 
  Param, 
  ParseUUIDPipe 
} from '@nestjs/common';
import { 
  ApiBearerAuth, 
  ApiTags, 
  ApiOperation, 
  ApiResponse 
} from '@nestjs/swagger';
import { CampaignsService } from './campaigns.service';
import { CreateCampaignDto } from './dto/create-campaign.dto';
import { UpdateCampaignDto } from './dto/update-campaign.dto';
import { StrategyOptionDto } from './dto/brainstorm-response.dto'; // Import novo
import { AiService } from '../ai/ai.service';
import { JwtAuthGuard } from '../iam/authentication/guards/jwt-auth.guard';
import { ActiveUser, ActiveUserData } from '../iam/authentication/decorators/active-user.decorator';

@ApiTags('Campanhas')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('campaigns')
export class CampaignsController {
  constructor(
    private readonly campaignsService: CampaignsService,
    private readonly aiService: AiService,
  ) {}

  @Post()
  @ApiOperation({ summary: '1. Criar campanha básica (Rascunho)' })
  @ApiResponse({ status: 201, description: 'Campanha criada com sucesso.' })
  create(@Body() dto: CreateCampaignDto, @ActiveUser() user: ActiveUserData) {
    return this.campaignsService.create(dto, user);
  }

  @Get()
  @ApiOperation({ summary: 'Listar todas as minhas campanhas' })
  findAll(@ActiveUser() user: ActiveUserData) {
    return this.campaignsService.findAll(user);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obter detalhes da campanha e criativos' })
  findOne(
    @Param('id', ParseUUIDPipe) id: string, // 🛡️ Validação de UUID
    @ActiveUser() user: ActiveUserData
  ) {
    return this.campaignsService.findOne(id, user);
  }

  // --- FLUXO DE INTELIGÊNCIA ARTIFICIAL ---

  @Post(':id/brainstorm')
  @ApiOperation({ 
    summary: '2. Gerar opções de estratégia com IA',
    description: 'A IA analisa o nome/objetivo e retorna 3 caminhos criativos.'
  })
  @ApiResponse({ 
    status: 201, 
    description: 'Sugestões geradas com sucesso.',
    type: [StrategyOptionDto] // 📖 Documentação Automática do Array
  })
  async brainstormStrategy(
    @Param('id', ParseUUIDPipe) id: string, 
    @ActiveUser() user: ActiveUserData
  ) {
    return this.aiService.generateStrategyOptions(id, user);
  }

  @Patch(':id')
  @ApiOperation({ 
    summary: '3. Salvar estratégia escolhida',
    description: 'Atualiza a campanha com o público/tom escolhido e muda status.'
  })
  update(
    @Param('id', ParseUUIDPipe) id: string, 
    @Body() updateCampaignDto: UpdateCampaignDto,
    @ActiveUser() user: ActiveUserData
  ) {
    return this.campaignsService.update(id, updateCampaignDto, user);
  }
}