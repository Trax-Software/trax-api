import { 
  Injectable, 
  NotFoundException, 
  ForbiddenException 
} from '@nestjs/common';
import { CampaignStatus } from '@prisma/client'; // ✅ Uso de Enum
import { PrismaService } from '../../database/prisma.service';
import { CreateCampaignDto } from './dto/create-campaign.dto';
import { UpdateCampaignDto } from './dto/update-campaign.dto';
import { ActiveUserData } from '../iam/authentication/decorators/active-user.decorator';

@Injectable()
export class CampaignsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createCampaignDto: CreateCampaignDto, user: ActiveUserData) {
    const memberRecord = await this.prisma.workspaceMember.findFirst({
      where: { userId: user.sub },
      select: { workspaceId: true },
    });

    if (!memberRecord) {
      throw new NotFoundException('Usuário não pertence a nenhum workspace');
    }

    return this.prisma.campaign.create({
      data: {
        ...createCampaignDto,
        workspaceId: memberRecord.workspaceId,
        createdBy: user.sub,
        status: CampaignStatus.DRAFT, // ✅ Enum
      },
    });
  }

  async findAll(user: ActiveUserData) {
    return this.prisma.campaign.findMany({
      where: {
        workspace: {
          members: { some: { userId: user.sub } },
        },
      },
      orderBy: { createdAt: 'desc' },
      include: {
        _count: { select: { adCreatives: true } }
      }
    });
  }
  
  async findOne(id: string, user: ActiveUserData) {
    const campaign = await this.prisma.campaign.findFirst({
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

  // --- UPDATE OTIMIZADO ---
  async update(id: string, updateDto: UpdateCampaignDto, user: ActiveUserData) {
    // 1. Busca IDs dos workspaces do usuário (Cacheável futuramente)
    const userWorkspaces = await this.prisma.workspaceMember.findMany({
      where: { userId: user.sub },
      select: { workspaceId: true }
    });
    
    if (!userWorkspaces.length) throw new ForbiddenException('Usuário sem workspace');
    
    const workspaceIds = userWorkspaces.map(w => w.workspaceId);

    // 2. Tenta atualizar direto com filtro de segurança
    try {
      const updatedCampaign = await this.prisma.campaign.update({
        where: { 
          id,
          workspaceId: { in: workspaceIds } // 🔒 Segurança: Só atualiza se for dos workspaces dele
        },
        data: {
          ...updateDto,
          status: CampaignStatus.WAITING_APPROVAL, // ✅ Enum: Avança o status
        },
      });
      
      return updatedCampaign;

    } catch (error) {
      // Se o Prisma não achar o registro (por ID errado ou Workspace errado), lança erro
      throw new NotFoundException('Campanha não encontrada ou acesso negado.');
    }
  }
}