import { Controller, Get, Post, Patch, Param, Body, UseGuards } from '@nestjs/common';
import { LoansService } from './loans.service';
import { CreateLoanDto } from './dto/create-loan.dto';
import { UpdateLoanDto } from './dto/update-loan.dto';
import { ApproveLoanDto } from './dto/approve-loan.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { Roles } from '../../common/guards/roles.decorator';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiBadRequestResponse,
  ApiUnauthorizedResponse,
  ApiNotFoundResponse,
  ApiParam,
  ApiBody,
} from '@nestjs/swagger';

@ApiTags('loans')
@ApiBearerAuth()
@Controller('loans')
@UseGuards(JwtAuthGuard)
export class LoansController {
  constructor(private readonly service: LoansService) {}

  @Post()
  @Roles('STAFF', 'ADMIN')
  @ApiOperation({ summary: 'Create a loan' })
  @ApiCreatedResponse({ description: 'Loan created', type: CreateLoanDto })
  @ApiBadRequestResponse({ description: 'Invalid input' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiBody({ type: CreateLoanDto })
  create(@Body() dto: CreateLoanDto) {
    return this.service.create(dto);
  }

  @Get()
  @Roles('STAFF', 'ADMIN')
  @ApiOperation({ summary: 'List loans' })
  @ApiOkResponse({ description: 'List returned' })
  findAll() {
    return this.service.findAll();
  }

  @Get(':id')
  @Roles('STAFF', 'ADMIN')
  @ApiOperation({ summary: 'Get loan by id' })
  @ApiOkResponse({ description: 'Loan returned' })
  @ApiNotFoundResponse({ description: 'Loan not found' })
  @ApiParam({ name: 'id', description: 'Loan id' })
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Patch(':id')
  @Roles('STAFF', 'ADMIN')
  @ApiOperation({ summary: 'Update loan' })
  @ApiOkResponse({ description: 'Loan updated' })
  @ApiBadRequestResponse({ description: 'Invalid input' })
  @ApiParam({ name: 'id', description: 'Loan id' })
  update(@Param('id') id: string, @Body() dto: UpdateLoanDto) {
    return this.service.update(id, dto);
  }

  @Patch(':id/approve')
  @Roles('CEO', 'ADMIN')
  @ApiOperation({ summary: 'Approve or reject loan' })
  @ApiOkResponse({ description: 'Loan approved or rejected' })
  @ApiBadRequestResponse({ description: 'Invalid input' })
  @ApiParam({ name: 'id', description: 'Loan id' })
  @ApiBody({ type: ApproveLoanDto })
  approve(@Param('id') id: string, @Body() dto: ApproveLoanDto) {
    return this.service.approveOrReject(id, dto);
  }

  @Get(':id/audit-trail')
  @Roles('STAFF', 'ADMIN')
  @ApiOperation({ summary: 'Get complete audit log for a loan' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  async getAuditTrail(@Param('id') loanId: string) {
    return this.service.getAuditTrail(loanId);
  }

}