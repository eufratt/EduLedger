-- DropForeignKey
ALTER TABLE "RkabItem" DROP CONSTRAINT "RkabItem_budgetRequestId_fkey";

-- AlterTable
ALTER TABLE "RkabItem" ADD COLUMN     "name" TEXT,
ALTER COLUMN "budgetRequestId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "RkabItem" ADD CONSTRAINT "RkabItem_budgetRequestId_fkey" FOREIGN KEY ("budgetRequestId") REFERENCES "BudgetRequest"("id") ON DELETE SET NULL ON UPDATE CASCADE;
