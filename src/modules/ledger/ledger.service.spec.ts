import { LedgerService } from './ledger.service';
import { CreateLedgerEntryDto } from './dto/create-ledger-entry.dto';
import { NotFoundException } from '@nestjs/common';

describe('LedgerService', () => {
  let service: LedgerService;

  beforeEach(() => {
    service = new LedgerService({} as any, { logTransaction: jest.fn() } as any);
  });

  it('logLedgerTransaction should call auditService.logTransaction and return void', async () => {
    const dto: CreateLedgerEntryDto = {
      ledgerEntryId: 'tx1',
      transactionType: 'TEST',
      userId: 'u1',
      debitAccountId: 'A',
      creditAccountId: 'B',
      amount: 10,
    } as any;

    const auditSpy = jest.fn().mockResolvedValue({ id: 'a1' });
    (service as any).auditService = { logTransaction: auditSpy };

    // method simply delegates to auditService.logTransaction and logs
    await service.logLedgerTransaction(dto as any);
    expect(auditSpy).toHaveBeenCalledWith('tx1', 'TEST', 'u1', expect.any(Object));
  });

  it('getAccountBalance should throw when account not found and return number when present', async () => {
    (service as any).prisma = { account: { findUnique: jest.fn().mockResolvedValue(null) } };
    await expect(service.getAccountBalance('NOPE')).rejects.toBeInstanceOf(NotFoundException);

    (service as any).prisma = { account: { findUnique: jest.fn().mockResolvedValue({ balance: '1234.56' }) } };
    const bal = await service.getAccountBalance('A');
    expect(bal).toBe(1234.56);
  });

  it('getAllAccounts should return results from prisma', async () => {
    const accounts = [{ id: 'a1' }, { id: 'a2' }];
    (service as any).prisma = { account: { findMany: jest.fn().mockResolvedValue(accounts) } };
    const res = await service.getAllAccounts();
    expect(res).toEqual(accounts);
  });
});
