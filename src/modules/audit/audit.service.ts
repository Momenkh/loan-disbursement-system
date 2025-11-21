import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async logTransaction(transactionId: string, operation: string, userId?: string, metadata?: any) {

    console.log('Logging transaction:', { transactionId, operation, userId, metadata });
    if(transactionId && metadata){
      return this.prisma.auditLog.create({
        data: { transactionId, operation, userId, metadata },
      });
    }
    return null;
  }
}