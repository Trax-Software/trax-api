import { Body, Controller, Post, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
//import { AiController as BaseAiController } from './ai.controller.original'; // Apenas referência
import { GenerateImageDto } from './dto/generate-image.dto';
import { ActiveUser, ActiveUserData } from '../iam/authentication/decorators/active-user.decorator';
import { JwtAuthGuard } from '../iam/authentication/guards/jwt-auth.guard';

@Controller('ai')
export class AiController {
  constructor(
    @InjectQueue('asset-generation') private readonly assetQueue: Queue,
  ) {}

  @Post('generate-image')
@UseGuards(JwtAuthGuard)
@HttpCode(HttpStatus.ACCEPTED)
async generateImage(
  @Body() dto: GenerateImageDto,
  @ActiveUser() user: ActiveUserData,
) {
  // Verificamos se a campanha existe antes de sujar a fila (Opcional, mas recomendado para UX)
  // this.campaignsService.findOne(dto.campaignId, user); 

  const job = await this.assetQueue.add('generate-image-job', {
    prompt: dto.prompt,
    campaignId: dto.campaignId, // 🔑 Garantindo que o ID vai para o BullMQ
    user,
    type: 'IMAGE',
  }, {
    jobId: `img-gen-${dto.campaignId}-${Date.now()}`, // JobId determinístico para rastreio
    attempts: 3,
    backoff: { type: 'exponential', delay: 5000 },
  });

  return { jobId: job.id, status: 'queued' };
}
  
}