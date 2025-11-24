import { DisbursementsService } from './disbursements.service';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { CreateDisbursementDto } from './dto/create-disbursement.dto';
import { LoanStatus, DisbursementStatus, ScheduleStatus, TransactionType } from '@prisma/client';

describe('DisbursementsService', () => {
  let service: DisbursementsService;
  let mockPrisma: any;
  let mockLedgerService: any;

  beforeEach(() => {
    mockLedgerService = {
      createLedgerEntry: jest.fn().mockResolvedValue({ id: 'ledger-1' }),
    };

    mockPrisma = {
      user: { findUnique: jest.fn() },
      loan: { findUnique: jest.fn(), update: jest.fn() },
      disbursement: { 
        findUnique: jest.fn(), 
        findMany: jest.fn(),
        create: jest.fn(), 
        update: jest.fn() 
      },
      repaymentSchedule: { 
        create: jest.fn(), 
        createMany: jest.fn(),
        count: jest.fn(),
        deleteMany: jest.fn() 
      },
      ledgerEntry: { create: jest.fn() },
      account: { update: jest.fn() },
      auditLog: { create: jest.fn() },
      $transaction: jest.fn(),
    };

    service = new DisbursementsService(mockPrisma, mockLedgerService);
  });

  describe('createDisbursement', () => {
    const mockUser = { id: 'user-1', username: 'testuser' };
    const mockDto: CreateDisbursementDto = {
      loanId: 'loan-1',
      clientId: 'client-1',
      amount: 1000,
      currency: 'USD',
      disbursementDate: new Date('2025-01-15'),
      firstPaymentDate: new Date('2025-02-01'),
      tenor: 12,
      interestRate: 10,
    } as any;

    it('should throw NotFoundException when loan not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockPrisma.$transaction.mockImplementation(async (callback) => {
        const txPrisma = {
          loan: { findUnique: jest.fn().mockResolvedValue(null) },
        };
        return callback(txPrisma);
      });

      await expect(
        service.createDisbursement(mockDto, 'testuser')
      ).rejects.toThrow(NotFoundException);
      await expect(
        service.createDisbursement(mockDto, 'testuser')
      ).rejects.toThrow('Loan not found');
    });

    it('should throw BadRequestException when loan is not approved', async () => {
      const loan = {
        id: 'loan-1',
        status: LoanStatus.PENDING,
        amount: 1000,
        disbursements: [],
      };

      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockPrisma.$transaction.mockImplementation(async (callback) => {
        const txPrisma = {
          loan: { findUnique: jest.fn().mockResolvedValue(loan) },
        };
        return callback(txPrisma);
      });

      await expect(
        service.createDisbursement(mockDto, 'testuser')
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.createDisbursement(mockDto, 'testuser')
      ).rejects.toThrow('Only approved loans can be disbursed');
    });

    it('should throw BadRequestException when loan already has completed disbursement', async () => {
      const loan = {
        id: 'loan-1',
        status: LoanStatus.APPROVED,
        amount: 1000,
        disbursements: [
          { id: 'disb-1', status: DisbursementStatus.COMPLETED, amount: 1000 },
        ],
      };

      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockPrisma.$transaction.mockImplementation(async (callback) => {
        const txPrisma = {
          loan: { findUnique: jest.fn().mockResolvedValue(loan) },
        };
        return callback(txPrisma);
      });

      await expect(
        service.createDisbursement(mockDto, 'testuser')
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.createDisbursement(mockDto, 'testuser')
      ).rejects.toThrow('Loan already has a completed disbursement');
    });

    it('should create new disbursement when no disbursements exist', async () => {
      const loan = {
        id: 'loan-1',
        status: LoanStatus.APPROVED,
        amount: 1000,
        interestRate: 10,
        numberOfInstallments: 12,
        disbursements: [],
      };

      const createdDisbursement = {
        id: 'disb-1',
        loanId: 'loan-1',
        amount: 1000,
        status: DisbursementStatus.COMPLETED,
      };

      const ledgerEntry = { id: 'ledger-1' };

      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockPrisma.$transaction.mockImplementation(async (callback) => {
        const txPrisma = {
          loan: { 
            findUnique: jest.fn().mockResolvedValue(loan),
            update: jest.fn().mockResolvedValue({ ...loan, status: LoanStatus.ACTIVE }),
          },
          disbursement: {
            create: jest.fn().mockResolvedValue(createdDisbursement),
          },
          repaymentSchedule: {
            count: jest.fn().mockResolvedValue(0),
            createMany: jest.fn().mockResolvedValue({ count: 12 }),
          },
          ledgerEntry: {
            create: jest.fn().mockResolvedValue(ledgerEntry),
          },
          account: {
            update: jest.fn().mockResolvedValue({}),
          },
          auditLog: {
            create: jest.fn().mockResolvedValue({}),
          },
        };
        return callback(txPrisma);
      });

      const result = await service.createDisbursement(mockDto, 'testuser');

      expect(result).toEqual(createdDisbursement);
      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { username: 'testuser' },
      });
    });

    it('should update pending disbursement to completed', async () => {
      const loan = {
        id: 'loan-1',
        status: LoanStatus.APPROVED,
        amount: 1000,
        interestRate: 10,
        numberOfInstallments: 12,
        disbursements: [
          { id: 'disb-pending', status: DisbursementStatus.PENDING },
        ],
      };

      const updatedDisbursement = {
        id: 'disb-pending',
        loanId: 'loan-1',
        amount: 1000,
        status: DisbursementStatus.COMPLETED,
      };

      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockPrisma.$transaction.mockImplementation(async (callback) => {
        const txPrisma = {
          loan: { 
            findUnique: jest.fn().mockResolvedValue(loan),
            update: jest.fn().mockResolvedValue({}),
          },
          disbursement: {
            update: jest.fn().mockResolvedValue(updatedDisbursement),
          },
          repaymentSchedule: {
            count: jest.fn().mockResolvedValue(0),
            createMany: jest.fn().mockResolvedValue({ count: 12 }),
          },
          ledgerEntry: {
            create: jest.fn().mockResolvedValue({ id: 'ledger-1' }),
          },
          account: {
            update: jest.fn().mockResolvedValue({}),
          },
          auditLog: {
            create: jest.fn().mockResolvedValue({}),
          },
        };
        return callback(txPrisma);
      });

      const result = await service.createDisbursement(mockDto, 'testuser');

      expect(result).toEqual(updatedDisbursement);
    });

    it('should create new disbursement when only rolled back disbursements exist', async () => {
      const loan = {
        id: 'loan-1',
        status: LoanStatus.APPROVED,
        amount: 1000,
        interestRate: 10,
        numberOfInstallments: 12,
        disbursements: [
          { id: 'disb-rolled', status: DisbursementStatus.ROLLED_BACK },
        ],
      };

      const createdDisbursement = {
        id: 'disb-new',
        loanId: 'loan-1',
        amount: 1000,
        status: DisbursementStatus.COMPLETED,
      };

      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockPrisma.$transaction.mockImplementation(async (callback) => {
        const txPrisma = {
          loan: { 
            findUnique: jest.fn().mockResolvedValue(loan),
            update: jest.fn().mockResolvedValue({}),
          },
          disbursement: {
            create: jest.fn().mockResolvedValue(createdDisbursement),
          },
          repaymentSchedule: {
            count: jest.fn().mockResolvedValue(0),
            createMany: jest.fn().mockResolvedValue({ count: 12 }),
          },
          ledgerEntry: {
            create: jest.fn().mockResolvedValue({ id: 'ledger-1' }),
          },
          account: {
            update: jest.fn().mockResolvedValue({}),
          },
          auditLog: {
            create: jest.fn().mockResolvedValue({}),
          },
        };
        return callback(txPrisma);
      });

      const result = await service.createDisbursement(mockDto, 'testuser');

      expect(result).toEqual(createdDisbursement);
    });

    it('should create ledger entries and update accounts correctly', async () => {
      const loan = {
        id: 'loan-1',
        status: LoanStatus.APPROVED,
        amount: 1000,
        interestRate: 10,
        numberOfInstallments: 12,
        disbursements: [],
      };

      const txPrisma = {
        loan: { 
          findUnique: jest.fn().mockResolvedValue(loan),
          update: jest.fn().mockResolvedValue({}),
        },
        disbursement: {
          create: jest.fn().mockResolvedValue({ id: 'disb-1' }),
        },
        repaymentSchedule: {
          count: jest.fn().mockResolvedValue(0),
          createMany: jest.fn().mockResolvedValue({ count: 12 }),
        },
        ledgerEntry: {
          create: jest.fn().mockResolvedValue({ id: 'ledger-1' }),
        },
        account: {
          update: jest.fn().mockResolvedValue({}),
        },
        auditLog: {
          create: jest.fn().mockResolvedValue({}),
        },
      };

      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockPrisma.$transaction.mockImplementation(async (callback) => callback(txPrisma));

      await service.createDisbursement(mockDto, 'testuser');

      expect(txPrisma.ledgerEntry.create).toHaveBeenCalledWith({
        data: {
          transactionType: TransactionType.DISBURSEMENT,
          amount: mockDto.amount,
          loanId: loan.id,
          debitAccountId: 'PLATFORM_FUNDS',
          creditAccountId: 'USER_CASH',
        },
      });

      expect(txPrisma.account.update).toHaveBeenCalledWith({
        where: { name: 'PLATFORM_FUNDS' },
        data: { balance: { decrement: mockDto.amount } },
      });

      expect(txPrisma.account.update).toHaveBeenCalledWith({
        where: { name: 'USER_CASH' },
        data: { balance: { increment: mockDto.amount } },
      });
    });

    it('should update loan status to ACTIVE', async () => {
      const loan = {
        id: 'loan-1',
        status: LoanStatus.APPROVED,
        amount: 1000,
        interestRate: 10,
        numberOfInstallments: 12,
        disbursements: [],
      };

      const txPrisma = {
        loan: { 
          findUnique: jest.fn().mockResolvedValue(loan),
          update: jest.fn().mockResolvedValue({ ...loan, status: LoanStatus.ACTIVE }),
        },
        disbursement: {
          create: jest.fn().mockResolvedValue({ id: 'disb-1' }),
        },
        repaymentSchedule: {
          count: jest.fn().mockResolvedValue(0),
          createMany: jest.fn().mockResolvedValue({ count: 12 }),
        },
        ledgerEntry: {
          create: jest.fn().mockResolvedValue({ id: 'ledger-1' }),
        },
        account: {
          update: jest.fn().mockResolvedValue({}),
        },
        auditLog: {
          create: jest.fn().mockResolvedValue({}),
        },
      };

      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockPrisma.$transaction.mockImplementation(async (callback) => callback(txPrisma));

      await service.createDisbursement(mockDto, 'testuser');

      expect(txPrisma.loan.update).toHaveBeenCalledWith({
        where: { id: 'loan-1' },
        data: { status: LoanStatus.ACTIVE },
      });
    });

    it('should skip repayment schedule creation if schedules already exist', async () => {
      const loan = {
        id: 'loan-1',
        status: LoanStatus.APPROVED,
        amount: 1000,
        interestRate: 10,
        numberOfInstallments: 12,
        disbursements: [],
      };

      const txPrisma = {
        loan: { 
          findUnique: jest.fn().mockResolvedValue(loan),
          update: jest.fn().mockResolvedValue({}),
        },
        disbursement: {
          create: jest.fn().mockResolvedValue({ id: 'disb-1' }),
        },
        repaymentSchedule: {
          count: jest.fn().mockResolvedValue(12), // Already exists
          createMany: jest.fn(),
        },
        ledgerEntry: {
          create: jest.fn().mockResolvedValue({ id: 'ledger-1' }),
        },
        account: {
          update: jest.fn().mockResolvedValue({}),
        },
        auditLog: {
          create: jest.fn().mockResolvedValue({}),
        },
      };

      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockPrisma.$transaction.mockImplementation(async (callback) => callback(txPrisma));

      await service.createDisbursement(mockDto, 'testuser');

      expect(txPrisma.repaymentSchedule.createMany).not.toHaveBeenCalled();
    });
  });

  describe('getAllDisbursements', () => {
    it('should return all disbursements', async () => {
      const disbursements = [
        { id: 'disb-1', amount: 1000 },
        { id: 'disb-2', amount: 2000 },
      ];

      mockPrisma.disbursement.findMany.mockResolvedValue(disbursements);

      const result = await service.getAllDisbursements();

      expect(result).toEqual(disbursements);
      expect(mockPrisma.disbursement.findMany).toHaveBeenCalled();
    });

    it('should return empty array when no disbursements exist', async () => {
      mockPrisma.disbursement.findMany.mockResolvedValue([]);

      const result = await service.getAllDisbursements();

      expect(result).toEqual([]);
    });
  });

  describe('getDisbursementById', () => {
    it('should return disbursement when found', async () => {
      const disbursement = { id: 'disb-1', amount: 1000 };
      mockPrisma.disbursement.findUnique.mockResolvedValue(disbursement);

      const result = await service.getDisbursementById('disb-1');

      expect(result).toEqual(disbursement);
      expect(mockPrisma.disbursement.findUnique).toHaveBeenCalledWith({
        where: { id: 'disb-1' },
      });
    });

    it('should throw NotFoundException when disbursement not found', async () => {
      mockPrisma.disbursement.findUnique.mockResolvedValue(null);

      await expect(service.getDisbursementById('invalid-id')).rejects.toThrow(
        NotFoundException
      );
      await expect(service.getDisbursementById('invalid-id')).rejects.toThrow(
        'Disbursement not found'
      );
    });
  });

  describe('rollbackDisbursement', () => {
    const mockUser = { id: 'user-1', username: 'testuser' };

    it('should throw NotFoundException when disbursement not found', async () => {
      mockPrisma.disbursement.findUnique.mockResolvedValue(null);

      await expect(
        service.rollbackDisbursement('invalid-id', 'testuser')
      ).rejects.toThrow(NotFoundException);
      await expect(
        service.rollbackDisbursement('invalid-id', 'testuser')
      ).rejects.toThrow('Disbursement not found');
    });

    it('should throw NotFoundException when associated loan not found', async () => {
      const disbursement = {
        id: 'disb-1',
        loanId: 'loan-missing',
        amount: 1000,
      };

      mockPrisma.disbursement.findUnique.mockResolvedValue(disbursement);
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockPrisma.$transaction.mockImplementation(async (callback) => {
        const txPrisma = {
          loan: { findUnique: jest.fn().mockResolvedValue(null) },
        };
        return callback(txPrisma);
      });

      await expect(
        service.rollbackDisbursement('disb-1', 'testuser')
      ).rejects.toThrow(NotFoundException);
      await expect(
        service.rollbackDisbursement('disb-1', 'testuser')
      ).rejects.toThrow('Associated loan not found');
    });

    it('should successfully rollback disbursement', async () => {
      const disbursement = {
        id: 'disb-1',
        loanId: 'loan-1',
        amount: 1000,
        status: DisbursementStatus.COMPLETED,
      };

      const loan = {
        id: 'loan-1',
        status: LoanStatus.ACTIVE,
        amount: 1000,
      };

      mockPrisma.disbursement.findUnique.mockResolvedValue(disbursement);
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);

      const txPrisma = {
        loan: { 
          findUnique: jest.fn().mockResolvedValue(loan),
          update: jest.fn().mockResolvedValue({ ...loan, status: LoanStatus.APPROVED }),
        },
        disbursement: {
          update: jest.fn().mockResolvedValue({
            ...disbursement,
            status: DisbursementStatus.ROLLED_BACK,
          }),
        },
        ledgerEntry: {
          create: jest.fn().mockResolvedValue({ id: 'ledger-rollback' }),
        },
        account: {
          update: jest.fn().mockResolvedValue({}),
        },
        auditLog: {
          create: jest.fn().mockResolvedValue({}),
        },
        repaymentSchedule: {
          deleteMany: jest.fn().mockResolvedValue({ count: 12 }),
        },
      };

      mockPrisma.$transaction.mockImplementation(async (callback) => callback(txPrisma));

      const result = await service.rollbackDisbursement('disb-1', 'testuser');

      expect(result).toEqual({ message: 'Disbursement rolled back successfully' });
    });

    it('should create rollback ledger entry with correct values', async () => {
      const disbursement = {
        id: 'disb-1',
        loanId: 'loan-1',
        amount: 1000,
      };

      const loan = { id: 'loan-1', status: LoanStatus.ACTIVE };

      mockPrisma.disbursement.findUnique.mockResolvedValue(disbursement);
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);

      const txPrisma = {
        loan: { 
          findUnique: jest.fn().mockResolvedValue(loan),
          update: jest.fn(),
        },
        disbursement: { update: jest.fn() },
        ledgerEntry: {
          create: jest.fn().mockResolvedValue({ id: 'ledger-rollback' }),
        },
        account: { update: jest.fn() },
        auditLog: { create: jest.fn() },
        repaymentSchedule: { deleteMany: jest.fn() },
      };

      mockPrisma.$transaction.mockImplementation(async (callback) => callback(txPrisma));

      await service.rollbackDisbursement('disb-1', 'testuser');

      expect(txPrisma.ledgerEntry.create).toHaveBeenCalledWith({
        data: {
          transactionType: TransactionType.ROLLBACK,
          debitAccountId: 'USER_CASH',
          creditAccountId: 'PLATFORM_FUNDS',
          amount: 1000,
        },
      });
    });

    it('should update accounts correctly on rollback', async () => {
      const disbursement = {
        id: 'disb-1',
        loanId: 'loan-1',
        amount: 1000,
      };

      const loan = { id: 'loan-1', status: LoanStatus.ACTIVE };

      mockPrisma.disbursement.findUnique.mockResolvedValue(disbursement);
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);

      const txPrisma = {
        loan: { 
          findUnique: jest.fn().mockResolvedValue(loan),
          update: jest.fn(),
        },
        disbursement: { update: jest.fn() },
        ledgerEntry: { create: jest.fn().mockResolvedValue({ id: 'ledger-1' }) },
        account: { update: jest.fn() },
        auditLog: { create: jest.fn() },
        repaymentSchedule: { deleteMany: jest.fn() },
      };

      mockPrisma.$transaction.mockImplementation(async (callback) => callback(txPrisma));

      await service.rollbackDisbursement('disb-1', 'testuser');

      expect(txPrisma.account.update).toHaveBeenCalledWith({
        where: { name: 'USER_CASH' },
        data: { balance: { decrement: disbursement.amount } },
      });

      expect(txPrisma.account.update).toHaveBeenCalledWith({
        where: { name: 'PLATFORM_FUNDS' },
        data: { balance: { increment: disbursement.amount } },
      });
    });

    it('should delete repayment schedules on rollback', async () => {
      const disbursement = {
        id: 'disb-1',
        loanId: 'loan-1',
        amount: 1000,
      };

      const loan = { id: 'loan-1', status: LoanStatus.ACTIVE };

      mockPrisma.disbursement.findUnique.mockResolvedValue(disbursement);
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);

      const txPrisma = {
        loan: { 
          findUnique: jest.fn().mockResolvedValue(loan),
          update: jest.fn(),
        },
        disbursement: { update: jest.fn() },
        ledgerEntry: { create: jest.fn().mockResolvedValue({ id: 'ledger-1' }) },
        account: { update: jest.fn() },
        auditLog: { create: jest.fn() },
        repaymentSchedule: {
          deleteMany: jest.fn().mockResolvedValue({ count: 12 }),
        },
      };

      mockPrisma.$transaction.mockImplementation(async (callback) => callback(txPrisma));

      await service.rollbackDisbursement('disb-1', 'testuser');

      expect(txPrisma.repaymentSchedule.deleteMany).toHaveBeenCalledWith({
        where: { loanId: loan.id },
      });
    });

    it('should update loan status back to APPROVED on rollback', async () => {
      const disbursement = {
        id: 'disb-1',
        loanId: 'loan-1',
        amount: 1000,
      };

      const loan = { id: 'loan-1', status: LoanStatus.ACTIVE };

      mockPrisma.disbursement.findUnique.mockResolvedValue(disbursement);
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);

      const txPrisma = {
        loan: { 
          findUnique: jest.fn().mockResolvedValue(loan),
          update: jest.fn().mockResolvedValue({ ...loan, status: LoanStatus.APPROVED }),
        },
        disbursement: { update: jest.fn() },
        ledgerEntry: { create: jest.fn().mockResolvedValue({ id: 'ledger-1' }) },
        account: { update: jest.fn() },
        auditLog: { create: jest.fn() },
        repaymentSchedule: { deleteMany: jest.fn() },
      };

      mockPrisma.$transaction.mockImplementation(async (callback) => callback(txPrisma));

      await service.rollbackDisbursement('disb-1', 'testuser');

      expect(txPrisma.loan.update).toHaveBeenCalledWith({
        where: { id: loan.id },
        data: { status: LoanStatus.APPROVED },
      });
    });

    it('should update disbursement status to ROLLED_BACK', async () => {
      const disbursement = {
        id: 'disb-1',
        loanId: 'loan-1',
        amount: 1000,
      };

      const loan = { id: 'loan-1', status: LoanStatus.ACTIVE };

      mockPrisma.disbursement.findUnique.mockResolvedValue(disbursement);
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);

      const txPrisma = {
        loan: { 
          findUnique: jest.fn().mockResolvedValue(loan),
          update: jest.fn(),
        },
        disbursement: {
          update: jest.fn().mockResolvedValue({
            ...disbursement,
            status: DisbursementStatus.ROLLED_BACK,
          }),
        },
        ledgerEntry: { create: jest.fn().mockResolvedValue({ id: 'ledger-1' }) },
        account: { update: jest.fn() },
        auditLog: { create: jest.fn() },
        repaymentSchedule: { deleteMany: jest.fn() },
      };

      mockPrisma.$transaction.mockImplementation(async (callback) => callback(txPrisma));

      await service.rollbackDisbursement('disb-1', 'testuser');

      expect(txPrisma.disbursement.update).toHaveBeenCalledWith({
        where: { id: disbursement.id },
        data: { status: DisbursementStatus.ROLLED_BACK },
      });
    });
  });
});