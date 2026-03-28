import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { PrismaService } from '../../database/prisma.service';
import { EncryptionService } from '../security/encryption.service';
import { ActiveUserData } from '../iam/authentication/decorators/active-user.decorator';
import { lastValueFrom } from 'rxjs';
import { MetaSelectDto } from './dto/meta-select.dto';
import { CampaignObjective } from '@prisma/client';

interface PublishMetaInput {
  workspaceId: string;
  adAccountId: string;
  pageId: string;
  campaign: {
    id: string;
    name: string;
    objective: CampaignObjective;
    description: string | null;
    budgetDaily: number | null;
    budgetTotal: number | null;
    ctaText: string | null;
    productUrl: string | null;
  };
  creative: {
    id: string;
    imageUrl: string;
    headline: string | null;
    primaryText: string | null;
  };
}

@Injectable()
export class IntegrationsService {
  private readonly logger = new Logger(IntegrationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly http: HttpService,
    private readonly encryption: EncryptionService,
  ) {}

  private getRequiredEnv(key: string): string {
    try {
      return this.config.getOrThrow<string>(key);
    } catch {
      throw new InternalServerErrorException(
        `Variável de ambiente obrigatória ausente: ${key}`,
      );
    }
  }

  private getMetaApiVersion(): string {
    const getter = (this.config as any).get;
    if (typeof getter === 'function') {
      return getter.call(this.config, 'META_API_VERSION') || 'v18.0';
    }
    return 'v18.0';
  }

  private normalizeAdAccountId(adAccountId: string): string {
    return adAccountId.startsWith('act_') ? adAccountId : `act_${adAccountId}`;
  }

  private toMetaObjective(objective: CampaignObjective): string {
    // Mapeamento mínimo de objetivos internos para Meta (ODAX)
    const map: Record<CampaignObjective, string> = {
      AWARENESS: 'OUTCOME_AWARENESS',
      TRAFFIC: 'OUTCOME_TRAFFIC',
      LEADS: 'OUTCOME_LEADS',
      SALES: 'OUTCOME_SALES',
    };
    return map[objective];
  }

  private getDailyBudgetInCents(campaign: PublishMetaInput['campaign']): number {
    const daily = campaign.budgetDaily && campaign.budgetDaily > 0
      ? campaign.budgetDaily
      : campaign.budgetTotal && campaign.budgetTotal > 0
        ? campaign.budgetTotal / 30
        : 20;

    return Math.max(100, Math.round(daily * 100));
  }

  private async getWorkspaceMemberOrFail(user: ActiveUserData) {
    const member = await this.prisma.workspaceMember.findFirst({
      where: { userId: user.sub },
      select: { workspaceId: true },
    });
    if (!member) {
      throw new BadRequestException('Usuário sem workspace');
    }
    return member;
  }

  /**
   * 1. Gera a URL para o usuário iniciar o login no Facebook.
   */
  getMetaAuthUrl() {
    const appId = this.getRequiredEnv('META_APP_ID');
    const redirectUri = this.getRequiredEnv('META_CALLBACK_URL');
    const scope = 'ads_management,ads_read,pages_show_list'; 
    const version = this.getMetaApiVersion();

    return `https://www.facebook.com/${version}/dialog/oauth?client_id=${appId}&redirect_uri=${redirectUri}&scope=${scope}&state=NO_STATE_FOR_NOW`;
  }

