import { Module } from '@nestjs/common';
import { RepaymentsService } from './repayments.service';
import { RepaymentsController } from './repayments.controller';
import { LedgerModule } from '../ledger/ledger.module';
@Module({
  imports: [LedgerModule],
  providers: [RepaymentsService],
  controllers: [RepaymentsController],
})
export class RepaymentsModule {}