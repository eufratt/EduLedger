-- DropForeignKey
ALTER TABLE "BudgetRequest" DROP CONSTRAINT "BudgetRequest_categoryId_fkey";

-- AlterTable
ALTER TABLE "BudgetRequest" ALTER COLUMN "categoryId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "BudgetRequest" ADD CONSTRAINT "BudgetRequest_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;
