import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { PrismaService } from '../../database/prisma.service';
import { EncryptionService } from '../security/encryption.service';
import { ActiveUserData } from '../iam/authentication/decorators/active-user.decorator';
import { lastValueFrom } from 'rxjs';

@Injectable()
export class IntegrationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly http: HttpService,
    private readonly encryption: EncryptionService, // 🔒 Nosso guardião
  ) {}

  // 1. Gera a URL para o usuário clicar "Conectar Facebook"
  getMetaAuthUrl() {
    const appId = this.config.getOrThrow('META_APP_ID');
    const redirectUri = this.config.getOrThrow('META_CALLBACK_URL');
    const scope = 'ads_management,ads_read,pages_show_list'; // Permissões necessárias

    return `https://www.facebook.com/v18.0/dialog/oauth?client_id=${appId}&redirect_uri=${redirectUri}&scope=${scope}&state=NO_STATE_FOR_NOW`;
  }

  // 2. Recebe o código e troca pelo Token (O momento crítico)
  async handleMetaCallback(code: string, user: ActiveUserData) {
    const appId = this.config.getOrThrow('META_APP_ID');
    const appSecret = this.config.getOrThrow('META_APP_SECRET');
    const redirectUri = this.config.getOrThrow('META_CALLBACK_URL');

    // Descobrir Workspace do usuário
    const member = await this.prisma.workspaceMember.findFirst({
      where: { userId: user.sub },
    });
    if (!member) throw new BadRequestException('Usuário sem workspace');

    try {
      // A. Troca Code -> Access Token
      const tokenUrl = `https://graph.facebook.com/v18.0/oauth/access_token?client_id=${appId}&redirect_uri=${redirectUri}&client_secret=${appSecret}&code=${code}`;
      const { data } = await lastValueFrom(this.http.get(tokenUrl));
      
      const rawToken = data.access_token;

      // B. 🔒 CRIPTOGRAFA O TOKEN ANTES DE SALVAR
      const encryptedToken = await this.encryption.encrypt(rawToken);

      // C. Salva no Banco (Upsert: Atualiza se já existir)
      await this.prisma.integration.upsert({
        where: {
          workspaceId_provider_externalId: {
            workspaceId: member.workspaceId,
            provider: 'META',
            externalId: 'me', // Temporário, depois pegamos o ID real do usuário Meta
          },
        },
        update: {
          accessToken: encryptedToken, // Salva cifrado
          status: 'ACTIVE',
        },
        create: {
          workspaceId: member.workspaceId,
          provider: 'META',
          externalId: 'me',
          name: 'Conta Facebook',
          accessToken: encryptedToken, // Salva cifrado
          status: 'ACTIVE',
        },
      });

      return { message: 'Facebook conectado com sucesso!' };

    } catch (error) {
      console.error('Erro na integração Meta:', error);
      throw new BadRequestException('Falha ao conectar com Facebook.');
    }
  }
}