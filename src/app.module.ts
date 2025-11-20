import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuditModule } from './modules/audit/audit.module';
import { JwtModule } from './common/utils/jwt.module';

import { ClientsController } from './modules/clients/clients.controller';
import { ClientsService } from './modules/clients/clients.service';

import { DisbursementsController } from './modules/disbursements/disbursements.controller';
import { DisbursementsService } from './modules/disbursements/disbursements.service';

import { LoansController } from './modules/loans/loans.controller';
import { LoansService } from './modules/loans/loans.service';

import { LedgerController } from './modules/ledger/ledger.controller';
import { LedgerService } from './modules/ledger/ledger.service';

import { RepaymentsController } from './modules/repayments/repayments.controller';
import { RepaymentsService } from './modules/repayments/repayments.service';

import { RollbacksController } from './modules/rollbacks/rollbacks.controller';
import { RollbacksService } from './modules/rollbacks/rollbacks.service';

@Module({
  imports: [AuditModule, JwtModule],
  controllers: [
    AppController,
    ClientsController,
    DisbursementsController,
    LoansController,
    LedgerController,
    RepaymentsController,
    RollbacksController,
  ],
  providers: [
    AppService,
    ClientsService,
    DisbursementsService,
    LoansService,
    LedgerService,
    RepaymentsService,
    RollbacksService,
  ],
  exports: [],
})
export class AppModule {}
