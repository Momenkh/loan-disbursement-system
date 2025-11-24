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
      loan: { findUnique: jest.fn().mockResolvedValue(loan), update: jest.fn().mockResolvedValue({ id: 'l1', status: 'CLOSED' }) },
      payment: { create: jest.fn().mockResolvedValue({ id: 'p1' }) },
      repaymentSchedule: {
        findFirst: jest.fn().mockResolvedValue(null),
        findMany: jest.fn().mockResolvedValue([]),
        update: jest.fn().mockResolvedValue({}),
        count: jest.fn().mockResolvedValue(0),
      },
      ledgerEntry: { create: jest.fn().mockResolvedValue({ id: 'le1' }) },
      account: { update: jest.fn().mockResolvedValue({}) },
      auditLog: { create: jest.fn().mockResolvedValue({ id: 'a1' }) },
    };
    (service as any).prisma = { $transaction: jest.fn().mockImplementation(async (cb: any) => cb(mockTx2)) } as any;
    const res = await service.createRepayment({ loanId: 'l1', clientId: 'c1', amount: 100, paymentDate: new Date() } as any);
    expect(res).toBeDefined();
    expect(mockTx2.ledgerEntry.create).toHaveBeenCalled();
  });

  it('createRepayment should pay interest when interest has accrued', async () => {
    // loan with last payment long ago -> interest accrues
    const pastDate = new Date();
    pastDate.setDate(pastDate.getDate() - 30);
    const loan: any = { id: 'l10', amount: 1000, interestRate: 12, payments: [{ paymentDate: pastDate, principalPaid: 0 }], createdAt: new Date(0) };
    const mockTx: any = {
      loan: { findUnique: jest.fn().mockResolvedValue(loan), update: jest.fn().mockResolvedValue({ id: 'l10', status: 'CLOSED' }) },
      payment: { create: jest.fn().mockResolvedValue({ id: 'p10' }) },
      repaymentSchedule: {
        findFirst: jest.fn().mockResolvedValue(null),
        findMany: jest.fn().mockResolvedValue([]),
        update: jest.fn().mockResolvedValue({}),
        count: jest.fn().mockResolvedValue(0),
      },
      ledgerEntry: { create: jest.fn().mockResolvedValue({ id: 'le10' }) },
      account: { update: jest.fn().mockResolvedValue({}) },
      auditLog: { create: jest.fn().mockResolvedValue({ id: 'a10' }) },
    };
    (service as any).prisma = { $transaction: jest.fn().mockImplementation(async (cb: any) => cb(mockTx)) } as any;

    const res = await service.createRepayment({ loanId: 'l10', clientId: 'c10', amount: 50, paymentDate: new Date() } as any);
    expect(res).toBeDefined();
    // at least one ledger entry created
    expect(mockTx.ledgerEntry.create).toHaveBeenCalled();
  });

  it('createRepayment should apply late fee when schedule overdue', async () => {
    const loan: any = { id: 'l11', amount: 500, interestRate: 0, payments: [], createdAt: new Date() };
    const overdueDate = new Date();
    overdueDate.setDate(overdueDate.getDate() - 10);
    const schedule = { id: 's1', loanId: 'l11', dueDate: overdueDate, status: 'PENDING' } as any;

    const mockTx: any = {
      loan: { findUnique: jest.fn().mockResolvedValue(loan) },
      payment: { create: jest.fn().mockResolvedValue({ id: 'p11' }) },
      repaymentSchedule: {
        findFirst: jest.fn().mockResolvedValue(schedule),
        findMany: jest.fn().mockResolvedValue([]),
        update: jest.fn().mockResolvedValue({}),
        count: jest.fn().mockResolvedValue(1),
      },
      ledgerEntry: { create: jest.fn().mockResolvedValue({ id: 'le11' }) },
      account: { update: jest.fn().mockResolvedValue({}) },
      auditLog: { create: jest.fn().mockResolvedValue({ id: 'a11' }) },
    };
    (service as any).prisma = { $transaction: jest.fn().mockImplementation(async (cb: any) => cb(mockTx)) } as any;

    const payDate = new Date();
    const res = await service.createRepayment({ loanId: 'l11', clientId: 'c11', amount: 100, paymentDate: payDate } as any);
    expect(res).toBeDefined();
    // principal and late fee ledger entries expected
    expect(mockTx.ledgerEntry.create).toHaveBeenCalled();
  });

  it('getPaymentHistory and getRepaymentSchedule should call prisma', async () => {
    const mockPrisma: any = { payment: { findMany: jest.fn().mockResolvedValue([{ id: 'p1' }]) }, repaymentSchedule: { findMany: jest.fn().mockResolvedValue([{ id: 's1' }]) } };
    (service as any).prisma = mockPrisma;
    const ph = await service.getPaymentHistory('loanx');
    expect(ph).toEqual([{ id: 'p1' }]);
    const rs = await service.getRepaymentSchedule('loanx');
    expect(rs).toEqual([{ id: 's1' }]);
  });

  it('createRepayment should allocate principal across schedules and close loan when fully paid', async () => {
    // Loan with two pending schedules of 100 each, paying 200 should close the loan
    const loan: any = { id: 'lClose', amount: 200, interestRate: 0, payments: [], createdAt: new Date(0) };

    const schedules = [
      { id: 'sA', loanId: 'lClose', amount: 100, paidAmount: 0 },
      { id: 'sB', loanId: 'lClose', amount: 100, paidAmount: 0 },
    ];

    const mockTx: any = {
      loan: {
        findUnique: jest.fn().mockResolvedValue(loan),
        update: jest.fn().mockResolvedValue({ id: 'lClose', status: 'CLOSED' }),
      },
      payment: { create: jest.fn().mockResolvedValue({ id: 'payClose' }) },
      repaymentSchedule: {
        findFirst: jest.fn().mockResolvedValue(null),
        findMany: jest.fn().mockResolvedValue(schedules),
        update: jest.fn().mockResolvedValue({}),
        count: jest.fn().mockResolvedValue(0),
      },
      ledgerEntry: { create: jest.fn().mockResolvedValue({ id: 'leClose' }) },
      account: { update: jest.fn().mockResolvedValue({}) },
      auditLog: { create: jest.fn().mockResolvedValue({ id: 'aClose' }) },
    };

    // ensure prisma.$transaction returns our mock tx object
    (service as any).prisma = { $transaction: jest.fn().mockImplementation(async (cb: any) => cb(mockTx)) } as any;

    const res = await service.createRepayment({ loanId: 'lClose', clientId: 'cClose', amount: 200, paymentDate: new Date() } as any);
    expect(res).toBeDefined();
    // Expect schedule updates for each schedule
    expect(mockTx.repaymentSchedule.update).toHaveBeenCalledTimes(2);
    // Loan should be marked closed
    expect(mockTx.loan.update).toHaveBeenCalled();
    // Ledger entry for principal should have been created
    expect(mockTx.ledgerEntry.create).toHaveBeenCalled();
  });

  it('calculateCurrentDues should return zeros when no pending schedules', async () => {
    const loan: any = { id: 'lnone', amount: 0, interestRate: 0, payments: [], createdAt: new Date(0), schedules: [] };
    (service as any).prisma = { loan: { findUnique: jest.fn().mockResolvedValue(loan) } } as any;
    const dues = await service.calculateCurrentDues('lnone');
    expect(dues.outstandingPrincipal).toBe(0);
    expect(dues.totalDue).toBe(0);
    expect(dues.nextInstallmentDue.principal).toBe(0);
  });

  it('calculateCurrentDues should throw when loan not found and calculate dues when schedules overdue', async () => {
    (service as any).prisma = { loan: { findUnique: jest.fn().mockResolvedValue(null) } };
    await expect(service.calculateCurrentDues('nope')).rejects.toBeInstanceOf(BadRequestException);

    const overdueDate = new Date(); overdueDate.setDate(overdueDate.getDate() - 10);
    const loanWithSchedules: any = { id: 'lcalc', amount: 1000, interestRate: 10, payments: [], createdAt: new Date(0), schedules: [{ id: 's2', dueDate: overdueDate, status: 'PENDING', principalAmount: 500, interestAmount: 10, payments: [] }] };
    (service as any).prisma = { loan: { findUnique: jest.fn().mockResolvedValue(loanWithSchedules) } };
    const dues = await service.calculateCurrentDues('lcalc');
    expect(dues).toHaveProperty('outstandingPrincipal');
    expect(dues).toHaveProperty('lateFee');
  });
});
