import { 
  Injectable, 
  NotFoundException, 
  ForbiddenException 
} from '@nestjs/common';
import { CampaignStatus } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { CreateCampaignDto } from './dto/create-campaign.dto';
import { UpdateCampaignDto } from './dto/update-campaign.dto';
import { ActiveUserData } from '../iam/authentication/decorators/active-user.decorator';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class CampaignsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  // Helper privado para validar acesso ao workspace
  private async validateUserAccess(user: ActiveUserData, campaignId?: string) {
    const members = await this.prisma.extended.workspaceMember.findMany({
      where: { userId: user.sub },
      select: { workspaceId: true },
    });
    
    if (!members.length) throw new ForbiddenException('Usuário sem workspace.');
    const workspaceIds = members.map(m => m.workspaceId);

    if (campaignId) {
      const campaign = await this.prisma.extended.campaign.findFirst({
        where: { id: campaignId, workspaceId: { in: workspaceIds } }
      });
      if (!campaign) throw new NotFoundException('Campanha não encontrada ou acesso negado.');
      return campaign;
    }

    return workspaceIds; // Retorna lista de IDs permitidos para criação/listagem
  }

  async create(createCampaignDto: CreateCampaignDto, user: ActiveUserData) {
    const workspaceIds = await this.validateUserAccess(user);
    const targetWorkspaceId = Array.isArray(workspaceIds) ? workspaceIds[0] : null;

    if (!targetWorkspaceId) throw new ForbiddenException('Workspace inválido');

    const data: any = {
      ...createCampaignDto,
      workspaceId: targetWorkspaceId,
      createdBy: user.sub,
      status: CampaignStatus.DRAFT,
    };

    if (data.offerDeadline && typeof data.offerDeadline === 'string' && data.offerDeadline.length === 10) {
      data.offerDeadline = new Date(data.offerDeadline).toISOString();
    } else if (data.offerDeadline === "") {
      data.offerDeadline = null;
    }

    const campaign = await this.prisma.extended.campaign.create({ data });

    // 📝 LOG: Criação
    await this.audit.log({
      entityType: 'CAMPAIGN',
      entityId: campaign.id,
      action: 'CREATE',
      userId: user.sub,
      workspaceId: targetWorkspaceId,
      newData: campaign,
    });

    return campaign;
  }

  async findAll(user: ActiveUserData) {
    const workspaceIds = await this.validateUserAccess(user);
    return this.prisma.extended.campaign.findMany({
      where: {
        workspaceId: { in: workspaceIds as string[] },
      },
      orderBy: { createdAt: 'desc' },
      include: {
        _count: { select: { adCreatives: true } }
      }
    });
  }
  
  async findOne(id: string, user: ActiveUserData) {
    const campaign = await this.prisma.extended.campaign.findFirst({
      where: {
        id,
        workspace: { members: { some: { userId: user.sub } } },
      },
      include: {
        adCreatives: true,
      },
    });

    if (!campaign) throw new NotFoundException('Campanha não encontrada');
    return campaign;
  }

  async update(id: string, updateDto: UpdateCampaignDto, user: ActiveUserData) {
    const oldCampaign = await this.validateUserAccess(user, id);

    const data: any = { ...updateDto };

    if (data.offerDeadline && typeof data.offerDeadline === 'string' && data.offerDeadline.length === 10) {
      data.offerDeadline = new Date(data.offerDeadline).toISOString();
    } else if (data.offerDeadline === "") {
      data.offerDeadline = null;
    }

    const updatedCampaign = await this.prisma.extended.campaign.update({
      where: { id },
      data,
    });

    // 📝 LOG: Atualização
    await this.audit.log({
      entityType: 'CAMPAIGN',
      entityId: id,
      action: 'UPDATE',
      userId: user.sub,
      workspaceId: updatedCampaign.workspaceId,
      oldData: oldCampaign,
      newData: updatedCampaign,
    });

    return updatedCampaign;
  }

  async remove(id: string, user: ActiveUserData) {
    const campaign: any = await this.validateUserAccess(user, id);

    const result = await this.prisma.extended.campaign.delete({
      where: { id },
    });

    // 📝 LOG: Remoção (Soft Delete)
    await this.audit.log({
      entityType: 'CAMPAIGN',
      entityId: id,
      action: 'DELETE',
      userId: user.sub,
      workspaceId: campaign.workspaceId,
      oldData: campaign,
    });

    return result;
  }
}