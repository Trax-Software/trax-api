import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

export interface AuditLogOptions {
  entityType: string;
  entityId: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE';
  userId: string;
  workspaceId: string;
  oldData?: any;
  newData?: any;
}

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Registra uma ação no log de auditoria.
   */
  async log(options: AuditLogOptions) {
    return this.prisma.extended.auditLog.create({
      data: {
        entityType: options.entityType,
        entityId: options.entityId,
        action: options.action,
        userId: options.userId,
        workspaceId: options.workspaceId,
        oldData: options.oldData || undefined,
        newData: options.newData || undefined,
      },
    });
  }
}
