/*
  Warnings:

  - You are about to drop the column `categoryId` on the `BudgetRequest` table. All the data in the column will be lost.
  - You are about to drop the column `categoryId` on the `LedgerEntry` table. All the data in the column will be lost.
  - You are about to drop the `Category` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "BudgetRequest" DROP CONSTRAINT "BudgetRequest_categoryId_fkey";

-- DropForeignKey
ALTER TABLE "LedgerEntry" DROP CONSTRAINT "LedgerEntry_categoryId_fkey";

-- DropIndex
DROP INDEX "BudgetRequest_categoryId_idx";

-- DropIndex
DROP INDEX "LedgerEntry_categoryId_idx";

-- AlterTable
ALTER TABLE "BudgetRequest" DROP COLUMN "categoryId";

-- AlterTable
ALTER TABLE "LedgerEntry" DROP COLUMN "categoryId";

-- DropTable
DROP TABLE "Category";
