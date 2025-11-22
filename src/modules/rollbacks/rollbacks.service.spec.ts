import { RollbacksService } from './rollbacks.service';
import { BadRequestException } from '@nestjs/common';

describe('RollbacksService', () => {
  let service: RollbacksService;

  beforeEach(() => {
    service = new RollbacksService({} as any, { createLedgerEntry: jest.fn() } as any);
  });

  it('rollbackTransaction should throw when original transaction not found', async () => {
    const mockTx: any = {
      rollbackRecord: { findUnique: jest.fn().mockResolvedValue(null) },
      disbursement: { findUnique: jest.fn().mockResolvedValue(null) },
      payment: { findUnique: jest.fn().mockResolvedValue(null) },
    };
    (service as any).prisma = { $transaction: jest.fn().mockImplementation(async (cb: any) => cb(mockTx)) } as any;
    await expect(service.rollbackTransaction({ transactionId: 'tx-nope', reason: 'x', rolledBackBy: 'u' } as any)).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rollbackTransaction should create rollback record when disbursement exists', async () => {
    const disb: any = { id: 'd1', loanId: 'l1', amount: 100 };
    const mockTx: any = {
      rollbackRecord: { findUnique: jest.fn().mockResolvedValue(null), create: jest.fn().mockResolvedValue({ id: 'rb1' }) },
      disbursement: { findUnique: jest.fn().mockResolvedValue(disb), update: jest.fn().mockResolvedValue({}) },
      payment: { findUnique: jest.fn().mockResolvedValue(null) },
    };
    (service as any).prisma = { $transaction: jest.fn().mockImplementation(async (cb: any) => cb(mockTx)) } as any;
    (service as any).ledgerService = { createLedgerEntry: jest.fn().mockResolvedValue({}) };
    const res = await service.rollbackTransaction({ transactionId: 'd1', reason: 'test', rolledBackBy: 'u1' } as any);
    expect(res).toBeDefined();
  });

  it('rollbackTransaction should rollback payment and create multiple ledger entries', async () => {
    const payment = { id: 'p2', loanId: 'l-pay', principalPaid: 50, interestPaid: 10, lateFeePaid: 5 } as any;
    const mockTx: any = {
      rollbackRecord: { findUnique: jest.fn().mockResolvedValue(null), create: jest.fn().mockResolvedValue({ id: 'rb2' }) },
      disbursement: { findUnique: jest.fn().mockResolvedValue(null) },
      payment: { findUnique: jest.fn().mockResolvedValue(payment), update: jest.fn().mockResolvedValue({}) },
    };
    const ledgerSpy = jest.fn().mockResolvedValue({});
    (service as any).prisma = { $transaction: jest.fn().mockImplementation(async (cb: any) => cb(mockTx)) } as any;
    (service as any).ledgerService = { createLedgerEntry: ledgerSpy };

    const res = await service.rollbackTransaction({ transactionId: 'p2', reason: 'erroneous', rolledBackBy: 'u2' } as any);
    expect(res).toBeDefined();
    // should have created ledger reversal for principal + interest + late fee
    expect(ledgerSpy).toHaveBeenCalledTimes(3);
    expect(mockTx.rollbackRecord.create).toHaveBeenCalled();
  });
});
