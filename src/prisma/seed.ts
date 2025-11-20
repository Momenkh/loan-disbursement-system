import { PrismaClient, Prisma } from '@prisma/client';
import { env } from 'process';

/**
 * Comprehensive idempotent seed for the loan-disbursement app.
 * Creates:
 * - a sample client
 * - platform & user accounts
 * - a loan (approved)
 * - a disbursement for that loan
 * - repayment schedule (if not present)
 * - a sample payment for the first installment
 * - ledger entries for disbursement and repayment
 * - audit logs and a sample rollback record
 *
 * Usage (development):
 *   NODE_ENV=development npx ts-node --transpile-only src/prisma/seed.ts
 * To run in production you MUST set FORCE_SEED=true
 */

const prisma = new PrismaClient();

async function main() {
  if (process.env.NODE_ENV === 'production' && process.env.FORCE_SEED !== 'true') {
    throw new Error('Seeding in production is disabled. Set FORCE_SEED=true to override.');
  }

  // Helpful constants (fixed ids to make seeding idempotent)
  const CLIENT_ID = 'seed-client-1';
  const LOAN_ID = 'seed-loan-1';
  const PAYMENT_ID = 'seed-payment-1';
  const PLATFORM_ACCOUNT = 'PLATFORM_FUNDS';
  const USER_ACCOUNT = `USER_BALANCE_${CLIENT_ID}`;
  const DISBURSEMENT_TXN = 'txn-disb-seed';
  const REPAYMENT_TXN = 'txn-repay-seed-1';
  const ROLLBACK_TXN = 'rollback-seed-1';

  try {
    // 1) Create client
    const client = await prisma.client.upsert({
      where: { email: 'jane.doe+seed@example.com' },
      create: {
        id: CLIENT_ID,
        name: 'Jane Doe',
        email: 'jane.doe+seed@example.com',
        phoneNumber: '+10000000000',
        kycStatus: 'verified',
        riskScore: 42,
      },
      update: {
        name: 'Jane Doe',
        phoneNumber: '+10000000000',
        kycStatus: 'verified',
        riskScore: 42,
      },
    });

    console.log('Client ready:', client.id);

    // 2) Create platform & user accounts (idempotent via unique name)
    await prisma.account.upsert({
      where: { name: PLATFORM_ACCOUNT },
      create: { name: PLATFORM_ACCOUNT, type: 'system', balance: new Prisma.Decimal(1000000) },
      update: { type: 'system' },
    });

    await prisma.account.upsert({
      where: { name: USER_ACCOUNT },
      create: { name: USER_ACCOUNT, type: 'user', userId: client.id, balance: new Prisma.Decimal(0) },
      update: { userId: client.id },
    });

    console.log('Accounts ensured.');

    // 3) Create loan (use fixed id for idempotency)
    const loanAmount = new Prisma.Decimal(5000);
    const interestRate = new Prisma.Decimal(12.5);
    const tenor = 12; // months

    await prisma.loan.upsert({
      where: { id: LOAN_ID },
      create: {
        id: LOAN_ID,
        clientId: client.id,
        amount: loanAmount,
        interestRate: interestRate,
        tenor,
        status: 'approved',
      },
      update: {
        amount: loanAmount,
        interestRate: interestRate,
        tenor,
        status: 'approved',
      },
    });

    console.log('Loan ensured:', LOAN_ID);

    // 4) Create disbursement (unique by loanId)
    const now = new Date();
    await prisma.disbursement.upsert({
      where: { loanId: LOAN_ID },
      create: {
        loanId: LOAN_ID,
        amount: loanAmount,
        disbursementDate: now,
        status: 'completed',
      },
      update: { amount: loanAmount, status: 'completed' },
    });

    console.log('Disbursement ensured for loan:', LOAN_ID);

    // 5) Ensure repayment schedule exists (create if none)
    const existingSchedule = await prisma.repaymentSchedule.findFirst({ where: { loanId: LOAN_ID } });
    if (!existingSchedule) {
      const principalPerInstallment = loanAmount.div(tenor);
      const monthlyInterest = loanAmount.mul(interestRate).div(new Prisma.Decimal(100)).div(new Prisma.Decimal(12));

      const scheduleData = Array.from({ length: tenor }).map((_, i) => ({
        id: undefined as unknown as string, // Prisma will generate id
        loanId: LOAN_ID,
        installmentNumber: i + 1,
        dueDate: new Date(new Date().getFullYear(), new Date().getMonth() + i + 1, 1),
        principalAmount: principalPerInstallment.toFixed(2),
        interestAmount: monthlyInterest.toFixed(2),
        status: 'pending',
      }));

      // createMany expects object values to match exact types; use create in loop for precision
      for (const item of scheduleData) {
        await prisma.repaymentSchedule.create({ data: {
          loanId: item.loanId,
          installmentNumber: item.installmentNumber,
          dueDate: item.dueDate,
          principalAmount: new Prisma.Decimal(item.principalAmount),
          interestAmount: new Prisma.Decimal(item.interestAmount),
          status: item.status,
        }});
      }

      console.log('Repayment schedule created (', tenor, 'installments).');
    } else {
      console.log('Repayment schedule already present for loan:', LOAN_ID);
    }

    // 6) Create a sample payment for first installment (idempotent via fixed id)
    const firstSchedule = await prisma.repaymentSchedule.findFirst({ where: { loanId: LOAN_ID }, orderBy: { installmentNumber: 'asc' } });
    if (firstSchedule) {
      const principal = firstSchedule.principalAmount;
      const interest = firstSchedule.interestAmount;
      const paymentAmount = principal.add(interest);

      await prisma.payment.upsert({
        where: { id: PAYMENT_ID },
        create: {
          id: PAYMENT_ID,
          loanId: LOAN_ID,
          amount: paymentAmount,
          paymentDate: new Date(),
          principalPaid: principal,
          interestPaid: interest,
          lateFeePaid: new Prisma.Decimal(0),
          daysLate: 0,
          status: 'completed',
        },
        update: {
          amount: paymentAmount,
          principalPaid: principal,
          interestPaid: interest,
          status: 'completed',
        },
      });

      console.log('Payment ensured:', PAYMENT_ID);
    }

    // 7) Create ledger entries if not present (disbursement + repayment)
    const disbExists = await prisma.ledgerEntry.findFirst({ where: { transactionId: DISBURSEMENT_TXN } });
    if (!disbExists) {
      await prisma.ledgerEntry.create({ data: {
        transactionId: DISBURSEMENT_TXN,
        debitAccount: PLATFORM_ACCOUNT,
        creditAccount: USER_ACCOUNT,
        amount: loanAmount,
      }});
      // adjust balances (simple, for demo)
      await prisma.account.update({ where: { name: PLATFORM_ACCOUNT }, data: { balance: { decrement: loanAmount } as any } });
      await prisma.account.update({ where: { name: USER_ACCOUNT }, data: { balance: loanAmount } });
      console.log('Ledger entry created for disbursement.');
    } else {
      console.log('Disbursement ledger entry already exists.');
    }

    const repayExists = await prisma.ledgerEntry.findFirst({ where: { transactionId: REPAYMENT_TXN } });
    if (!repayExists) {
      const scheduleFirst = await prisma.repaymentSchedule.findFirst({ where: { loanId: LOAN_ID }, orderBy: { installmentNumber: 'asc' } });
      if (!scheduleFirst) {
        console.log('No repayment schedule found; skipping repayment ledger entries.');
      } else {
        // principal
        await prisma.ledgerEntry.create({ data: {
          transactionId: REPAYMENT_TXN,
          debitAccount: USER_ACCOUNT,
          creditAccount: PLATFORM_ACCOUNT,
          amount: scheduleFirst.principalAmount,
        }});
        // interest
        await prisma.ledgerEntry.create({ data: {
          transactionId: REPAYMENT_TXN,
          debitAccount: USER_ACCOUNT,
          creditAccount: 'INCOME_INTEREST',
          amount: scheduleFirst.interestAmount,
        }});
        // update balances simplistic
        await prisma.account.update({ where: { name: USER_ACCOUNT }, data: { balance: { decrement: scheduleFirst.principalAmount.add(scheduleFirst.interestAmount) } as any } });
        await prisma.account.update({ where: { name: PLATFORM_ACCOUNT }, data: { balance: { increment: scheduleFirst.principalAmount } as any } });
        console.log('Ledger entries created for repayment.');
      }
    } else {
      console.log('Repayment ledger entries already exist.');
    }

    // 8) Audit logs
    await prisma.auditLog.createMany({ data: [
      { transactionId: DISBURSEMENT_TXN, operation: 'disbursement.create', userId: client.id, metadata: { loanId: LOAN_ID } as any },
      { transactionId: REPAYMENT_TXN, operation: 'payment.create', userId: client.id, metadata: { loanId: LOAN_ID } as any },
    ], skipDuplicates: true });
    console.log('Audit logs inserted.');

    // 9) Optional: sample rollback record (do not actually alter other records) — idempotent via unique transactionId
    await prisma.rollbackRecord.upsert({
      where: { transactionId: ROLLBACK_TXN },
      create: {
        transactionId: ROLLBACK_TXN,
        originalOperation: 'repayment',
        rollbackReason: 'seed: demo rollback',
        compensatingActions: { actions: ['ledger_reverse'] },
        rolledBackBy: 'system:seed',
      },
      update: { rollbackReason: 'seed: demo rollback' },
    });

    console.log('Rollback record ensured (demo).');

    console.log('\nSeeding complete — sample client, loan, disbursement, schedule, payment, ledger entries, audit log and rollback created.');
  } catch (err) {
    console.error('Seeding failed:', err);
    throw err;
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});