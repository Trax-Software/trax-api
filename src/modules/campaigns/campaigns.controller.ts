import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation } from '@nestjs/swagger';
import { CampaignsService } from './campaigns.service';
import { CreateCampaignDto } from './dto/create-campaign.dto';
import { JwtAuthGuard } from '../iam/authentication/guards/jwt-auth.guard';
import { ActiveUser, ActiveUserData } from '../iam/authentication/decorators/active-user.decorator';

@ApiTags('Campanhas')
@ApiBearerAuth() // 🔒 Cadeado no Swagger
@UseGuards(JwtAuthGuard) // 🔒 Proteção via Token
@Controller('campaigns')
export class CampaignsController {
  constructor(private readonly campaignsService: CampaignsService) {}

  @Post()
  @ApiOperation({ summary: 'Criar nova campanha' })
  create(@Body() createCampaignDto: CreateCampaignDto, @ActiveUser() user: ActiveUserData) {
    return this.campaignsService.create(createCampaignDto, user);
  }

  @Get()
  @ApiOperation({ summary: 'Listar minhas campanhas' })
  findAll(@ActiveUser() user: ActiveUserData) {
    return this.campaignsService.findAll(user);
  }
}