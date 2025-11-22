import { BadRequestException, NotFoundException } from '@nestjs/common';
import { LoansService } from './loans.service';
import { CreateLoanDto } from './dto/create-loan.dto';
import { LoanStatus } from '@prisma/client';

describe('LoansService', () => {
  let service: LoansService;

  beforeEach(() => {
    service = new LoansService({} as any);
  });

  it('create() should call prisma.loan.create and return result', async () => {
    const dto: CreateLoanDto = { clientId: 'c1', type: 'personal', amount: 1000, interestRate: 10, tenor: 12 };
    const created = { id: 'loan1', ...dto, status: LoanStatus.PENDING };
    const mockPrisma: any = { loan: { create: jest.fn().mockResolvedValue(created) } };
    (service as any).prisma = mockPrisma;

    const res = await service.create(dto);
    expect(mockPrisma.loan.create).toHaveBeenCalledWith({ data: { ...dto, status: LoanStatus.PENDING } });
    expect(res).toEqual(created);
  });

  it('findOne should throw when not found', async () => {
    (service as any).prisma = { loan: { findUnique: jest.fn().mockResolvedValue(null) } };
    await expect(service.findOne('nope')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('update should call findOne then update', async () => {
    const loan = { id: 'lu1' };
    (service as any).prisma = { loan: { findUnique: jest.fn().mockResolvedValue(loan), update: jest.fn().mockResolvedValue({ id: 'lu1' }) } };
    const res = await service.update('lu1', { amount: 200 } as any);
    expect(res).toHaveProperty('id', 'lu1');
  });

  it('submitForApproval should throw when status not PENDING and succeed when PENDING', async () => {
    (service as any).prisma = { loan: { findUnique: jest.fn().mockResolvedValue({ id: 'l2', status: 'APPROVED' }) } };
    await expect(service.submitForApproval('l2')).rejects.toBeInstanceOf(BadRequestException);

    (service as any).prisma = { loan: { findUnique: jest.fn().mockResolvedValue({ id: 'l3', status: 'PENDING' }), update: jest.fn().mockResolvedValue({ id: 'l3', status: 'APPROVED' }) } };
    const out = await service.submitForApproval('l3');
    expect(out).toHaveProperty('id', 'l3');
  });

  it('approveOrReject should throw when loan not in APPROVED and succeed when APPROVED', async () => {
    (service as any).prisma = { loan: { findUnique: jest.fn().mockResolvedValue({ id: 'l4', status: 'PENDING' }) } };
    await expect(service.approveOrReject('l4', { status: 'APPROVED' } as any)).rejects.toBeInstanceOf(BadRequestException);

    (service as any).prisma = { loan: { findUnique: jest.fn().mockResolvedValue({ id: 'l5', status: 'APPROVED' }), update: jest.fn().mockResolvedValue({ id: 'l5', status: 'CLOSED' }) } };
    const out = await service.approveOrReject('l5', { status: 'CLOSED' } as any);
    expect(out).toHaveProperty('id', 'l5');
  });

  it('getAuditTrail should throw when loan missing and return logs when present', async () => {
    (service as any).prisma = { loan: { findUnique: jest.fn().mockResolvedValue(null) } };
    await expect(service.getAuditTrail('x')).rejects.toBeInstanceOf(BadRequestException);

    const logs = [{ id: 'a1' }];
    (service as any).prisma = { loan: { findUnique: jest.fn().mockResolvedValue({ id: 'l6' }) }, auditLog: { findMany: jest.fn().mockResolvedValue(logs) } };
    const out = await service.getAuditTrail('l6');
    expect(out).toEqual(logs);
  });

  it('submitForApproval should throw BadRequestException when not pending', async () => {
    const mockPrisma: any = { loan: { findUnique: jest.fn().mockResolvedValue({ id: 'l1', status: LoanStatus.APPROVED }) } };
    (service as any).prisma = mockPrisma;
    await expect(service.submitForApproval('l1')).rejects.toBeInstanceOf(BadRequestException);
  });

  it('submitForApproval should update status when draft', async () => {
    const mockPrisma: any = {
      loan: {
        findUnique: jest.fn().mockResolvedValue({ id: 'l1', status: LoanStatus.PENDING }),
        update: jest.fn().mockResolvedValue({ id: 'l1', status: LoanStatus.APPROVED }),
      },
    };
    (service as any).prisma = mockPrisma;
    const res = await service.submitForApproval('l1');
    expect(mockPrisma.loan.update).toHaveBeenCalledWith({ where: { id: 'l1' }, data: { status: LoanStatus.APPROVED } });
    expect(res).toEqual({ id: 'l1', status: LoanStatus.APPROVED });
  });

  it('approveOrReject should throw if loan not approved', async () => {
    const mockPrisma: any = { loan: { findUnique: jest.fn().mockResolvedValue({ id: 'l1', status: LoanStatus.PENDING }) } };
    (service as any).prisma = mockPrisma;
    await expect(service.approveOrReject('l1', { status: LoanStatus.APPROVED as any })).rejects.toBeInstanceOf(BadRequestException);
  });

  it('approveOrReject should update status when submitted', async () => {
    const mockPrisma: any = {
      loan: {
        findUnique: jest.fn().mockResolvedValue({ id: 'l1', status: LoanStatus.APPROVED }),
        update: jest.fn().mockResolvedValue({ id: 'l1', status: LoanStatus.APPROVED }),
      },
    };
    (service as any).prisma = mockPrisma;
    const res = await service.approveOrReject('l1', { status: LoanStatus.APPROVED as any });
    expect(mockPrisma.loan.update).toHaveBeenCalledWith({ where: { id: 'l1' }, data: { status: LoanStatus.APPROVED } });
    expect(res).toEqual({ id: 'l1', status: LoanStatus.APPROVED });
  });
});
