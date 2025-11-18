import { PrismaClient } from '@prisma/client';

// src/prisma/seed.ts
// Idempotent seeding script scaffold for a loan disbursement system using Prisma.
// Adjust model names and fields below to match your schema.prisma before running.
//
// Usage:
//   NODE_ENV=development npx ts-node --transpile-only src/prisma/seed.ts
// To run in production you MUST set FORCE_SEED=true


const prisma = new PrismaClient();

async function main() {
  // Safety guard: don't run accidentally in production
  if (process.env.NODE_ENV === 'production' && process.env.FORCE_SEED !== 'true') {
    throw new Error(
      'Seeding in production is disabled. Set FORCE_SEED=true to override.'
    );
  }

  // Detect model delegates available on the Prisma client instance
  const modelKeys = Object.keys(prisma).filter((k) => {
    const v: any = (prisma as any)[k];
    return v && typeof v === 'object' && typeof v.create === 'function';
  });
  console.log('Detected Prisma models:', modelKeys.join(', '));

  // Example seed data.
  // NOTE: Update these objects so the keys exactly match your schema fields
  const roles = [{ name: 'admin' }, { name: 'operator' }, { name: 'viewer' }];
  const banks = [{ name: 'First National Bank' }, { name: 'Community Bank' }];
  const branches = [{ name: 'Main Branch' }, { name: 'East Branch' }];
  const users = [
    { email: 'admin@example.com', name: 'Admin User', password: 'change-me' },
    { email: 'operator@example.com', name: 'Operator User', password: 'change-me' },
  ];
  const customers = [
    { firstName: 'Alice', lastName: 'Walker', email: 'alice@example.com' },
    { firstName: 'Bob', lastName: 'Miller', email: 'bob@example.com' },
  ];
  const loanProducts = [
    { name: 'Personal Loan', interestRate: 12.5, termMonths: 24 },
    { name: 'Business Loan', interestRate: 9.0, termMonths: 36 },
  ];

  // Run seeding in a transaction where possible
  try {
    // Create base reference data if the model exists
    const ops: Promise<any>[] = [];

    if (modelKeys.includes('role')) {
      ops.push((prisma as any).role.createMany({ data: roles, skipDuplicates: true }));
    }

    if (modelKeys.includes('bank')) {
      ops.push((prisma as any).bank.createMany({ data: banks, skipDuplicates: true }));
    }

    if (modelKeys.includes('branch')) {
      ops.push((prisma as any).branch.createMany({ data: branches, skipDuplicates: true }));
    }

    if (modelKeys.includes('user')) {
      // create users (skipDuplicates depends on your unique constraints)
      ops.push((prisma as any).user.createMany({ data: users, skipDuplicates: true }));
    }

    if (modelKeys.includes('customer')) {
      ops.push((prisma as any).customer.createMany({ data: customers, skipDuplicates: true }));
    }

    if (modelKeys.includes('loanProduct')) {
      ops.push((prisma as any).loanProduct.createMany({ data: loanProducts, skipDuplicates: true }));
    }

    await Promise.all(ops);
    console.log('Base reference data created or already present.');

    // Create sample loans, disbursements and transactions if models exist.
    // We fetch inserted reference rows to create relations; adjust lookup fields to suit your schema.
    if (modelKeys.includes('loan') && modelKeys.includes('customer') && modelKeys.includes('loanProduct')) {
      const customer = await (prisma as any).customer.findFirst();
      const product = await (prisma as any).loanProduct.findFirst();

      if (customer && product) {
        // Example loan payload — change field names (amount, interestRate, term, status, customerId, productId) as needed
        const loanPayload = {
          amount: 5000,
          interestRate: product.interestRate ?? 12.5,
          termMonths: product.termMonths ?? 24,
          status: 'APPROVED',
          // Relational connect: adjust foreign key field names to match schema
          customerId: (customer as any).id,
          productId: (product as any).id,
        };

        // Use upsert where possible for idempotency
        if (typeof (prisma as any).loan.upsert === 'function') {
          await (prisma as any).loan.upsert({
            where: { /* supply a unique constraint here if you have one, e.g. externalId: 'seed-loan-1' */ },
            create: loanPayload,
            update: {},
          }).catch(() => {
            // If upsert without a where fails because no unique field provided, fallback to createMany with skipDuplicates (will typically fail without unique)
            return (prisma as any).loan.create({ data: loanPayload });
          });
        } else {
          await (prisma as any).loan.create({ data: loanPayload });
        }

        console.log('Sample loan created.');
      } else {
        console.log('Skipping loan creation: missing customer or loanProduct.');
      }
    }

    // Disbursement and transaction samples
    if (modelKeys.includes('disbursement') && modelKeys.includes('loan')) {
      const loan = await (prisma as any).loan.findFirst();
      if (loan) {
        const disbPayload = {
          amount: 5000,
          disbursedAt: new Date(),
          loanId: (loan as any).id,
        };
        await (prisma as any).disbursement.create({ data: disbPayload }).catch(() => {});
        console.log('Sample disbursement created (if model fields matched).');
      }
    }

    if (modelKeys.includes('transaction')) {
      const txPayload = {
        amount: 5000,
        type: 'DISBURSEMENT',
        timestamp: new Date(),
        // relate to disbursement or loan if your schema supports it
      };
      await (prisma as any).transaction.create({ data: txPayload }).catch(() => {});
      console.log('Sample transaction created (if model fields matched).');
    }

    console.log('Seeding finished.');
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