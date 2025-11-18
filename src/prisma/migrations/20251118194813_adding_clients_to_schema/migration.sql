/*
  Warnings:

  - You are about to drop the column `borrower_id` on the `loans` table. All the data in the column will be lost.
  - Added the required column `client_id` to the `loans` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "loans_borrower_id_idx";

-- AlterTable
ALTER TABLE "loans" DROP COLUMN "borrower_id",
ADD COLUMN     "client_id" TEXT NOT NULL;

-- CreateTable
CREATE TABLE "clients" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phoneNumber" TEXT,
    "kycStatus" TEXT NOT NULL DEFAULT 'pending',
    "riskScore" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "clients_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "clients_email_key" ON "clients"("email");

-- CreateIndex
CREATE INDEX "loans_client_id_idx" ON "loans"("client_id");

-- AddForeignKey
ALTER TABLE "loans" ADD CONSTRAINT "loans_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
