// import { PrismaClient } from '@prisma/client';
// const prisma = new PrismaClient();

// async function main() {
//   // ---------- Create Clients ----------
//   const clients = [] as any[];
//   clients.push(await prisma.client.create({ data: { name: 'Ali Ahmed', email: 'ali@example.com', phoneNumber: '+201234567890', kycStatus: 'approved', riskScore: 5 } }));
//   clients.push(await prisma.client.create({ data: { name: 'Sara Mohamed', email: 'sara@example.com', phoneNumber: '+201987654321', kycStatus: 'pending', riskScore: 7 } }));
//   clients.push(await prisma.client.create({ data: { name: 'Omar Khaled', email: 'omar@example.com', phoneNumber: '+201122334455', kycStatus: 'approved', riskScore: 9 } }));
//   clients.push(await prisma.client.create({ data: { name: 'Mona Ali', email: 'mona@example.com', phoneNumber: '+201144556677', kycStatus: 'rejected', riskScore: 3 } }));

//   // ---------- Create Loans ----------
//   const loans = [] as any[];
//   loans.push(await prisma.loan.create({ data: { amount: 10000.00, interestRate: 12.5, tenor: 12, status: 'ACTIVE', clientId: clients[0].id } }));
//   loans.push(await prisma.loan.create({ data: { amount: 5000.00, interestRate: 10.0, tenor: 6, status: 'PENDING', clientId: clients[1].id } }));
//   loans.push(await prisma.loan.create({ data: { amount: 8000.00, interestRate: 15.0, tenor: 8, status: 'CLOSED', clientId: clients[2].id } }));
//   loans.push(await prisma.loan.create({ data: { amount: 12000.00, interestRate: 8.0, tenor: 10, status: 'DEFAULTED', clientId: clients[3].id } }));

//   // ---------- Create Disbursements ----------
//   const disbursements = [] as any[];
//   for (const loan of loans) {
//     disbursements.push(await prisma.disbursement.create({ data: { loanId: loan.id, amount: loan.amount, disbursementDate: new Date(), status: 'COMPLETED' } }));
//   }

//   // ---------- Create Accounts ----------
//   const cashAccount = await prisma.account.create({ data: { name: 'Cash Account', type: 'ASSET', balance: 50000.00 } });
//   const feesAccount = await prisma.account.create({ data: { name: 'Fees Income', type: 'INCOME', balance: 0.00 } });
//   const interestAccount = await prisma.account.create({ data: { name: 'Interest Income', type: 'INCOME', balance: 0.00 } });
//   const paymentGatewayAccount = await prisma.account.create({ data: { name: 'Cash Payments', type: 'ASSET', balance: 0.00 } });

//   // ---------- Create Ledger Entries ----------
//   for (const [index, loan] of loans.entries()) {
//     await prisma.ledgerEntry.create({
//       data: {
//         transactionId: `DISBURSEMENT_LOAN${index+1}`,
//         amount: loan.amount,
//         creditAccountId: interestAccount.id,
//         debitAccountId: cashAccount.id,
//         loanId: loan.id
//       }
//     });
//   }

//   // ---------- Create Repayment Schedules ----------
//   for (const loan of loans) {
//     const months = loan.tenor;
//     for (let i = 1; i <= months; i++) {
//       await prisma.repaymentSchedule.create({
//         data: {
//           loanId: loan.id,
//           installmentNumber: i,
//           dueDate: new Date(new Date().setMonth(new Date().getMonth() + i)),
//           principalAmount: Number((loan.amount / months).toFixed(2)),
//           interestAmount: Number(((loan.amount * (loan.interestRate/100)) / months).toFixed(2)),
//           status: 'PENDING'
//         }
//       });
//     }
//   }

//   // ---------- Create Payments ----------
//   for (const loan of loans) {
//     const schedule = await prisma.repaymentSchedule.findFirst({ where: { loanId: loan.id } });
//     if (schedule) {
//       await prisma.payment.create({
//         data: {
//           loanId: loan.id,
//           amount: Number(schedule.principalAmount) + Number(schedule.interestAmount),
//           principalPaid: schedule.principalAmount,
//           interestPaid: schedule.interestAmount,
//           lateFeePaid: 0,
//           daysLate: 0,
//           paymentDate: new Date(),
//           status: 'SUCCESS',
//           scheduleId: schedule.id
//         }
//       });
//     }
//   }

//   // ---------- Create Rollback Records ----------
//   await prisma.rollbackRecord.create({
//     data: {
//       transactionId: 'ROLLBACK1',
//       originalOperation: 'DISBURSEMENT',
//       rollbackReason: 'Test rollback',
//       compensatingActions: { note: 'Compensate for rollback' },
//       disbursementId: disbursements[0].id
//     }
//   });

//   // ---------- Create Audit Logs ----------
//   for (const loan of loans) {
//     await prisma.auditLog.create({
//       data: {
//         transactionId: `AUDIT_LOAN_${loan.id}`,
//         operation: 'LOAN_CREATION',
//         metadata: { amount: loan.amount, tenor: loan.tenor },
//         userId: null
//       }
//     });
//   }

