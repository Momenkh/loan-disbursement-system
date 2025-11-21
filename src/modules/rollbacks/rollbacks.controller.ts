import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { RollbacksService } from './rollbacks.service';
import { RollbackTransactionDto } from './dto/rollback-transaction.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/guards/roles.decorator';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiCreatedResponse,
  ApiBadRequestResponse,
  ApiUnauthorizedResponse,
  ApiBody,
} from '@nestjs/swagger';

@ApiTags('rollbacks')
@ApiBearerAuth()
@Controller('rollbacks')
export class RollbacksController {
  constructor(private readonly service: RollbacksService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Rollback a transaction' })
  @ApiCreatedResponse({ description: 'Rollback recorded', type: RollbackTransactionDto })
  @ApiBadRequestResponse({ description: 'Invalid input' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiBody({ type: RollbackTransactionDto })
  async rollback(@Body() dto: RollbackTransactionDto) {
    return this.service.rollbackTransaction(dto);
  }
}