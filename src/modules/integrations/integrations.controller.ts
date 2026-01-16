import { Controller, Get, Query, UseGuards, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { IntegrationsService } from './integrations.service';
import { JwtAuthGuard } from '../iam/authentication/guards/jwt-auth.guard';
import { ActiveUser, ActiveUserData } from '../iam/authentication/decorators/active-user.decorator';

@ApiTags('Integrações (Facebook/Meta)')
@Controller('integrations')
export class IntegrationsController {
  constructor(private readonly integrationsService: IntegrationsService) {}

  @Get('meta/auth-url')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '1. Obter URL para iniciar conexão com Facebook' })
  getMetaAuthUrl() {
    return { url: this.integrationsService.getMetaAuthUrl() };
  }

  @Get('meta/callback')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '2. Callback que recebe o código do Facebook e salva o Token' })
  async metaCallback(
    @Query('code') code: string,
    @ActiveUser() user: ActiveUserData,
  ) {
    if (!code) throw new BadRequestException('Código de autorização não fornecido.');
    
    return this.integrationsService.handleMetaCallback(code, user);
  }
}