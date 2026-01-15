import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateCampaignDto } from './dto/create-campaign.dto';
import { ActiveUserData } from '../iam/authentication/decorators/active-user.decorator';

@Injectable()
export class CampaignsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createCampaignDto: CreateCampaignDto, user: ActiveUserData) {
    // 1. Descobrir qual Workspace o usuário pertence
    const memberRecord = await this.prisma.workspaceMember.findFirst({
      where: { userId: user.sub },
      select: { workspaceId: true },
    });

    if (!memberRecord) {
      throw new NotFoundException('Usuário não pertence a nenhum workspace');
    }

    // 2. Criar a campanha vinculada ao Workspace encontrado
    return this.prisma.campaign.create({
      data: {
        ...createCampaignDto,
        workspaceId: memberRecord.workspaceId,
        createdBy: user.sub,
      },
    });
  }

  async findAll(user: ActiveUserData) {
    return this.prisma.campaign.findMany({
      where: {
        workspace: {
          members: {
            some: { userId: user.sub }, // Apenas campanhas dos meus workspaces
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}