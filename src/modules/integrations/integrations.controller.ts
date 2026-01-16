import { Controller, Get, Post, Body, UseGuards, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiBody } from '@nestjs/swagger';
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
  @ApiOperation({ 
    summary: '1. Obter URL de Login', 
    description: 'O Frontend deve redirecionar o usuário para esta URL.' 
  })
  getMetaAuthUrl() {
    return { url: this.integrationsService.getMetaAuthUrl() };
  }

  @Post('meta/connect')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ 
    summary: '2. Finalizar Conexão (Enviar Código)',
    description: 'O Frontend captura o código da URL de retorno e envia neste endpoint via POST.'
  })
  @ApiBody({ schema: { type: 'object', properties: { code: { type: 'string' } } } })
  async connectFacebook(
    @Body('code') code: string,
    @ActiveUser() user: ActiveUserData,
  ) {
    if (!code) throw new BadRequestException('Código de autorização é obrigatório.');
    
    return this.integrationsService.handleMetaCallback(code, user);
  }
}