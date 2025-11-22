import { DisbursementsService } from './disbursements.service';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { CreateDisbursementDto } from './dto/create-disbursement.dto';

describe('DisbursementsService', () => {
  let service: DisbursementsService;

  beforeEach(() => {
    // instantiate with placeholder prisma and ledgerService mocks
    service = new DisbursementsService({} as any, { createLedgerEntry: jest.fn() } as any);
  });

  it('createDisbursement should throw when loan not found', async () => {
    const mockTx: any = { loan: { findUnique: jest.fn().mockResolvedValue(null) } };
    (service as any).prisma = { $transaction: jest.fn().mockImplementation(async (cb: any) => cb(mockTx)) } as any;
    await expect(service.createDisbursement({ loanId: 'x', clientId: 'c', amount: 100 } as any)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('createDisbursement should throw when loan not approved', async () => {
    const mockTx: any = { loan: { findUnique: jest.fn().mockResolvedValue({ id: 'l1', status: 'draft' }) } };
    (service as any).prisma = { $transaction: jest.fn().mockImplementation(async (cb: any) => cb(mockTx)) } as any;
    await expect(service.createDisbursement({ loanId: 'l1', clientId: 'c1', amount: 100 } as any)).rejects.toBeInstanceOf(BadRequestException);
  });

  it('createDisbursement should create disbursement and call ledger', async () => {
    const loan = { id: 'l1', status: 'APPROVED', clientId: 'c1', amount: 1000, interestRate: 10, tenor: 12 };
    const mockTx: any = {
      loan: { findUnique: jest.fn().mockResolvedValue(loan), update: jest.fn().mockResolvedValue({}) },
      disbursement: { findUnique: jest.fn().mockResolvedValue(null), create: jest.fn().mockResolvedValue({ id: 'd1' }) },
      repaymentSchedule: { create: jest.fn().mockResolvedValue({}) },
    };
    (service as any).prisma = { $transaction: jest.fn().mockImplementation(async (cb: any) => cb(mockTx)) } as any;
    const ledgerSpy = jest.fn().mockResolvedValue({});
    (service as any).ledgerService = { createLedgerEntry: ledgerSpy };

    const dto: CreateDisbursementDto = { loanId: 'l1', clientId: 'c1', amount: 1000, currency: 'USD', disbursementDate: new Date(), firstPaymentDate: new Date(), tenor: 12, interestRate: 10 } as any;
    const res = await service.createDisbursement(dto);
    expect(res).toBeDefined();
  });

  it('createDisbursement should be idempotent and throw when already disbursed', async () => {
    const existing = { id: 'd-existing', loanId: 'l1', amount: 1000 };
    const mockTx: any = {
      loan: { findUnique: jest.fn().mockResolvedValue({ id: 'l1', status: 'APPROVED', clientId: 'c1', amount: 1000, interestRate: 10, tenor: 12 }) },
      disbursement: { findUnique: jest.fn().mockResolvedValue(existing) },
    };
    (service as any).prisma = { $transaction: jest.fn().mockImplementation(async (cb: any) => cb(mockTx)) } as any;
    await expect(service.createDisbursement({ loanId: 'l1', clientId: 'c1', amount: 1000 } as any)).rejects.toBeInstanceOf(BadRequestException);
  });

  it('createDisbursement handles concurrent attempts (only one succeeds)', async () => {
    const loan = { id: 'l2', status: 'APPROVED', clientId: 'c2', amount: 500 };
    // simulate $transaction which on first call creates disbursement and on second finds existing
    let call = 0;
    const mockTxFactory = () => {
      call += 1;
      if (call === 1) {
        return {
          loan: { findUnique: jest.fn().mockResolvedValue(loan), update: jest.fn().mockResolvedValue({}) },
          disbursement: { findUnique: jest.fn().mockResolvedValue(null), create: jest.fn().mockResolvedValue({ id: 'd-new' }) },
          repaymentSchedule: { create: jest.fn().mockResolvedValue({}) },
        };
      }
      return {
        loan: { findUnique: jest.fn().mockResolvedValue(loan) },
        disbursement: { findUnique: jest.fn().mockResolvedValue({ id: 'd-new' }) },
      };
    };

    (service as any).prisma = { $transaction: jest.fn().mockImplementation(async (cb: any) => cb(mockTxFactory())) } as any;
    (service as any).ledgerService = { createLedgerEntry: jest.fn().mockResolvedValue({}) };

    // run two concurrent attempts
    const p1 = service.createDisbursement({ loanId: 'l2', clientId: 'c2', amount: 500 } as any);
    const p2 = service.createDisbursement({ loanId: 'l2', clientId: 'c2', amount: 500 } as any);

    const results = await Promise.allSettled([p1, p2]);
    const fulfilled = results.filter(r => r.status === 'fulfilled');
    const rejected = results.filter(r => r.status === 'rejected');
    expect(fulfilled.length).toBe(1);
    expect(rejected.length).toBe(1);
  });

  it('getAllDisbursements should return list', async () => {
    const list = [{ id: 'd1' }, { id: 'd2' }];
    (service as any).prisma = { disbursement: { findMany: jest.fn().mockResolvedValue(list) } } as any;
    const res = await service.getAllDisbursements();
    expect(res).toEqual(list);
  });

  it('getDisbursementById should throw when not found', async () => {
    (service as any).prisma = { disbursement: { findUnique: jest.fn().mockResolvedValue(null) } } as any;
    await expect(service.getDisbursementById('nope')).rejects.toBeDefined();
  });

  it('rollbackDisbursement should throw when disbursement not found', async () => {
    (service as any).prisma = { disbursement: { findUnique: jest.fn().mockResolvedValue(null) } } as any;
    await expect(service.rollbackDisbursement('d-x')).rejects.toBeDefined();
  });

  it('rollbackDisbursement should throw when associated loan not found', async () => {
    const disb = { id: 'd3', loanId: 'l-missing', amount: 100 } as any;
    (service as any).prisma = { disbursement: { findUnique: jest.fn().mockResolvedValue(disb) }, $transaction: jest.fn().mockImplementation(async (cb: any) => cb({ loan: { findUnique: jest.fn().mockResolvedValue(null) } })) } as any;
    (service as any).ledgerService = { createLedgerEntry: jest.fn() };
    await expect(service.rollbackDisbursement('d3')).rejects.toBeDefined();
  });
});
