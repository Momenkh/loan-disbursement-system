/*
  Warnings:

  - You are about to drop the column `transaction_id` on the `ledger_entries` table. All the data in the column will be lost.
  - Added the required column `transaction_type` to the `ledger_entries` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "TransactionType" AS ENUM ('DISBURSEMENT', 'PAYMENT', 'ROLLBACK', 'FEE', 'INTEREST');

-- AlterTable
ALTER TABLE "ledger_entries" DROP COLUMN "transaction_id",
ADD COLUMN     "transaction_type" "TransactionType" NOT NULL;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_transaction_id_fkey" FOREIGN KEY ("transaction_id") REFERENCES "ledger_entries"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
