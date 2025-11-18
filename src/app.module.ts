import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuditService } from './modules/audit/audit.service';


@Module({
  imports: [],
  controllers: [AppController],
  providers: [AppService, AuditService],
  exports: [AuditService],
})
export class AppModule {}
