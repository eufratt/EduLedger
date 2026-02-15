-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "BudgetRequestStatus" ADD VALUE 'DISBURSED';
ALTER TYPE "BudgetRequestStatus" ADD VALUE 'COMPLETED';

-- AlterTable
ALTER TABLE "BudgetRequest" ADD COLUMN     "disbursedAt" TIMESTAMP(3),
ADD COLUMN     "disbursedById" INTEGER;

-- AddForeignKey
ALTER TABLE "BudgetRequest" ADD CONSTRAINT "BudgetRequest_disbursedById_fkey" FOREIGN KEY ("disbursedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
