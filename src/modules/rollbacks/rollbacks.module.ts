import { Module } from '@nestjs/common';
import { RollbacksService } from './rollbacks.service';
import { RollbacksController } from './rollbacks.controller';
import { LedgerModule } from '../ledger/ledger.module';

@Module({
  imports: [LedgerModule],
  providers: [RollbacksService],
  controllers: [RollbacksController],
})
export class RollbacksModule {}