import { Controller, Post, Body, UseGuards, Get, Param, Req } from '@nestjs/common';
import { DisbursementsService } from './disbursements.service';
import { CreateDisbursementDto } from './dto/create-disbursement.dto';
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

@ApiTags('disbursements')
@ApiBearerAuth()
@Controller('disbursements')
@UseGuards(JwtAuthGuard, RolesGuard)
export class DisbursementsController {
  constructor(private service: DisbursementsService) {}

  @Post()
  @Roles('STAFF', 'ADMIN')
  @ApiOperation({ summary: 'Create a disbursement' })
  create(@Body() dto: CreateDisbursementDto, @Req() req) {
    return this.service.createDisbursement(dto, req.user?.username);
  }

  @Get()
  @Roles('STAFF', 'ADMIN')
  @ApiOperation({ summary: 'Get all disbursements' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  findAll() {
    return this.service.getAllDisbursements();
  }

  @Get(':id')
  @Roles('STAFF', 'ADMIN')
  @ApiOperation({ summary: 'Get disbursement by ID' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  getById(@Param('id') id: string) {
    return this.service.getDisbursementById(id);
  }

  @Post(':id/rollback')
  @Roles('STAFF', 'ADMIN')
  @ApiOperation({ summary: 'Rollback a disbursement' })
  @ApiCreatedResponse({ description: 'Disbursement rolled back' })
  @ApiBadRequestResponse({ description: 'Invalid input' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  rollbackDisbursement(@Param('id') id: string, @Req() req) {
    return this.service.rollbackDisbursement(id, req.user?.username);
  }
}