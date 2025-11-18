import { Injectable, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class AuditService {
  private prisma = new PrismaClient();
  private logger = new Logger(AuditService.name);

  async logTransaction(
    transactionId: string,
    operation: string,
    userId?: string,
    metadata?: any,
  ) {
    const log = await this.prisma.auditLog.create({
      data: {
        transactionId,
        operation,
        userId,
        metadata,
      },
    });

    this.logger.debug({
      timestamp: new Date().toISOString(),
      level: 'debug',
      service: operation,
      transactionId,
      userId,
      metadata,
    });

    return log;
  }
}