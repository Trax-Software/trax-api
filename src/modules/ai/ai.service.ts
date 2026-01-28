import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { AI_PROVIDER, AiProvider } from './interfaces/ai-provider.interface';
import { PrismaService } from '../../database/prisma.service';
import { ActiveUserData } from '../iam/authentication/decorators/active-user.decorator';
import { StorageService } from '../storage/storage.service';

@Injectable()
export class AiService {
  constructor(
    @Inject(AI_PROVIDER) private readonly aiProvider: AiProvider,
    private readonly prisma: PrismaService,
    private readonly storage: StorageService
  ) {}

  async generateCampaignCopy(
    productName: string, 
    objective: string, 
    user: ActiveUserData
  ) {
    const member = await this.prisma.workspaceMember.findFirst({
      where: { userId: user.sub },
      select: { workspaceId: true },
    });

    if (!member) throw new NotFoundException('Workspace não encontrado');

    const prompt = `
      ATUE COMO: Um Diretor de Criação e Copywriter de classe mundial.

      CONTEXTO:
      Estamos criando uma campanha visual e textual para: "${productName}".
      Objetivo: "${objective}".

      SUA TAREFA:
      1. Escreva copies persuasivas usando gatilhos mentais.
      2. DESCREVA detalhadamente 1 ideia de imagem visual (Image Prompt) que complemente este texto. Essa descrição será usada por uma IA geradora de imagens (como Midjourney ou DALL-E), então deve ser rica em detalhes visuais, iluminação, estilo e composição.

      FORMATO DE SAÍDA (MARKDOWN):

      ## ⚡ Opções de Headline
      1. [Opção 1]
      2. [Opção 2]
      3. [Opção 3]

      ## 📝 Corpo do Anúncio
      [Texto persuasivo]

      ## 🎨 Briefing Visual (Prompt de Imagem)
      [Descreva a imagem em inglês (pois IAs de imagem entendem melhor). Ex: "Cinematic shot of...", "Hyper-realistic close up of...", descreva a luz, as cores, o cenário e a emoção.]
    `;

    const response = await this.aiProvider.generateText(prompt, { 
      temperature: 0.8,
      maxTokens: 2000 
    });

    // Log de Texto
    await this.prisma.aiLog.create({
      data: {
        userId: user.sub,
        workspaceId: member.workspaceId,
        provider: 'GEMINI',
        model: 'gemini-2.0-flash',
        type: 'COPY_GENERATION',
        inputTokens: response.usage.inputTokens,
        outputTokens: response.usage.outputTokens,
        totalTokens: response.usage.totalTokens,
      },
    });

    return { result: response.content };
  }

  // 👇 NOVO MÉTODO: Geração de Imagem Real
  async generateCampaignImage(imagePrompt: string, user: ActiveUserData) {
    const member = await this.prisma.workspaceMember.findFirst({
      where: { userId: user.sub },
      select: { workspaceId: true },
    });

    if (!member) throw new NotFoundException('Workspace não encontrado');

    // 1. Gera a imagem (Vem em Base64 puro)
    const base64Image = await this.aiProvider.generateImage(imagePrompt);
    
    // 2. Converte Base64 para Buffer
    const imageBuffer = Buffer.from(base64Image, 'base64');

    // 3. Upload para o R2 (S3) 🚀
    const fileName = `ai-gen-${Date.now()}.png`;
    const publicUrl = await this.storage.uploadFile(imageBuffer, fileName, 'image/png');

    // 4. Salva Log no Banco
    await this.prisma.aiLog.create({
      data: {
        userId: user.sub,
        workspaceId: member.workspaceId,
        provider: 'GOOGLE_IMAGEN',
        model: 'imagen-3.0-generate-001',
        type: 'IMAGE_GENERATION',
        inputTokens: imagePrompt.length,
        outputTokens: 1,
        totalTokens: imagePrompt.length + 1,
      },
    });

    // 5. Retorna a URL pública em vez do base64 gigante
    return { 
      message: 'Imagem gerada e salva com sucesso',
      imageUrl: publicUrl 
    };
  }

  // --- NOVO: GERA OPÇÕES ESTRATÉGICAS ---
  async generateStrategyOptions(campaignId: string, user: ActiveUserData) {
    const campaign = await this.prisma.campaign.findUnique({
      where: { id: campaignId },
    });

    if (!campaign) throw new NotFoundException('Campanha não encontrada');

    // Prompt de Engenharia Avançada para Marketing
    const prompt = `
      ATUE COMO: O maior estrategista de marketing digital do mundo.
      PRODUTO/SERVIÇO: "${campaign.name}"
      OBJETIVO: "${campaign.objective}"
      DESCRIÇÃO EXTRA: "${campaign.description || 'Nenhuma'}"

      TAREFA:
      Analise este produto e crie 3 ABORDAGENS ESTRATÉGICAS DISTINTAS (Personas/Ângulos) para uma campanha de anúncios.
      
      SAÍDA OBRIGATÓRIA: Apenas um ARRAY JSON puro (sem markdown, sem texto antes ou depois).
      Estrutura do JSON:
      [
        {
          "title": "Nome curto da estratégia (ex: Foco em Performance)",
          "targetAudience": "Descrição detalhada do público-alvo",
          "keyBenefits": "Lista de 3 benefícios chave focados nessa persona",
          "brandTone": "Tom de voz ideal (ex: Enérgico, Sério, Humorístico)",
          "reasoning": "Por que essa estratégia vai vender?"
        }
      ]
    `;

    const response = await this.aiProvider.generateText(prompt, { 
      temperature: 0.7, 
      maxTokens: 2000 
    });

    // Limpeza básica do JSON (caso a IA mande markdown ```json ... ```)
    const cleanJson = response.content.replace(/```json|```/g, '').trim();
    
    try {
      return JSON.parse(cleanJson);
    } catch (e) {
      // Fallback robusto se o JSON vier quebrado
      return { error: 'Falha ao gerar estratégias. Tente novamente.', raw: response.content };
    }
  }
}