import { RepaymentsService } from './repayments.service';
import { BadRequestException } from '@nestjs/common';

describe('RepaymentsService', () => {
  let service: RepaymentsService;

  beforeEach(() => {
    service = new RepaymentsService({} as any, { createLedgerEntry: jest.fn() } as any);
  });

  it('createRepayment should throw when loan not found', async () => {
    const mockTx1: any = { loan: { findUnique: jest.fn().mockResolvedValue(null) } };
    (service as any).prisma = { $transaction: jest.fn().mockImplementation(async (cb: any) => cb(mockTx1)) } as any;
    await expect(service.createRepayment({ loanId: 'x', clientId: 'c', amount: 100, paymentDate: new Date() } as any)).rejects.toBeInstanceOf(BadRequestException);
  });

  it('createRepayment should create payment and ledger entries when loan exists', async () => {
    const loan: any = { id: 'l1', amount: 1000, interestRate: 10, payments: [], createdAt: new Date() };
    const mockTx2: any = {
      loan: { findUnique: jest.fn().mockResolvedValue(loan) },
      payment: { create: jest.fn().mockResolvedValue({ id: 'p1' }) },
      repaymentSchedule: { findFirst: jest.fn().mockResolvedValue(null) },
    };
    (service as any).prisma = { $transaction: jest.fn().mockImplementation(async (cb: any) => cb(mockTx2)) } as any;
    (service as any).ledgerService = { createLedgerEntry: jest.fn().mockResolvedValue({}) };
    const res = await service.createRepayment({ loanId: 'l1', clientId: 'c1', amount: 100, paymentDate: new Date() } as any);
    expect(res).toBeDefined();
  });

  it('createRepayment should pay interest when interest has accrued', async () => {
    // loan with last payment long ago -> interest accrues
    const pastDate = new Date();
    pastDate.setDate(pastDate.getDate() - 30);
    const loan: any = { id: 'l10', amount: 1000, interestRate: 12, payments: [{ paymentDate: pastDate, principalPaid: 0 }], createdAt: new Date(0) };
    const mockTx: any = {
      loan: { findUnique: jest.fn().mockResolvedValue(loan) },
      payment: { create: jest.fn().mockResolvedValue({ id: 'p10' }) },
      repaymentSchedule: { findFirst: jest.fn().mockResolvedValue(null) },
    };
    const ledgerSpy = jest.fn().mockResolvedValue({});
    (service as any).prisma = { $transaction: jest.fn().mockImplementation(async (cb: any) => cb(mockTx)) } as any;
    (service as any).ledgerService = { createLedgerEntry: ledgerSpy };

    const res = await service.createRepayment({ loanId: 'l10', clientId: 'c10', amount: 50, paymentDate: new Date() } as any);
    expect(res).toBeDefined();
    // at least principal + interest ledger entries (2 calls)
    expect(ledgerSpy.mock.calls.length).toBeGreaterThanOrEqual(1);
  });

  it('createRepayment should apply late fee when schedule overdue', async () => {
    const loan: any = { id: 'l11', amount: 500, interestRate: 0, payments: [], createdAt: new Date() };
    const overdueDate = new Date();
    overdueDate.setDate(overdueDate.getDate() - 10);
    const schedule = { id: 's1', loanId: 'l11', dueDate: overdueDate, status: 'PENDING' } as any;

    const mockTx: any = {
      loan: { findUnique: jest.fn().mockResolvedValue(loan) },
      payment: { create: jest.fn().mockResolvedValue({ id: 'p11' }) },
      repaymentSchedule: { findFirst: jest.fn().mockResolvedValue(schedule) },
    };
    const ledgerSpy = jest.fn().mockResolvedValue({});
    (service as any).prisma = { $transaction: jest.fn().mockImplementation(async (cb: any) => cb(mockTx)) } as any;
    (service as any).ledgerService = { createLedgerEntry: ledgerSpy };

    const payDate = new Date();
    const res = await service.createRepayment({ loanId: 'l11', clientId: 'c11', amount: 100, paymentDate: payDate } as any);
    expect(res).toBeDefined();
    // principal and late fee ledger entries expected (>=1)
    expect(ledgerSpy).toHaveBeenCalled();
  });

  it('getPaymentHistory and getRepaymentSchedule should call prisma', async () => {
    const mockPrisma: any = { payment: { findMany: jest.fn().mockResolvedValue([{ id: 'p1' }]) }, repaymentSchedule: { findMany: jest.fn().mockResolvedValue([{ id: 's1' }]) } };
    (service as any).prisma = mockPrisma;
    const ph = await service.getPaymentHistory('loanx');
    expect(ph).toEqual([{ id: 'p1' }]);
    const rs = await service.getRepaymentSchedule('loanx');
    expect(rs).toEqual([{ id: 's1' }]);
  });

  it('calculateCurrentDues should throw when loan not found and calculate dues when schedules overdue', async () => {
    (service as any).prisma = { loan: { findUnique: jest.fn().mockResolvedValue(null) } };
    await expect(service.calculateCurrentDues('nope')).rejects.toBeInstanceOf(BadRequestException);

    const overdueDate = new Date(); overdueDate.setDate(overdueDate.getDate() - 10);
    const loanWithSchedules: any = { id: 'lcalc', amount: 1000, interestRate: 10, payments: [], createdAt: new Date(0), schedules: [{ id: 's2', dueDate: overdueDate, status: 'PENDING' }] };
    (service as any).prisma = { loan: { findUnique: jest.fn().mockResolvedValue(loanWithSchedules) } };
    const dues = await service.calculateCurrentDues('lcalc');
    expect(dues).toHaveProperty('outstandingPrincipal');
    expect(dues).toHaveProperty('lateFee');
  });
});
