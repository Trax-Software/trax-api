export interface AiGenerationOptions {
    temperature?: number;
    maxTokens?: number;
  }
  
  export interface AiProvider {
    /**
     * Gera um texto simples com base em um prompt.
     */
    generateText(prompt: string, options?: AiGenerationOptions): Promise<string>;
    
    /**
     * (Futuro) Gera uma imagem e retorna a URL.
     */
    // generateImage(prompt: string): Promise<string>;
  }
  
  // Token de Injeção de Dependência (para o NestJS saber o que injetar)
  export const AI_PROVIDER = 'AI_PROVIDER';