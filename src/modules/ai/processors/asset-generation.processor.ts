import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger } from '@nestjs/common';
import { AiService } from '../ai.service';
import { PrismaService } from '../../../database/prisma.service';
import { CampaignStatus } from '@prisma/client';

/**
 * Processador de segundo plano para geração de ativos de IA.
 * Utiliza BullMQ para garantir resiliência e retentativas automáticas.
 */
@Processor('asset-generation')
export class AssetGenerationProcessor extends WorkerHost {
  private readonly logger = new Logger(AssetGenerationProcessor.name);

  constructor(
    private readonly aiService: AiService,
    private readonly prisma: PrismaService,
  ) {
    super();
  }

  /**
   * Lógica principal de processamento do Job.
   * @param job Dados contendo campaignId, prompt e metadados do usuário.
   */
  async process(job: Job<any, any, string>): Promise<any> {
    const { campaignId, prompt, user, type } = job.data;
    
    this.logger.log(`🚀 [Job ${job.id}] Iniciando geração ${type} para Campanha: ${campaignId}`);

    try {
      if (type === 'IMAGE') {
        const result = await this.aiService.generateCampaignImage(prompt, user);
        
        // Persistência do criativo gerado
        // Nota: Usamos 'this.prisma.extended' para respeitar a lógica de auditoria global
        await this.prisma.extended.adCreative.create({
          data: {
            name: `Variação IA - ${new Date().toLocaleDateString()}`,
            imageUrl: result.imageUrl,
            aiModel: 'imagen-4.0',
            campaignId: campaignId,
          }
        });
      }

      // Atualização atômica do status da campanha
      await this.prisma.extended.campaign.update({
        where: { id: campaignId },
        data: { status: CampaignStatus.COMPLETED },
      });

      return { status: 'success', campaignId };
    } catch (error: unknown) {
      // 🛡️ Type Guard para resolver o erro ts(18046)
      const errorMessage = error instanceof Error ? error.message : 'Erro interno desconhecido';
      const errorStack = error instanceof Error ? error.stack : '';

      this.logger.error(
        `❌ [Job ${job.id}] Falha crítica: ${errorMessage}`,
        errorStack
      );

      // Relançamos o erro para que o BullMQ acione as estratégias de 'backoff' e retry configuradas
      throw error;
    }
  }

  @OnWorkerEvent('completed')
  onCompleted(job: Job) {
    this.logger.log(`✅ [Job ${job.id}] Finalizado com sucesso.`);
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job, error: Error) {
    // Este evento é disparado quando o Job esgota todas as tentativas de retry
    this.logger.error(
      `🚨 [Job ${job.id}] Falhou permanentemente após retentativas. Motivo: ${error.message}`
    );
  }
}