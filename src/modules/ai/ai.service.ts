import { Inject, Injectable } from '@nestjs/common';
import { AI_PROVIDER, AiProvider } from './interfaces/ai-provider.interface';

@Injectable()
export class AiService {
  constructor(
    @Inject(AI_PROVIDER) private readonly aiProvider: AiProvider,
  ) {}

  /**
   * Gera sugestões de copy para uma campanha
   */
  async generateCampaignCopy(productName: string, objective: string): Promise<string> {
    // Prompt Engineering Básico (Futuramente moveremos para arquivos de template)
    const prompt = `
      Atue como um especialista em Marketing Digital de classe mundial.
      Crie 3 opções de headline (título) e 1 corpo de anúncio curto para o produto: "${productName}".
      Objetivo da campanha: ${objective}.
      
      Formato de saída:
      Use Markdown. Seja persuasivo e direto.
    `;

    return this.aiProvider.generateText(prompt, { temperature: 0.8 });
  }
}