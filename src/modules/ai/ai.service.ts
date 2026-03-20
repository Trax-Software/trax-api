import {
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  Logger,
  NotFoundException
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { ActiveUserData } from '../iam/authentication/decorators/active-user.decorator';
import { StorageService } from '../storage/storage.service';
import { AI_PROVIDER, AiProvider } from './interfaces/ai-provider.interface';

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);

  // 💰 Tabela de Custos (Estimativa: 1 Crédito = 1 Token)
  // Ajuste os valores conforme sua estratégia de precificação
  private readonly COSTS = {
    IMAGE_FIXED: 2000,     // Custo fixo para 1 imagem (equivale a 2000 tokens de texto)
    MIN_TOKEN_BALANCE: 100 // Saldo mínimo para o usuário tentar qualquer operação
  };

  constructor(
    @Inject(AI_PROVIDER) private readonly aiProvider: AiProvider,
    private readonly prisma: PrismaService,
    private readonly storage: StorageService
  ) {}

  // ===========================================================================
  // 🔒 MÉTODOS PRIVADOS (Core Financeiro e Contextual)
  // ===========================================================================

  /**
   * 1. Check de Saldo (Pré-voo):
   * Garante que o usuário tem o mínimo necessário antes de gastarmos API.
   */
  private async ensureBalance(workspaceId: string, minRequired: number) {
    const workspace = await this.prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: { credits: true }
    });

    if (!workspace || workspace.credits < minRequired) {
      throw new HttpException(
        `Saldo insuficiente. Você tem ${workspace?.credits || 0} tokens, mas precisa de no mínimo ${minRequired} para esta operação.`,
        HttpStatus.PAYMENT_REQUIRED // 402
      );
    }
  }

  /**
   * 2. Cobrança Real (Pós-voo):
   * Desconta do banco a quantidade exata que a IA consumiu.
   */
  private async deductUsage(workspaceId: string, amount: number) {
    const updated = await this.prisma.workspace.update({
      where: { id: workspaceId },
      data: { credits: { decrement: amount } },
      select: { credits: true }
    });
    this.logger.log(`📉 Consumo: -${amount} tokens | Workspace: ${workspaceId} | Restante: ${updated.credits}`);
  }

  /**
   * 3. Brand DNA (O Cérebro):
   * Monta o System Prompt com a identidade da marca.
   */
  private async buildSystemPrompt(workspaceId: string): Promise<string> {
    const workspace = await this.prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: { brandName: true, brandVoice: true, brandColors: true }
    });

    const brandName = workspace?.brandName || 'nossa marca';
    const voice = workspace?.brandVoice || 'Profissional e Persuasivo';
    const colors = workspace?.brandColors?.join(', ') || 'Cores padrão';

    return `
      ATUE COMO: Um Diretor de Criação Sênior e Estrategista da marca "${brandName}".
      
      💎 BRAND DNA (Contexto da Marca):
      - Tom de Voz: ${voice}
      - Identidade Visual: O mood deve harmonizar com as cores [${colors}].
      - Objetivo: Criar conteúdo de alta conversão.
      
      REGRAS: Mantenha-se fiel a este DNA em todas as respostas.
    `;
  }

  // ===========================================================================
  // 🚀 MÉTODOS PÚBLICOS (Funcionalidades Completas)
  // ===========================================================================

  /**
   * Gera Copy (Texto) para Campanhas.
   * ✅ Brand DNA
   * ✅ Cobrança por Token (Input + Output)
   * ✅ Log de Auditoria
   */
  async generateCampaignCopy(productName: string, objective: string, user: ActiveUserData) {
    const member = await this.prisma.workspaceMember.findFirst({
      where: { userId: user.sub },
      select: { workspaceId: true },
    });
    if (!member) throw new NotFoundException('Workspace não encontrado');

    // A. Verifica Saldo Mínimo
    await this.ensureBalance(member.workspaceId, this.COSTS.MIN_TOKEN_BALANCE);

    // B. Prepara Contexto
    const systemPrompt = await this.buildSystemPrompt(member.workspaceId);
    const userPrompt = `
      CONTEXTO: Produto: "${productName}". Objetivo: "${objective}".
      TAREFA: Crie 3 Headlines, 1 Texto Principal e 1 Briefing de Imagem.
      FORMATO: Markdown.
    `;
    const finalPrompt = `${systemPrompt}\n\n${userPrompt}`;

    // C. Gera com IA
    const response = await this.aiProvider.generateText(finalPrompt, { 
      temperature: 0.8, 
      maxTokens: 2000 
    });

    // D. Cobra o Custo Real
    const totalTokens = response.usage.totalTokens;
    await this.deductUsage(member.workspaceId, totalTokens);

    // E. Salva Log
    await this.prisma.aiLog.create({
      data: {
        userId: user.sub,
        workspaceId: member.workspaceId,
        provider: 'GEMINI',
        model: 'gemini-2.0-flash',
        type: 'COPY_GENERATION',
        inputTokens: response.usage.inputTokens,
        outputTokens: response.usage.outputTokens,
        totalTokens: totalTokens,
      },
    });

    return { result: response.content, cost: totalTokens };
  }

  /**
   * Gera Imagens.
   * ✅ Injeção de Cores da Marca (Novo!)
   * ✅ Cobrança Fixa
   * ✅ Upload para Cloudflare R2
   */
  async generateCampaignImage(imagePrompt: string, user: ActiveUserData) {
    const member = await this.prisma.workspaceMember.findFirst({
      where: { userId: user.sub },
      select: { workspaceId: true },
    });
    if (!member) throw new NotFoundException('Workspace não encontrado');

    // A. Verifica Saldo (Custo Fixo)
    await this.ensureBalance(member.workspaceId, this.COSTS.IMAGE_FIXED);

    // B. Enriquece Prompt com Cores (Brand DNA Visual)
    const workspace = await this.prisma.workspace.findUnique({
      where: { id: member.workspaceId },
      select: { brandColors: true }
    });
    const colorContext = workspace?.brandColors?.length 
      ? ` Utilize a paleta de cores da marca: ${workspace.brandColors.join(', ')}.` 
      : '';
    const finalPrompt = `${imagePrompt}.${colorContext} Alta resolução, estilo profissional.`;

    // C. Gera Imagem
    this.logger.log(`🎨 Gerando imagem para: ${user.email}`);
    const base64Image = await this.aiProvider.generateImage(finalPrompt);
    const imageBuffer = Buffer.from(base64Image, 'base64');
    
    // D. Upload para Storage (R2)
    const fileName = `ai-gen-${Date.now()}.png`;
    const publicUrl = await this.storage.uploadFile(imageBuffer, fileName, 'image/png');

    // E. Cobra Custo Fixo
    await this.deductUsage(member.workspaceId, this.COSTS.IMAGE_FIXED);

    // F. Salva Log
    await this.prisma.aiLog.create({
      data: {
        userId: user.sub,
        workspaceId: member.workspaceId,
        provider: 'GOOGLE_IMAGEN',
        model: 'imagen-4.0',
        type: 'IMAGE_GENERATION',
        inputTokens: finalPrompt.length,
        outputTokens: 1,
        totalTokens: this.COSTS.IMAGE_FIXED,
      },
    });

    return { 
      message: 'Imagem gerada com sucesso',
      imageUrl: publicUrl,
      cost: this.COSTS.IMAGE_FIXED
    };
  }

  /**
   * Gera Estratégia (Brainstorm).
   * ✅ Brand DNA
   * ✅ Cobrança por Token
   * ✅ Parse de JSON Resiliente
   */
  async generateStrategyOptions(campaignId: string, user: ActiveUserData) {
    const campaign = await this.prisma.campaign.findUnique({
      where: { id: campaignId },
      include: { workspace: true }
    });
    if (!campaign) throw new NotFoundException('Campanha não encontrada');

    // A. Verifica Saldo
    await this.ensureBalance(campaign.workspaceId, this.COSTS.MIN_TOKEN_BALANCE);

    // B. Prepara Prompt (Com Brand DNA)
    const systemPrompt = await this.buildSystemPrompt(campaign.workspaceId);
    const userPrompt = `
      PRODUTO: "${campaign.name}". OBJETIVO: "${campaign.objective}". 
      PLATAFORMA: "${campaign.platform}". DESCRIÇÃO: "${campaign.description}".
      TAREFA: Gere 3 personas/ângulos estratégicos.
      FORMATO: JSON Array puro [ { "title": "...", "targetAudience": "...", ... } ].
    `;
    const finalPrompt = `${systemPrompt}\n\n${userPrompt}`;

    // C. Gera com IA
    const response = await this.aiProvider.generateText(finalPrompt, { 
      temperature: 0.7, 
      maxTokens: 2500 
    });

    // D. Cobra Custo Real
    const totalTokens = response.usage.totalTokens;
    await this.deductUsage(campaign.workspaceId, totalTokens);

    // E. Processa JSON e Loga
    const cleanJson = response.content.replace(/```json|```/g, '').trim();
    
    try {
      const strategies = JSON.parse(cleanJson);
      
      await this.prisma.aiLog.create({
        data: {
          userId: user.sub,
          workspaceId: campaign.workspaceId,
          provider: 'GEMINI',
          model: 'gemini-2.0-flash',
          type: 'STRATEGY_GENERATION',
          inputTokens: response.usage.inputTokens,
          outputTokens: response.usage.outputTokens,
          totalTokens: totalTokens,
        },
      });

      return strategies;
    } catch (e) {
      this.logger.error('Erro de Parse JSON IA', e);
      // Cobramos mesmo com erro de parse, pois a IA trabalhou. Retornamos o raw para debug.
      return { 
        error: 'A IA gerou uma resposta, mas o formato JSON falhou.', 
        rawContent: response.content 
      };
    }
  }

  /**
   * Gera 3 Opções Completas de Copy (Novo Fluxo Simplificado)
   * ✅ Usa frameworks de marketing (AIDA, PAS, FAB)
   * ✅ Gera Headlines + Primary Text + CTA
   * ✅ Brand DNA integrado
   */
  async generateCopyCampaignOptions(campaignId: string, user: ActiveUserData) {
    const campaign = await this.prisma.campaign.findUnique({
      where: { id: campaignId },
      include: { workspace: true }
    });
    if (!campaign) throw new NotFoundException('Campanha não encontrada');

    // A. Verifica Saldo
    await this.ensureBalance(campaign.workspaceId, this.COSTS.MIN_TOKEN_BALANCE);

    // B. Prepara Prompt Avançado com Frameworks de Marketing
    const systemPrompt = await this.buildSystemPrompt(campaign.workspaceId);
    
    const userPrompt = `
CONTEXTO DA CAMPANHA:
- Produto/Serviço: "${campaign.productName || campaign.name}"
- Objetivo: ${campaign.objective} (${this.getObjectiveDescription(campaign.objective)})
- Público-Alvo: ${campaign.targetAudience || 'Público geral'}
- Diferencial (USP): ${campaign.productUsp || 'A definir'}
- Preço: ${campaign.productPrice ? `R$ ${campaign.productPrice}` : 'Não informado'}
- URL: ${campaign.productUrl || 'Não informado'}

TAREFA:
Você é um copywriter sênior especializado em marketing de performance. Crie 3 OPÇÕES COMPLETAS de copy para anúncios digitais, cada uma usando um framework diferente de persuasão:

OPÇÃO 1: Framework AIDA (Atenção → Interesse → Desejo → Ação)
OPÇÃO 2: Framework PAS (Problema → Agitação → Solução)
OPÇÃO 3: Framework FAB (Features → Advantages → Benefits)

Para cada opção, gere:
1. **headline**: Uma headline impactante (máx 40 caracteres)
2. **primaryText**: Texto principal persuasivo (100-150 palavras)
3. **cta**: Call-to-action claro e direto
4. **framework**: Nome do framework usado
5. **reasoning**: Breve explicação de por que essa abordagem funciona para este público

REGRAS IMPORTANTES:
- Use gatilhos mentais (escassez, prova social, autoridade, urgência)
- Foque nos BENEFÍCIOS, não apenas nas features
- Adapte o tom de voz ao público-alvo
- Seja específico e evite clichês genéricos
- Inclua números e dados quando possível

FORMATO DE SAÍDA (JSON Array):
[
  {
    "headline": "...",
    "primaryText": "...",
    "cta": "...",
    "framework": "AIDA",
    "reasoning": "..."
  },
  {
    "headline": "...",
    "primaryText": "...",
    "cta": "...",
    "framework": "PAS",
    "reasoning": "..."
  },
  {
    "headline": "...",
    "primaryText": "...",
    "cta": "...",
    "framework": "FAB",
    "reasoning": "..."
  }
]

Retorne APENAS o JSON, sem markdown ou explicações adicionais.
    `;

    const finalPrompt = `${systemPrompt}\n\n${userPrompt}`;

    // C. Gera com IA
    const response = await this.aiProvider.generateText(finalPrompt, { 
      temperature: 0.8, // Mais criatividade para copy
      maxTokens: 3000 
    });

    // D. Cobra Custo Real
    const totalTokens = response.usage.totalTokens;
    await this.deductUsage(campaign.workspaceId, totalTokens);

    // E. Processa JSON e Loga
    const cleanJson = response.content.replace(/```json|```/g, '').trim();
    
    try {
      const copyOptions = JSON.parse(cleanJson);
      
      await this.prisma.aiLog.create({
        data: {
          userId: user.sub,
          workspaceId: campaign.workspaceId,
          provider: 'GEMINI',
          model: 'gemini-2.0-flash',
          type: 'COPY_GENERATION',
          inputTokens: response.usage.inputTokens,
          outputTokens: response.usage.outputTokens,
          totalTokens: totalTokens,
        },
      });

      return copyOptions;
    } catch (e) {
      this.logger.error('Erro de Parse JSON IA (Copy Options)', e);
      return { 
        error: 'A IA gerou uma resposta, mas o formato JSON falhou.', 
        rawContent: response.content 
      };
    }
  }

  // Helper para descrições de objetivos
  private getObjectiveDescription(objective: string): string {
    const map: Record<string, string> = {
      AWARENESS: 'Aumentar visibilidade e reconhecimento da marca',
      TRAFFIC: 'Atrair visitantes qualificados para o site',
      SALES: 'Converter em vendas diretas',
      LEADS: 'Captar contatos qualificados para nutrição',
    };
    return map[objective] || objective;
  }
}