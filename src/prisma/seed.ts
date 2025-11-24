import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Refusing to run seed in production');
  }

  console.log('Running seed...');

  // Deterministic IDs so seed is idempotent and relations are stable
  const adminUsername = 'admin';
  const staffUsername = 'staff';
  const clientEmail = 'alice@example.com';

  const adminId = '00000000-0000-0000-0000-000000000001';
  const staffId = '00000000-0000-0000-0000-000000000002';

  const cashAccountName = 'USER_CASH';
  const loansAccountName = 'INCOME_LATE_FEES';
  const interestAccountName = 'INCOME_INTEREST';
  const platformFundsAccountName = 'PLATFORM_FUNDS';

  const clientId = '11111111-1111-1111-1111-111111111111';
  const loanId = '22222222-2222-2222-2222-222222222222';
  const disbursementId = '33333333-3333-3333-3333-333333333333';
  const paymentId = '44444444-4444-4444-4444-444444444444';

  const ledgerTxDisburse = '55555555-5555-5555-5555-555555555555';
  const ledgerTxPayment = '66666666-6666-6666-6666-666666666666';
  const ledgerTxRollback = '77777777-7777-7777-7777-777777777777';

  // Users
  await prisma.user.upsert({
    where: { username: adminUsername },
    update: {},
    create: {
      id: adminId,
      username: adminUsername,
      password: '$2b$10$CwTycUXWue0Thq9StjUM0uMFnO06ozXGXxrQcSM7aHnSUdwrEDG/u',
      role: 'ADMIN',
    },
  });

  await prisma.user.upsert({
    where: { username: staffUsername },
    update: {},
    create: {
      id: staffId,
      username: staffUsername,
      password: '$2b$10$CwTycUXWue0Thq9StjUM0uMFnO06ozXGXxrQcSM7aHnSUdwrEDG/u',
      role: 'STAFF',
    },
  });

  // Accounts (unique by name)
  const cashAccount = await prisma.account.upsert({
    where: { name: cashAccountName },
    update: { balance: '100000.00' },
    create: { name: cashAccountName, type: 'asset', balance: '100000.00' },
  });

  const loansAccount = await prisma.account.upsert({
    where: { name: loansAccountName },
    update: { balance: '0.00' },
    create: { name: loansAccountName, type: 'asset', balance: '0.00' },
  });

  const interestAccount = await prisma.account.upsert({
    where: { name: interestAccountName },
    update: { balance: '0.00' },
    create: { name: interestAccountName, type: 'income', balance: '0.00' },
  });

  const platformFundsAccount = await prisma.account.upsert({
    where: { name: platformFundsAccountName },
    update: { balance: '0.00' },
    create: { name: platformFundsAccountName, type: 'liability', balance: '100000.00' },
  });

  // Client (unique by email)
  await prisma.client.upsert({
    where: { email: clientEmail },
    update: {},
    create: {
      id: clientId,
      name: 'Alice Example',
      email: clientEmail,
      phoneNumber: '+15555550100',
      kycStatus: 'verified',
      riskScore: 42,
    },
  });

  // Loan (use fixed id so we can reference it)
  await prisma.loan.upsert({
    where: { id: loanId },
    update: {
      amount: '1000.00',
      interestRate: '5.00',
      tenor: 12,
      numberOfInstallments: 12,
      status: 'APPROVED',
      clientId: clientId,
    },
    create: {
      id: loanId,
      amount: '1000.00',
      interestRate: '5.00',
      tenor: 12,
      numberOfInstallments: 12,
      status: 'APPROVED',
      clientId: clientId,
    },
  });

  // Disbursement
  await prisma.disbursement.upsert({
    where: { id: disbursementId },
    update: {
      amount: '1000.00',
      status: 'COMPLETED',
    },
    create: {
      id: disbursementId,
      loanId: loanId,
      amount: '1000.00',
      disbursementDate: new Date(),
      status: 'COMPLETED',
    },
  });

  // Ledger entry for disbursement (credit cash, debit loans)
  await prisma.ledgerEntry.upsert({
    where: { id: ledgerTxDisburse },
    update: {
      transactionType: 'DISBURSEMENT',
      amount: '1000.00',
      creditAccountId: cashAccount.id,
      debitAccountId: loansAccount.id,
      loanId: loanId,
    },
    create: {
      id: ledgerTxDisburse,
      transactionType: 'DISBURSEMENT',
      amount: '1000.00',
      creditAccountId: cashAccount.id,
      debitAccountId: loansAccount.id,
      loanId: loanId,
    },
  });

  // Audit log referencing the above ledger transaction
  await prisma.auditLog.upsert({
    where: { transactionId: ledgerTxDisburse },
    update: {},
    create: {
      transactionId: ledgerTxDisburse,
      operation: 'DISBURSEMENT',
      userId: adminId,
      metadata: { loanId, disbursementId },
    },
  });

  // Create a few repayment schedule entries
  const schedules = [1, 2, 3, 4].map((n) => ({
    id: `${loanId}-sched-${n}`,
    loanId: loanId,
    installmentNumber: n,
    dueDate: new Date(Date.now() + n * 7 * 24 * 60 * 60 * 1000),
    principalAmount: '250.00',
    interestAmount: '10.00',
    status: 'PENDING' as const,
  }));

  for (const s of schedules) {
    await prisma.repaymentSchedule.upsert({
      where: { id: s.id },
      update: {},
      create: s,
    });
  }

  // Payment (partial) and ledger entry
  await prisma.payment.upsert({
    where: { id: paymentId },
    update: {
      amount: '260.00',
      principalPaid: '250.00',
      interestPaid: '10.00',
      paymentDate: new Date(),
      status: 'SUCCESS',
      loanId: loanId,
      scheduleId: schedules[0].id,
    },
    create: {
      id: paymentId,
      loanId: loanId,
      amount: '260.00',
      paymentDate: new Date(),
      principalPaid: '250.00',
      interestPaid: '10.00',
      lateFeePaid: '0.00',
      daysLate: 0,
      status: 'SUCCESS',
      scheduleId: schedules[0].id,
    },
  });

  await prisma.ledgerEntry.upsert({
    where: { id: ledgerTxPayment },
    update: {
      transactionType: 'PAYMENT',
      amount: '260.00',
      creditAccountId: cashAccount.id,
      debitAccountId: loansAccount.id,
      loanId: loanId,
    },
    create: {
      id: ledgerTxPayment,
      transactionType: 'PAYMENT',
      amount: '260.00',
      creditAccountId: cashAccount.id,
      debitAccountId: loansAccount.id,
      loanId: loanId,
    },
  });

  await prisma.auditLog.upsert({
    where: { transactionId: ledgerTxPayment },
    update: {},
    create: {
      transactionId: ledgerTxPayment,
      operation: 'PAYMENT',
      userId: staffId,
      metadata: { paymentId, loanId },
    },
  });

  // Example rollback record for demonstration (ties to disbursement)
  await prisma.rollbackRecord.upsert({
    where: { transactionId: ledgerTxRollback },
    update: {},
    create: {
      transactionId: ledgerTxRollback,
      originalOperation: 'DISBURSEMENT',
      rollbackReason: 'demo-seed-roll-back',
      compensatingActions: { createdLedgerReversal: true },
      rolledBackBy: adminId,
      disbursementId: disbursementId,
      paymentId: null,
    },
  });

  // Create a ledger reversal entry (ROLLBACK) for demonstration
  await prisma.ledgerEntry.upsert({
    where: { id: ledgerTxRollback },
    update: {
      transactionType: 'ROLLBACK',
      amount: '1000.00',
      creditAccountId: loansAccount.id,
      debitAccountId: cashAccount.id,
      loanId: loanId,
    },
    create: {
      id: ledgerTxRollback,
      transactionType: 'ROLLBACK',
      amount: '1000.00',
      creditAccountId: loansAccount.id,
      debitAccountId: cashAccount.id,
      loanId: loanId,
    },
  });

  console.log('Seed completed successfully');
}

main()
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
