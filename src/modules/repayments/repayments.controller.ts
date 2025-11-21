import { Controller, Post, Body, UseGuards, Get, Param, ParseIntPipe } from '@nestjs/common';
import { RepaymentsService } from './repayments.service';
import { CreateRepaymentDto } from './dto/create-repayment.dto';
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

@ApiTags('repayments')
@ApiBearerAuth()
@Controller('repayments')
export class RepaymentsController {
  constructor(private readonly service: RepaymentsService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('STAFF', 'ADMIN')
  @ApiOperation({ summary: 'Create a repayment' })
  @ApiCreatedResponse({ description: 'Repayment created', type: CreateRepaymentDto })
  @ApiBadRequestResponse({ description: 'Invalid input' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiBody({ type: CreateRepaymentDto })
  async create(@Body() dto: CreateRepaymentDto) {
    return this.service.createRepayment(dto);
  }

  @Get(':loanId/history')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('STAFF', 'ADMIN')
  @ApiOperation({ summary: 'Get payment history for a loan' })
  async history(@Param('loanId') loanId: string) {
    return this.service.getPaymentHistory(loanId);
  }

  @Get(':loanId/schedule')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('STAFF', 'ADMIN')
  @ApiOperation({ summary: 'Get repayment schedule for a loan' })
  async schedule(@Param('loanId') loanId: string) {
    return this.service.getRepaymentSchedule(loanId);
  }

  @Get(':loanId/calculate')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('STAFF', 'ADMIN')
  @ApiOperation({ summary: 'Calculate current dues for a loan' })
  async calculate(@Param('loanId') loanId: string) {
    return this.service.calculateCurrentDues(loanId);
  }
}
