/*
  Warnings:

  - A unique constraint covering the columns `[transaction_id]` on the table `rollback_records` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "rollback_records_transaction_id_key" ON "rollback_records"("transaction_id");
