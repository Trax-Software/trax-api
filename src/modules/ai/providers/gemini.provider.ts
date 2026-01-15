import { Injectable, InternalServerErrorException, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenerativeAI, GenerativeModel } from '@google/generative-ai';
import { AiProvider, AiGenerationOptions } from '../interfaces/ai-provider.interface';

@Injectable()
export class GeminiProvider implements AiProvider, OnModuleInit {
  private readonly logger = new Logger(GeminiProvider.name);
  private model: GenerativeModel;
  private readonly apiKey: string;

  constructor(private readonly configService: ConfigService) {
    this.apiKey = this.configService.getOrThrow<string>('GOOGLE_API_KEY');
    const genAI = new GoogleGenerativeAI(this.apiKey);
    
    // 🟢 MUDANÇA: Usando 'gemini-2.0-flash' que está na sua lista e é muito estável/gratuito
    this.model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
  }

  async onModuleInit() {
    this.logger.log('🔍 Validando conexão com Gemini...');
    try {
      // Teste rápido de listagem
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${this.apiKey}`);
      const data = await response.json();
      
      if (data.error) {
        this.logger.error('❌ Erro na chave de API:', data.error.message);
        return;
      }
      
      this.logger.log('✅ Conexão com Google AI estabelecida com sucesso.');
    } catch (error) {
      this.logger.error('Falha de conexão inicial.', error);
    }
  }

  async generateText(prompt: string, options?: AiGenerationOptions): Promise<string> {
    try {
      const result = await this.model.generateContent({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: options?.temperature ?? 0.7,
          maxOutputTokens: options?.maxTokens ?? 1000,
        },
      });

      const response = result.response;
      const text = response.text();

      if (!text) throw new Error('Gemini retornou resposta vazia.');

      return text;
    } catch (error: any) {
      // 🟢 CORREÇÃO DO LOG: Agora vamos ver a mensagem real
      console.error('🔴 ERRO REAL:', error.message || error);
      
      // Se for um erro de objeto complexo, tentamos extrair detalhes
      if (error.response) {
        console.error('Detalhes da API:', JSON.stringify(error.response, null, 2));
      }

      throw new InternalServerErrorException('Falha ao gerar conteúdo com IA.');
    }
  }
}