  /**
   * 2. Recebe o código do Frontend, troca por Token de Longa Duração e salva.
   */
  async handleMetaCallback(code: string, user: ActiveUserData) {
    const appId = this.getRequiredEnv('META_APP_ID');
    const appSecret = this.getRequiredEnv('META_APP_SECRET');
    const redirectUri = this.getRequiredEnv('META_CALLBACK_URL');
    const version = this.getMetaApiVersion();

    // Valida Workspace
    const member = await this.getWorkspaceMemberOrFail(user);

    try {
      // A. Troca Code -> Access Token (Curta Duração)
      const tokenUrl = `https://graph.facebook.com/${version}/oauth/access_token?client_id=${appId}&redirect_uri=${redirectUri}&client_secret=${appSecret}&code=${code}`;
      const { data: shortData } = await lastValueFrom(this.http.get(tokenUrl));
      const shortLivedToken = shortData.access_token;

      if (!shortLivedToken) throw new Error('Falha ao obter token inicial.');

      // B. Troca Token Curto -> Token Longa Duração (60 dias)
      const exchangeUrl = `https://graph.facebook.com/${version}/oauth/access_token?grant_type=fb_exchange_token&client_id=${appId}&client_secret=${appSecret}&fb_exchange_token=${shortLivedToken}`;
      
      let finalToken = shortLivedToken;
      try {
        const { data: longData } = await lastValueFrom(this.http.get(exchangeUrl));
        if (longData.access_token) {
          finalToken = longData.access_token;
        }
      } catch (exchangeError) {
        console.warn('Falha ao trocar por token de longa duração, usando o curto.', exchangeError);
      }

      // C. Criptografa o token FINAL
      const encryptedToken = await this.encryption.encrypt(finalToken);

      // D. Salva no Banco (Upsert)
      await this.prisma.integration.upsert({
        where: {
          workspaceId_provider_externalId: {
            workspaceId: member.workspaceId,
            provider: 'META',
            externalId: 'me', // Idealmente buscaria o ID real chamando /me
          },
        },
        update: {
          accessToken: encryptedToken,
          status: 'ACTIVE',
          updatedAt: new Date(),
        },
        create: {
          workspaceId: member.workspaceId,
          provider: 'META',
          externalId: 'me',
          name: 'Conta Facebook',
          accessToken: encryptedToken,
          status: 'ACTIVE',
        },
      });

      return { message: 'Facebook conectado com sucesso! Token válido por 60 dias.' };

    } catch (error: any) {
      this.logger.error(
        'Erro na integração Meta (callback)',
        error instanceof Error ? error.stack : String(error),
      );
      throw new BadRequestException('Falha ao conectar com Facebook.');
    }
  }

  /**
   * 3. Lista as Contas de Anúncios (Ad Accounts)
   */
  async getAdAccounts(user: ActiveUserData) {
    const accessToken = await this.getDecryptedAccessToken(user);
    const version = this.getMetaApiVersion();

    try {
      const url = `https://graph.facebook.com/${version}/me/adaccounts?fields=name,account_id,currency,account_status&access_token=${accessToken}`;
      const { data } = await lastValueFrom(this.http.get(url));
      return data.data; 
    } catch (error) {
      this.logger.error(
        'Erro ao buscar Ad Accounts',
        error instanceof Error ? error.stack : String(error),
      );
      throw new BadRequestException('Falha ao buscar contas de anúncio.');
    }
  }

  /**
   * 4. Lista as Páginas do Facebook (Pages)
   */
  async getPages(user: ActiveUserData) {
    const accessToken = await this.getDecryptedAccessToken(user);
    const version = this.getMetaApiVersion();

    try {
      const url = `https://graph.facebook.com/${version}/me/accounts?fields=name,id,category,access_token,picture&access_token=${accessToken}`;
      const { data } = await lastValueFrom(this.http.get(url));
      return data.data;
    } catch (error) {
      this.logger.error(
        'Erro ao buscar páginas',
        error instanceof Error ? error.stack : String(error),
      );
      throw new BadRequestException('Falha ao buscar páginas.');
    }
  }

  async getMetaStatus(user: ActiveUserData) {
    const member = await this.getWorkspaceMemberOrFail(user);

    const [integration, workspace] = await Promise.all([
      this.prisma.integration.findFirst({
        where: {
          workspaceId: member.workspaceId,
          provider: 'META',
          status: 'ACTIVE',
        },
        select: { id: true },
      }),
      this.prisma.workspace.findFirst({
        where: { id: member.workspaceId },
        select: { metaAdAccountId: true, metaPageId: true },
      }),
    ]);

    return {
      connected: !!integration,
      selectedAdAccountId: workspace?.metaAdAccountId || null,
      selectedPageId: workspace?.metaPageId || null,
    };
  }

  async saveMetaSelection(dto: MetaSelectDto, user: ActiveUserData) {
    const member = await this.getWorkspaceMemberOrFail(user);

    const integration = await this.prisma.integration.findFirst({
      where: {
        workspaceId: member.workspaceId,
        provider: 'META',
        status: 'ACTIVE',
      },
      select: { id: true },
    });

    if (!integration) {
      throw new BadRequestException('Nenhuma conta do Facebook conectada.');
    }

    await this.prisma.workspace.update({
      where: { id: member.workspaceId },
      data: {
        metaAdAccountId: dto.adAccountId,
        metaPageId: dto.pageId,
      },
    });

    return {
      message: 'Seleção Meta salva com sucesso.',
      selectedAdAccountId: dto.adAccountId,
      selectedPageId: dto.pageId,
    };
  }

