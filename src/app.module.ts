import { Module } from '@nestjs/common';
import { AuditModule } from './modules/audit/audit.module';
import { AuthModule } from './modules/auth/auth.module';
import { LoansModule } from './modules/loans/loans.module';
import { RepaymentsModule } from './modules/repayments/repayments-module';
import { RollbacksModule } from './modules/rollbacks/rollbacks.module';
import { ClientsModule } from './modules/clients/clients.module';
import { DisbursementsModule } from './modules/disbursements/disbursements.module';
import { LedgerModule } from './modules/ledger/ledger.module';
import { PrismaModule } from './prisma/prisma.module';
import { HealthController } from './modules/health/health.controller';
import { HealthService } from './modules/health/health.service';

@Module({
  imports: [PrismaModule, AuditModule, AuthModule, LoansModule, RepaymentsModule, RollbacksModule, ClientsModule, DisbursementsModule, LedgerModule],
  controllers: [HealthController],
  providers: [HealthService],
  exports: [],
})
export class AppModule {}
