/*
  Warnings:

  - You are about to drop the column `account_id` on the `ledger_entries` table. All the data in the column will be lost.
  - You are about to drop the column `direction` on the `ledger_entries` table. All the data in the column will be lost.
  - Added the required column `credit_account` to the `ledger_entries` table without a default value. This is not possible if the table is not empty.
  - Added the required column `debit_account` to the `ledger_entries` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "ledger_entries" DROP CONSTRAINT "ledger_entries_account_id_fkey";

-- DropIndex
DROP INDEX "ledger_entries_account_id_idx";

-- DropIndex
DROP INDEX "ledger_entries_transaction_id_idx";

-- AlterTable
ALTER TABLE "ledger_entries" DROP COLUMN "account_id",
DROP COLUMN "direction",
ADD COLUMN     "credit_account" TEXT NOT NULL,
ADD COLUMN     "debit_account" TEXT NOT NULL;

-- CreateTable
CREATE TABLE "_AccountToLedgerEntry" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_AccountToLedgerEntry_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "_AccountToLedgerEntry_B_index" ON "_AccountToLedgerEntry"("B");

-- CreateIndex
CREATE INDEX "ledger_entries_debit_account_idx" ON "ledger_entries"("debit_account");

-- CreateIndex
CREATE INDEX "ledger_entries_credit_account_idx" ON "ledger_entries"("credit_account");

-- AddForeignKey
ALTER TABLE "_AccountToLedgerEntry" ADD CONSTRAINT "_AccountToLedgerEntry_A_fkey" FOREIGN KEY ("A") REFERENCES "accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_AccountToLedgerEntry" ADD CONSTRAINT "_AccountToLedgerEntry_B_fkey" FOREIGN KEY ("B") REFERENCES "ledger_entries"("id") ON DELETE CASCADE ON UPDATE CASCADE;