  async publishCampaignToMeta(input: PublishMetaInput) {
    const accessToken = await this.getDecryptedAccessTokenByWorkspace(input.workspaceId);
    const version = this.getMetaApiVersion();
    const adAccountId = this.normalizeAdAccountId(input.adAccountId);
    const objective = this.toMetaObjective(input.campaign.objective);
    const dailyBudget = this.getDailyBudgetInCents(input.campaign);

    const headline = input.creative.headline || input.campaign.name;
    const primaryText = input.creative.primaryText || input.campaign.description || '';
    const cta = input.campaign.ctaText || 'Saiba Mais';
    const destinationUrl = input.campaign.productUrl || 'https://example.com';

    try {
      const campaignParams = {
        name: input.campaign.name,
        objective,
        status: 'PAUSED',
        special_ad_categories: '[]',
        access_token: accessToken,
      };
      const { data: campaignData } = await lastValueFrom(
        this.http.post(`https://graph.facebook.com/${version}/${adAccountId}/campaigns`, null, {
          params: campaignParams,
        }),
      );
      const metaCampaignId = campaignData.id;

      const adSetParams = {
        name: `${input.campaign.name} - Ad Set`,
        campaign_id: metaCampaignId,
        daily_budget: dailyBudget,
        billing_event: 'IMPRESSIONS',
        optimization_goal: 'REACH',
        bid_strategy: 'LOWEST_COST_WITHOUT_CAP',
        targeting: JSON.stringify({ geo_locations: { countries: ['BR'] } }),
        status: 'PAUSED',
        access_token: accessToken,
      };
      const { data: adSetData } = await lastValueFrom(
        this.http.post(`https://graph.facebook.com/${version}/${adAccountId}/adsets`, null, {
          params: adSetParams,
        }),
      );
      const metaAdSetId = adSetData.id;

      const creativeParams = {
        name: `${input.campaign.name} - Creative`,
        object_story_spec: JSON.stringify({
          page_id: input.pageId,
          link_data: {
            image_url: input.creative.imageUrl,
            link: destinationUrl,
            message: primaryText,
            name: headline,
            call_to_action: {
              type: 'LEARN_MORE',
              value: { link: destinationUrl },
            },
          },
        }),
        access_token: accessToken,
      };
      const { data: creativeData } = await lastValueFrom(
        this.http.post(`https://graph.facebook.com/${version}/${adAccountId}/adcreatives`, null, {
          params: creativeParams,
        }),
      );
      const metaCreativeId = creativeData.id;

      const adParams = {
        name: `${input.campaign.name} - Ad`,
        adset_id: metaAdSetId,
        creative: JSON.stringify({ creative_id: metaCreativeId }),
        status: 'PAUSED',
        access_token: accessToken,
      };
      const { data: adData } = await lastValueFrom(
        this.http.post(`https://graph.facebook.com/${version}/${adAccountId}/ads`, null, {
          params: adParams,
        }),
      );
      const metaAdId = adData.id;

      return {
        metaCampaignId,
        metaAdSetId,
        metaCreativeId,
        metaAdId,
        headline,
        primaryText,
        cta,
      };
    } catch (error: any) {
      const providerMessage =
        error?.response?.data?.error?.message || error?.message || 'Erro desconhecido';
      this.logger.error(`Falha ao publicar no Meta Ads: ${providerMessage}`);
      throw new BadRequestException('Falha ao publicar campanha no Meta Ads.');
    }
  }

  // --- Helper Privado ---
  private async getDecryptedAccessToken(user: ActiveUserData): Promise<string> {
    const member = await this.getWorkspaceMemberOrFail(user);
    return this.getDecryptedAccessTokenByWorkspace(member.workspaceId);
  }

  private async getDecryptedAccessTokenByWorkspace(workspaceId: string): Promise<string> {
    const integration = await this.prisma.integration.findFirst({
      where: {
        workspaceId,
        provider: 'META',
        status: 'ACTIVE',
      },
    });

    if (!integration) {
      throw new BadRequestException('Nenhuma conta do Facebook conectada.');
    }

    return this.encryption.decrypt(integration.accessToken);
  }
}
