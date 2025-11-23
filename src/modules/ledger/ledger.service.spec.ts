import { LedgerService } from './ledger.service';
import { CreateLedgerEntryDto } from './dto/create-ledger-entry.dto';

describe('LedgerService', () => {
  let service: LedgerService;

  beforeEach(() => {
    service = new LedgerService({} as any, { logTransaction: jest.fn() } as any);
  });

  it('createLedgerEntry should throw when debit equals credit', async () => {
    const dto: CreateLedgerEntryDto = { transactionId: 't1', debitAccount: 'A', creditAccount: 'A', amount: 10 } as any;
    await expect(service.logLedgerTransaction(dto)).rejects.toThrow('Debit and credit accounts must differ');
  });

  it('createLedgerEntry should write a ledger entry and return it', async () => {
    const created = { id: 'le1', transactionId: 't2', debitAccountId: 'A', creditAccountId: 'B', amount: 10 };
    const mockPrisma: any = { ledgerEntry: { create: jest.fn().mockResolvedValue(created) } };
    (service as any).prisma = mockPrisma;
    const dto: CreateLedgerEntryDto = { transactionId: 't2', debitAccountId: 'A', creditAccountId: 'B', amount: 10, transactionType: 'TEST' } as any;
    (service as any).auditService = { logTransaction: jest.fn() };
    const res = await service.logLedgerTransaction(dto);
    expect(mockPrisma.ledgerEntry.create).toHaveBeenCalled();
    expect(res).toEqual(created);
  });
});
