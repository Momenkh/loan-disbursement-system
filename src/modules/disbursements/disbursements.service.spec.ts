import { DisbursementsService } from './disbursements.service';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { CreateDisbursementDto } from './dto/create-disbursement.dto';
import { LoanStatus, DisbursementStatus, ScheduleStatus } from '@prisma/client';

describe('DisbursementsService', () => {
  let service: DisbursementsService;

  beforeEach(() => {
    // instantiate with placeholder prisma and ledgerService mocks
    service = new DisbursementsService(
      {} as any, 
      { createLedgerEntry: jest.fn() } as any
    );
  });

  it('createDisbursement should throw when loan not found', async () => {
    const mockTx: any = { 
      loan: { findUnique: jest.fn().mockResolvedValue(null) } 
    };
    (service as any).prisma = { 
      $transaction: jest.fn().mockImplementation(async (cb: any) => cb(mockTx)) 
    } as any;
    
    await expect(
      service.createDisbursement({ loanId: 'x', amount: 100 } as any, 'user123')
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('createDisbursement should throw when loan not approved', async () => {
    const mockTx: any = { 
      loan: { 
        findUnique: jest.fn().mockResolvedValue({ 
          id: 'l1', 
          status: LoanStatus.PENDING 
        }) 
      } 
    };
    (service as any).prisma = { 
      $transaction: jest.fn().mockImplementation(async (cb: any) => cb(mockTx)) 
    } as any;
    
    await expect(
      service.createDisbursement({ loanId: 'l1', amount: 100 } as any, 'user123')
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('createDisbursement should create disbursement and call ledger', async () => {
    const loan = { 
      id: 'l1', 
      status: LoanStatus.APPROVED, 
      clientId: 'c1', 
      amount: 1000, 
      interestRate: 10, 
      numberOfInstallments: 12 
    };
    
    const mockTx: any = {
      loan: { 
        findUnique: jest.fn().mockResolvedValue(loan), 
        update: jest.fn().mockResolvedValue({}) 
      },
      disbursement: { 
        findUnique: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({ 
          id: 'd1', 
          loanId: 'l1',
          amount: 1000,
          status: DisbursementStatus.COMPLETED 
        }) 
      },
      repaymentSchedule: { 
        count: jest.fn().mockResolvedValue(0),
        createMany: jest.fn().mockResolvedValue({ count: 12 }) 
      },
      ledgerEntry: {
        create: jest.fn().mockResolvedValue({ id: 'ledger1' })
      },
      auditLog: {
        create: jest.fn().mockResolvedValue({ id: 'audit1' })
      }
    };
    
    (service as any).prisma = { 
      $transaction: jest.fn().mockImplementation(async (cb: any) => cb(mockTx)) 
    } as any;
    
    (service as any).logger = { 
      log: jest.fn(),
      warn: jest.fn() 
    };

    const dto: CreateDisbursementDto = { 
      loanId: 'l1', 
      amount: 1000, 
      disbursementDate: new Date() 
    };
    
    const res = await service.createDisbursement(dto, 'user123');
    expect(res).toBeDefined();
    expect(res.id).toBe('d1');
    expect(mockTx.repaymentSchedule.createMany).toHaveBeenCalled();
  });

  it('createDisbursement should update existing PENDING disbursement', async () => {
    const loan = { 
      id: 'l1', 
      status: LoanStatus.APPROVED, 
      clientId: 'c1', 
      amount: 1000, 
      interestRate: 10, 
      numberOfInstallments: 12,
      disbursement: {
        id: 'd-existing',
        status: DisbursementStatus.PENDING
      }
    };
    
    const mockTx: any = {
      loan: { 
        findUnique: jest.fn().mockResolvedValue(loan), 
        update: jest.fn().mockResolvedValue({}) 
      },
      disbursement: { 
        update: jest.fn().mockResolvedValue({ 
          id: 'd-existing', 
          status: DisbursementStatus.COMPLETED 
        }) 
      },
      repaymentSchedule: { 
        count: jest.fn().mockResolvedValue(0),
        createMany: jest.fn().mockResolvedValue({ count: 12 }) 
      },
      ledgerEntry: {
        create: jest.fn().mockResolvedValue({ id: 'ledger1' })
      },
      auditLog: {
        create: jest.fn().mockResolvedValue({ id: 'audit1' })
      }
    };
    
    (service as any).prisma = { 
      $transaction: jest.fn().mockImplementation(async (cb: any) => cb(mockTx)) 
    } as any;
    
    (service as any).logger = { 
      log: jest.fn(),
      warn: jest.fn() 
    };

    const dto: CreateDisbursementDto = { 
      loanId: 'l1', 
      amount: 1000 
    };
    
    const res = await service.createDisbursement(dto, 'user123');
    expect(res).toBeDefined();
    expect(mockTx.disbursement.update).toHaveBeenCalled();
  });

  it('createDisbursement should throw when already disbursed (COMPLETED)', async () => {
    const loan = {
      id: 'l1', 
      status: LoanStatus.APPROVED, 
      clientId: 'c1', 
      amount: 1000, 
      interestRate: 10, 
      numberOfInstallments: 12,
      disbursement: {
        id: 'd-existing',
        status: DisbursementStatus.COMPLETED
      }
    };
    
    const mockTx: any = {
      loan: { 
        findUnique: jest.fn().mockResolvedValue(loan) 
      }
    };
    
    (service as any).prisma = { 
      $transaction: jest.fn().mockImplementation(async (cb: any) => cb(mockTx)) 
    } as any;
    
    await expect(
      service.createDisbursement({ loanId: 'l1', amount: 1000 } as any, 'user123')
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('createDisbursement handles concurrent attempts (only one succeeds)', async () => {
    const loan = { 
      id: 'l2', 
      status: LoanStatus.APPROVED, 
      clientId: 'c2', 
      amount: 500,
      interestRate: 10,
      numberOfInstallments: 12
    };
    
    let call = 0;
    const mockTxFactory = () => {
      call += 1;
      if (call === 1) {
        return {
          loan: { 
            findUnique: jest.fn().mockResolvedValue({ ...loan, disbursement: null }), 
            update: jest.fn().mockResolvedValue({}) 
          },
          disbursement: { 
            create: jest.fn().mockResolvedValue({ 
              id: 'd-new',
              status: DisbursementStatus.COMPLETED 
            }) 
          },
          repaymentSchedule: { 
            count: jest.fn().mockResolvedValue(0),
            createMany: jest.fn().mockResolvedValue({ count: 12 }) 
          },
          ledgerEntry: {
            create: jest.fn().mockResolvedValue({ id: 'ledger1' })
          },
          auditLog: {
            create: jest.fn().mockResolvedValue({ id: 'audit1' })
          }
        };
      }
      return {
        loan: { 
          findUnique: jest.fn().mockResolvedValue({ 
            ...loan, 
            disbursement: { 
              id: 'd-new', 
              status: DisbursementStatus.COMPLETED 
            } 
          }) 
        }
      };
    };

    (service as any).prisma = { 
      $transaction: jest.fn().mockImplementation(async (cb: any) => cb(mockTxFactory())) 
    } as any;
    
    (service as any).logger = { 
      log: jest.fn(),
      warn: jest.fn() 
    };

    const p1 = service.createDisbursement({ loanId: 'l2', amount: 500 } as any, 'user123');
    const p2 = service.createDisbursement({ loanId: 'l2', amount: 500 } as any, 'user456');

    const results = await Promise.allSettled([p1, p2]);
    const fulfilled = results.filter(r => r.status === 'fulfilled');
    const rejected = results.filter(r => r.status === 'rejected');
    
    expect(fulfilled.length).toBe(1);
    expect(rejected.length).toBe(1);
  });

  it('getAllDisbursements should return list', async () => {
    const list = [{ id: 'd1' }, { id: 'd2' }];
    (service as any).prisma = { 
      disbursement: { 
        findMany: jest.fn().mockResolvedValue(list) 
      } 
    } as any;
    
    const res = await service.getAllDisbursements();
    expect(res).toEqual(list);
  });

  it('getDisbursementById should throw when not found', async () => {
    (service as any).prisma = { 
      disbursement: { 
        findUnique: jest.fn().mockResolvedValue(null) 
      } 
    } as any;
    
    await expect(service.getDisbursementById('nope')).rejects.toBeDefined();
  });

  it('rollbackDisbursement should throw when disbursement not found', async () => {
    (service as any).prisma = { 
      disbursement: { 
        findUnique: jest.fn().mockResolvedValue(null) 
      } 
    } as any;
    
    await expect(service.rollbackDisbursement('d-x', 'user123')).rejects.toBeDefined();
  });

  it('rollbackDisbursement should throw when associated loan not found', async () => {
    const disb = { id: 'd3', loanId: 'l-missing', amount: 100 } as any;
    (service as any).prisma = { 
      disbursement: { 
        findUnique: jest.fn().mockResolvedValue(disb) 
      }, 
      $transaction: jest.fn().mockImplementation(async (cb: any) => 
        cb({ 
          loan: { 
            findUnique: jest.fn().mockResolvedValue(null) 
          } 
        })
      ) 
    } as any;
    
    (service as any).ledgerService = { createLedgerEntry: jest.fn() };
    
    await expect(service.rollbackDisbursement('d3', 'user123')).rejects.toBeDefined();
  });
});