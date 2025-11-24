import { BadRequestException, NotFoundException } from '@nestjs/common';
import { LoansService } from './loans.service';
import { CreateLoanDto } from './dto/create-loan.dto';
import { LoanStatus, DisbursementStatus } from '@prisma/client';

describe('LoansService', () => {
  let service: LoansService;

  beforeEach(() => {
    service = new LoansService({} as any);
  });

  it('transformLoan should return null for falsy input and convert decimals', () => {
    const t: any = (service as any).transformLoan(null);
    expect(t).toBeNull();

    const loan = { id: 'l1', amount: '1000', interestRate: '5', tenor: 12, numberOfInstallments: 12 } as any;
    const out = (service as any).transformLoan(loan);
    expect(typeof out.amount).toBe('number');
    expect(typeof out.interestRate).toBe('number');
  });

  it('create should use prisma.$transaction to create loan and disbursement', async () => {
    const dto: CreateLoanDto = { clientId: 'c1', numberOfInstallments: 12, amount: 1000, interestRate: 5, tenor: 12 } as any;

    const createdLoan = { id: 'loan1', ...dto, status: LoanStatus.PENDING } as any;

    const mockTx: any = {
      loan: { create: jest.fn().mockResolvedValue(createdLoan) },
      disbursement: { create: jest.fn().mockResolvedValue({ id: 'd1' }) },
    };

    (service as any).prisma = { $transaction: jest.fn().mockImplementation(async (cb: any) => cb(mockTx)) } as any;

    const res = await service.create(dto);
    expect(res).toHaveProperty('id', 'loan1');
    expect(mockTx.loan.create).toHaveBeenCalled();
    expect(mockTx.disbursement.create).toHaveBeenCalled();
  });

  it('findOne should throw when loan missing and return transformed loan when present', async () => {
    (service as any).prisma = { loan: { findUnique: jest.fn().mockResolvedValue(null) } };
    await expect(service.findOne('nope')).rejects.toBeInstanceOf(NotFoundException);

    const loan = { id: 'l2', amount: '1000', interestRate: '5', tenor: 12, numberOfInstallments: 12, client: {} } as any;
    (service as any).prisma = { loan: { findUnique: jest.fn().mockResolvedValue(loan) } };
    const out = await service.findOne('l2');
    expect(out).toHaveProperty('id', 'l2');
    expect(typeof out.amount).toBe('number');
  });

  it('update should throw when loan not pending and update when pending', async () => {
    const loanNotPending = { id: 'l3', status: LoanStatus.APPROVED } as any;
    (service as any).prisma = { loan: { findUnique: jest.fn().mockResolvedValue(loanNotPending) } };
    await expect(service.update('l3', { amount: 200 } as any)).rejects.toBeInstanceOf(BadRequestException);

    const loanPending = { id: 'l4', status: LoanStatus.PENDING } as any;
    const updated = { id: 'l4', status: LoanStatus.PENDING, amount: 200 } as any;
    (service as any).prisma = { loan: { findUnique: jest.fn().mockResolvedValue(loanPending), update: jest.fn().mockResolvedValue(updated) } };
    const out = await service.update('l4', { amount: 200 } as any);
    expect(out).toHaveProperty('amount');
  });

  it('approveOrReject should only allow pending loans to be changed', async () => {
    (service as any).prisma = { loan: { findUnique: jest.fn().mockResolvedValue({ id: 'l5', status: LoanStatus.ACTIVE }) } };
    await expect(service.approveOrReject('l5', { status: LoanStatus.CLOSED } as any)).rejects.toBeInstanceOf(BadRequestException);

    (service as any).prisma = { loan: { findUnique: jest.fn().mockResolvedValue({ id: 'l6', status: LoanStatus.PENDING }), update: jest.fn().mockResolvedValue({ id: 'l6', status: LoanStatus.CLOSED }) } };
    const out = await service.approveOrReject('l6', { status: LoanStatus.CLOSED } as any);
    expect(out).toHaveProperty('id', 'l6');
  });

  it('getAuditTrail should throw when loan missing and return logs when present', async () => {
    (service as any).prisma = { loan: { findUnique: jest.fn().mockResolvedValue(null) } };
    await expect(service.getAuditTrail('x')).rejects.toBeInstanceOf(BadRequestException);

    const logs = [{ id: 'a1' }];
    (service as any).prisma = { loan: { findUnique: jest.fn().mockResolvedValue({ id: 'l6' }) }, auditLog: { findMany: jest.fn().mockResolvedValue(logs) } };
    const out = await service.getAuditTrail('l6');
    expect(out).toEqual(logs);
  });
});
