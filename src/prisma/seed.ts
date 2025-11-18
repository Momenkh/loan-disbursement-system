import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting database seed...');

  // --------------------------
  // PLATFORM ACCOUNTS
  // --------------------------
  const platformFunds = await prisma.account.upsert({
    where: { name: 'PLATFORM_FUNDS' },
    update: {},
    create: {
      name: 'PLATFORM_FUNDS',
      type: 'platform',
      balance: 1000000.00, // initial capital
    },
  });

  const interestIncome = await prisma.account.upsert({
    where: { name: 'INCOME_INTEREST' },
    update: {},
    create: {
      name: 'INCOME_INTEREST',
      type: 'income',
      balance: 0,
    },
  });

  const lateFeeIncome = await prisma.account.upsert({
    where: { name: 'INCOME_LATE_FEES' },
    update: {},
    create: {
      name: 'INCOME_LATE_FEES',
      type: 'income',
      balance: 0,
    },
  });

  // --------------------------
  // OPTIONAL: Example borrower
  // --------------------------
  const borrowerId = 'usr_demo_123';

  const userAccount = await prisma.account.upsert({
    where: { name: `USER_BALANCE_${borrowerId}` },
    update: {},
    create: {
      name: `USER_BALANCE_${borrowerId}`,
      type: 'user',
      userId: borrowerId,
      balance: 0,
    },
  });

  // --------------------------
  // OPTIONAL: Example loan (disabled by default)
  // --------------------------
  // Uncomment if you want a test loan
  /*
  const loan = await prisma.loan.create({
    data: {
      borrowerId,
      amount: 5000.00,
      interestRate: 12.00,
      tenor: 12,
      status: 'pending',
    },
  });
  */

  console.log('Seed completed.');
  console.log({
    platformFunds,
    interestIncome,
    lateFeeIncome,
    userAccount,
  });
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    return prisma.$disconnect().finally(() => process.exit(1));
  });
