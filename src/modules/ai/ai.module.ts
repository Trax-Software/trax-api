import { Module } from '@nestjs/common';
import { AiController } from './ai.controller';
import { AiService } from './ai.service';
//import { OpenAiProvider } from './providers/openai.provider';
import { GeminiProvider } from './providers/gemini.provider';
import { AI_PROVIDER } from './interfaces/ai-provider.interface';

@Module({
  controllers: [AiController],
  providers: [
    AiService,
    {
      provide: AI_PROVIDER,
      //useClass: OpenAiProvider,
      useClass: GeminiProvider,
    },
  ],
  exports: [AiService], // Exportamos o Service, não o Provider
})
export class AiModule {}