//   console.log('✅ Full seed data created successfully');
// }

// main()
//   .catch(e => { console.error(e); process.exit(1); })
//   .finally(async () => { await prisma.$disconnect(); });

import { PrismaClient, LoanStatus, DisbursementStatus, PaymentStatus, ScheduleStatus, UserRole, TransactionType } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  // ----------------------------------------------------
  // ACCOUNTS (for ledger)
  // ----------------------------------------------------
  const [cash, loanReceivable, interestRevenue, lateFeeRevenue] =
    await Promise.all([
      prisma.account.create({ data: { name: "Cash Account", type: "asset", balance: 100000 } }),
      prisma.account.create({ data: { name: "Loan Receivable", type: "asset", balance: 0 } }),
      prisma.account.create({ data: { name: "Interest Revenue", type: "income", balance: 0 } }),
      prisma.account.create({ data: { name: "Late Fee Revenue", type: "income", balance: 0 } })
    ]);

  // ----------------------------------------------------
  // USERS
  // ----------------------------------------------------
  const admin = await prisma.user.create({
    data: {
      username: "admin",
      password: "hashed-password-admin",
      role: UserRole.ADMIN
    }
  });

  const staff = await prisma.user.create({
    data: {
      username: "staff",
      password: "hashed-password-staff",
      role: UserRole.STAFF
    }
  });

  // ----------------------------------------------------
  // CLIENTS
  // ----------------------------------------------------
  const clientA = await prisma.client.create({
    data: {
      name: "Ahmed Ali",
      email: "ahmed@example.com",
      phoneNumber: "01012345678",
      kycStatus: "verified",
      riskScore: 80
    }
  });

  const clientB = await prisma.client.create({
    data: {
      name: "Sara Mohamed",
      email: "sara@example.com",
      phoneNumber: "01087654321",
      kycStatus: "pending",
      riskScore: 55
    }
  });

  const now = new Date();

  // ----------------------------------------------------
  // LOANS — Creating scenarios for every loan status
  // ----------------------------------------------------

  // 1. PENDING LOAN (no disbursement)
  const loanPending = await prisma.loan.create({
    data: {
      amount: 5000,
      interestRate: 10,
      tenor: 6,
      status: LoanStatus.PENDING,
      clientId: clientA.id
    }
  });

  // 2. REJECTED LOAN
  const loanRejected = await prisma.loan.create({
    data: {
      amount: 10000,
      interestRate: 12,
      tenor: 12,
      status: LoanStatus.REJECTED,
      clientId: clientB.id
    }
  });

  // 3. APPROVED loan (no disbursement yet)
  const loanApproved = await prisma.loan.create({
    data: {
      amount: 8000,
      interestRate: 12,
      tenor: 8,
      status: LoanStatus.APPROVED,
      clientId: clientA.id
    }
  });

  // 4. ACTIVE loan — completed disbursement, schedules, some paid
  const loanActive = await prisma.loan.create({
    data: {
      amount: 20000,
      interestRate: 14,
      tenor: 12,
      status: LoanStatus.ACTIVE,
      clientId: clientA.id
    }
  });

  // 5. CLOSED loan
  const loanClosed = await prisma.loan.create({
    data: {
      amount: 15000,
      interestRate: 10,
      tenor: 6,
      status: LoanStatus.CLOSED,
      clientId: clientB.id
    }
  });

  // 6. DEFAULTED loan
  const loanDefaulted = await prisma.loan.create({
    data: {
      amount: 12000,
      interestRate: 16,
      tenor: 10,
      status: LoanStatus.DEFAULTED,
      clientId: clientA.id
    }
  });

  // ----------------------------------------------------
  // DISBURSEMENTS (active, closed, defaulted)
  // ----------------------------------------------------

  const disbActive = await prisma.disbursement.create({
    data: {
      loanId: loanActive.id,
      amount: 20000,
      disbursementDate: new Date("2024-01-15"),
      status: DisbursementStatus.COMPLETED
    }
  });

  const disbClosed = await prisma.disbursement.create({
    data: {
      loanId: loanClosed.id,
      amount: 15000,
      disbursementDate: new Date("2023-03-10"),
      status: DisbursementStatus.COMPLETED
    }
  });

  const disbDefaulted = await prisma.disbursement.create({
    data: {
      loanId: loanDefaulted.id,
      amount: 12000,
      disbursementDate: new Date("2023-08-01"),
      status: DisbursementStatus.COMPLETED
    }
  });

  // ----------------------------------------------------
  // ROLLED-BACK DISBURSEMENT example
  // ----------------------------------------------------
  const loanRollback = await prisma.loan.create({
    data: {
      amount: 7000,
      interestRate: 14,
      tenor: 4,
      status: LoanStatus.REJECTED,
      clientId: clientB.id
    }
  });

  const disbRollback = await prisma.disbursement.create({
    data: {
      loanId: loanRollback.id,
      amount: 7000,
      disbursementDate: new Date("2024-02-10"),
      status: DisbursementStatus.ROLLED_BACK,
      rolledBackAt: new Date("2024-02-11")
    }
  });

  await prisma.rollbackRecord.create({
    data: {
      transactionId: `rollback-${Date.now()}`,
      originalOperation: "DISBURSEMENT",
      rollbackReason: "Fraud detection",
      compensatingActions: { reversed: true },
      disbursementId: disbRollback.id
    }
  });

  // ----------------------------------------------------
  // REPAYMENT SCHEDULES + PAYMENTS (for active, closed, defaulted)
  // ----------------------------------------------------

  async function generateSchedules(loanId: string, start: Date, count: number) {
    const schedules = [] as any[];
    for (let i = 1; i <= count; i++) {
      schedules.push(
        prisma.repaymentSchedule.create({
          data: {
            loanId,
            installmentNumber: i,
            dueDate: new Date(start.getFullYear(), start.getMonth() + i, 5),
            principalAmount: 1000,
            interestAmount: 150,
            status: ScheduleStatus.PENDING
          }
        })
      );
    }
    return Promise.all(schedules);
  }

  const activeSchedules = await generateSchedules(loanActive.id, new Date("2024-01-01"), 12);
  const closedSchedules = await generateSchedules(loanClosed.id, new Date("2023-03-01"), 6);
  const defaultSchedules = await generateSchedules(loanDefaulted.id, new Date("2023-08-01"), 10);

  // ----------------------------------------------------
  // PAYMENTS SCENARIOS
  // ----------------------------------------------------

  // ACTIVE: some paid, some late, some future
  await prisma.payment.create({
    data: {
      loanId: loanActive.id,
      amount: 1150,
      paymentDate: new Date("2024-02-06"),
      principalPaid: 1000,
      interestPaid: 150,
      lateFeePaid: 0,
      daysLate: 1,
      status: PaymentStatus.SUCCESS,
      scheduleId: activeSchedules[1].id
    }
  });

  // ACTIVE: late payment
  await prisma.payment.create({
    data: {
      loanId: loanActive.id,
      amount: 1200,
      paymentDate: new Date("2024-03-20"),
      principalPaid: 1000,
      interestPaid: 150,
      lateFeePaid: 50,
      daysLate: 10,
      status: PaymentStatus.SUCCESS,
      scheduleId: activeSchedules[2].id
    }
  });

  // CLOSED: all paid
  for (const schedule of closedSchedules) {
    await prisma.payment.create({
      data: {
        loanId: loanClosed.id,
        amount: 1150,
        paymentDate: new Date(schedule.dueDate.getTime() + 24 * 60 * 60 * 1000),
        principalPaid: 1000,
        interestPaid: 150,
        lateFeePaid: 0,
        daysLate: 0,
        status: PaymentStatus.SUCCESS,
        scheduleId: schedule.id
      }
    });
  }

  // DEFAULTED: missed many, paid few
  await prisma.payment.create({
    data: {
      loanId: loanDefaulted.id,
      amount: 1150,
      paymentDate: new Date("2023-09-06"),
      principalPaid: 1000,
      interestPaid: 150,
      lateFeePaid: 0,
      daysLate: 1,
      status: PaymentStatus.SUCCESS,
      scheduleId: defaultSchedules[1].id
    }
  });

  await prisma.payment.create({
    data: {
      loanId: loanDefaulted.id,
      amount: 0,
      paymentDate: new Date("2023-10-10"),
      principalPaid: 0,
      interestPaid: 0,
      lateFeePaid: 0,
      daysLate: 30,
      status: PaymentStatus.FAILED,
      scheduleId: defaultSchedules[2].id
    }
  });

  // ----------------------------------------------------
  // LEDGER ENTRIES for disbursement and payments
  // ----------------------------------------------------

  await prisma.ledgerEntry.create({
    data: {
      transactionType: TransactionType.DISBURSEMENT,
      amount: 20000,
      creditAccountId: cash.id,
      debitAccountId: loanReceivable.id,
      loanId: loanActive.id
    }
  });

  await prisma.ledgerEntry.create({
    data: {
      transactionType: TransactionType.DISBURSEMENT,
      amount: 15000,
      creditAccountId: cash.id,
      debitAccountId: loanReceivable.id,
      loanId: loanClosed.id
    }
  });

  // ----------------------------------------------------
  // AUDIT LOGS
  // ----------------------------------------------------

  await prisma.auditLog.create({
    data: {
      transactionId: `audit-${Date.now()}`,
      operation: "CREATE_LOAN",
      userId: admin.id,
      metadata: { loanId: loanActive.id }
    }
  });

  await prisma.auditLog.create({
    data: {
      transactionId: `audit-${Date.now() + 1}`,
      operation: "MAKE_PAYMENT",
      userId: staff.id,
      metadata: { loanId: loanActive.id }
    }
  });

  console.log("🌱 Seeding completed!");
}

main().catch(console.error).finally(() => prisma.$disconnect());
