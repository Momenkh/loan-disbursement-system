/*
  Warnings:

  - You are about to drop the column `user_id` on the `accounts` table. All the data in the column will be lost.
  - You are about to drop the column `credit_account` on the `ledger_entries` table. All the data in the column will be lost.
  - You are about to drop the column `debit_account` on the `ledger_entries` table. All the data in the column will be lost.
  - You are about to drop the `_AccountToLedgerEntry` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[credit_account_id]` on the table `ledger_entries` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[debit_account_id]` on the table `ledger_entries` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[payment_id]` on the table `rollback_records` will be added. If there are existing duplicate values, this will fail.
  - Changed the type of `status` on the `disbursements` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `status` on the `loans` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `status` on the `payments` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `status` on the `repayment_schedules` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- CreateEnum
CREATE TYPE "LoanStatus" AS ENUM ('PENDING', 'ACTIVE', 'CLOSED', 'DEFAULTED');

-- CreateEnum
CREATE TYPE "DisbursementStatus" AS ENUM ('PENDING', 'COMPLETED', 'ROLLED_BACK');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'SUCCESS', 'FAILED', 'ROLLED_BACK');

-- CreateEnum
CREATE TYPE "ScheduleStatus" AS ENUM ('PENDING', 'PAID', 'LATE');

-- DropForeignKey
ALTER TABLE "_AccountToLedgerEntry" DROP CONSTRAINT "_AccountToLedgerEntry_A_fkey";

-- DropForeignKey
ALTER TABLE "_AccountToLedgerEntry" DROP CONSTRAINT "_AccountToLedgerEntry_B_fkey";

-- DropIndex
DROP INDEX "accounts_user_id_idx";

-- DropIndex
DROP INDEX "ledger_entries_credit_account_idx";

-- DropIndex
DROP INDEX "ledger_entries_debit_account_idx";

-- AlterTable
ALTER TABLE "accounts" DROP COLUMN "user_id";

-- AlterTable
ALTER TABLE "disbursements" DROP COLUMN "status",
ADD COLUMN     "status" "DisbursementStatus" NOT NULL;

-- AlterTable
ALTER TABLE "ledger_entries" DROP COLUMN "credit_account",
DROP COLUMN "debit_account",
ADD COLUMN     "credit_account_id" TEXT,
ADD COLUMN     "debit_account_id" TEXT,
ADD COLUMN     "loan_id" TEXT;

-- AlterTable
ALTER TABLE "loans" DROP COLUMN "status",
ADD COLUMN     "status" "LoanStatus" NOT NULL;

-- AlterTable
ALTER TABLE "payments" ADD COLUMN     "schedule_id" TEXT,
DROP COLUMN "status",
ADD COLUMN     "status" "PaymentStatus" NOT NULL;

-- AlterTable
ALTER TABLE "repayment_schedules" DROP COLUMN "status",
ADD COLUMN     "status" "ScheduleStatus" NOT NULL;

-- AlterTable
ALTER TABLE "rollback_records" ADD COLUMN     "disbursement_id" TEXT,
ADD COLUMN     "payment_id" TEXT;

-- DropTable
DROP TABLE "_AccountToLedgerEntry";

-- CreateIndex
CREATE UNIQUE INDEX "ledger_entries_credit_account_id_key" ON "ledger_entries"("credit_account_id");

-- CreateIndex
CREATE UNIQUE INDEX "ledger_entries_debit_account_id_key" ON "ledger_entries"("debit_account_id");

-- CreateIndex
CREATE INDEX "ledger_entries_credit_account_id_idx" ON "ledger_entries"("credit_account_id");

-- CreateIndex
CREATE INDEX "ledger_entries_debit_account_id_idx" ON "ledger_entries"("debit_account_id");

-- CreateIndex
CREATE UNIQUE INDEX "rollback_records_payment_id_key" ON "rollback_records"("payment_id");

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_schedule_id_fkey" FOREIGN KEY ("schedule_id") REFERENCES "repayment_schedules"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rollback_records" ADD CONSTRAINT "rollback_records_disbursement_id_fkey" FOREIGN KEY ("disbursement_id") REFERENCES "disbursements"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rollback_records" ADD CONSTRAINT "rollback_records_payment_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "payments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ledger_entries" ADD CONSTRAINT "ledger_entries_credit_account_id_fkey" FOREIGN KEY ("credit_account_id") REFERENCES "accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ledger_entries" ADD CONSTRAINT "ledger_entries_debit_account_id_fkey" FOREIGN KEY ("debit_account_id") REFERENCES "accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ledger_entries" ADD CONSTRAINT "ledger_entries_loan_id_fkey" FOREIGN KEY ("loan_id") REFERENCES "loans"("id") ON DELETE SET NULL ON UPDATE CASCADE;
