import { Module } from '@nestjs/common';
import { LedgerService } from './ledger.service';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [AuditModule],
  providers: [LedgerService],
  exports: [LedgerService],
})
export class LedgerModule {}