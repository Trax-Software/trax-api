import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { AiController } from './ai.controller';
import { AiService } from './ai.service';
import { GeminiProvider } from './providers/gemini.provider';
import { AI_PROVIDER } from './interfaces/ai-provider.interface';
import { AssetGenerationProcessor } from './processors/asset-generation.processor';
import { ConfigModule, ConfigService } from '@nestjs/config';

@Module({
  imports: [
    // Configuração global do BullMQ conectando ao Redis
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        connection: {
          host: config.get('REDIS_HOST'),
          port: config.get('REDIS_PORT'),
        },
      }),
    }),
    // Registro da fila específica de geração de assets
    BullModule.registerQueue({
      name: 'asset-generation',
    }),
  ],
  controllers: [AiController],
  providers: [
    AiService,
    AssetGenerationProcessor, // O Worker que processará a IA
    {
      provide: AI_PROVIDER,
      useClass: GeminiProvider,
    },
  ],
  exports: [AiService],
})
export class AiModule {}