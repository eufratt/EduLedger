-- CreateEnum
CREATE TYPE "Role" AS ENUM ('CIVITAS', 'BENDAHARA', 'KEPSEK');

-- CreateEnum
CREATE TYPE "CivitasType" AS ENUM ('PEGAWAI', 'GURU');

-- CreateEnum
CREATE TYPE "CategoryType" AS ENUM ('INCOME', 'EXPENSE');

-- CreateEnum
CREATE TYPE "BudgetRequestStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "RkabStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED');

-- CreateTable
CREATE TABLE "User" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'CIVITAS',
    "civitasType" "CivitasType",
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Category" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "type" "CategoryType" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FundingSource" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "agency" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FundingSource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BudgetRequest" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "amountRequested" INTEGER NOT NULL,
    "neededBy" TIMESTAMP(3),
    "categoryId" INTEGER NOT NULL,
    "status" "BudgetRequestStatus" NOT NULL DEFAULT 'SUBMITTED',
    "submittedById" INTEGER NOT NULL,
    "submittedAt" TIMESTAMP(3),
    "approvedById" INTEGER,
    "approvedAt" TIMESTAMP(3),
    "approvalNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BudgetRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Rkab" (
    "id" SERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "fiscalYear" INTEGER NOT NULL,
    "status" "RkabStatus" NOT NULL DEFAULT 'DRAFT',
    "createdById" INTEGER NOT NULL,
    "submittedAt" TIMESTAMP(3),
    "approvedById" INTEGER,
    "approvedAt" TIMESTAMP(3),
    "approvalNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Rkab_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RkabItem" (
    "id" SERIAL NOT NULL,
    "rkabId" INTEGER NOT NULL,
    "budgetRequestId" INTEGER NOT NULL,
    "amountAllocated" INTEGER NOT NULL,
    "usedAmount" INTEGER NOT NULL DEFAULT 0,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RkabItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LedgerEntry" (
    "id" SERIAL NOT NULL,
    "type" "CategoryType" NOT NULL,
    "amount" INTEGER NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "description" TEXT,
    "categoryId" INTEGER NOT NULL,
    "fundingSourceId" INTEGER,
    "rkabItemId" INTEGER,
    "recordedById" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LedgerEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "BudgetRequest_status_idx" ON "BudgetRequest"("status");

-- CreateIndex
CREATE INDEX "BudgetRequest_categoryId_idx" ON "BudgetRequest"("categoryId");

-- CreateIndex
CREATE INDEX "BudgetRequest_submittedById_idx" ON "BudgetRequest"("submittedById");

-- CreateIndex
CREATE INDEX "BudgetRequest_approvedById_idx" ON "BudgetRequest"("approvedById");

-- CreateIndex
CREATE UNIQUE INDEX "Rkab_code_key" ON "Rkab"("code");

-- CreateIndex
CREATE INDEX "Rkab_fiscalYear_idx" ON "Rkab"("fiscalYear");

-- CreateIndex
CREATE INDEX "Rkab_status_idx" ON "Rkab"("status");

-- CreateIndex
CREATE INDEX "Rkab_createdById_idx" ON "Rkab"("createdById");

-- CreateIndex
CREATE INDEX "Rkab_approvedById_idx" ON "Rkab"("approvedById");

-- CreateIndex
CREATE UNIQUE INDEX "RkabItem_budgetRequestId_key" ON "RkabItem"("budgetRequestId");

-- CreateIndex
CREATE INDEX "RkabItem_rkabId_idx" ON "RkabItem"("rkabId");

-- CreateIndex
CREATE INDEX "LedgerEntry_date_idx" ON "LedgerEntry"("date");

-- CreateIndex
CREATE INDEX "LedgerEntry_type_idx" ON "LedgerEntry"("type");

-- CreateIndex
CREATE INDEX "LedgerEntry_categoryId_idx" ON "LedgerEntry"("categoryId");

-- CreateIndex
CREATE INDEX "LedgerEntry_fundingSourceId_idx" ON "LedgerEntry"("fundingSourceId");

-- CreateIndex
CREATE INDEX "LedgerEntry_rkabItemId_idx" ON "LedgerEntry"("rkabItemId");

-- CreateIndex
CREATE INDEX "LedgerEntry_recordedById_idx" ON "LedgerEntry"("recordedById");

-- AddForeignKey
ALTER TABLE "BudgetRequest" ADD CONSTRAINT "BudgetRequest_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BudgetRequest" ADD CONSTRAINT "BudgetRequest_submittedById_fkey" FOREIGN KEY ("submittedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BudgetRequest" ADD CONSTRAINT "BudgetRequest_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Rkab" ADD CONSTRAINT "Rkab_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Rkab" ADD CONSTRAINT "Rkab_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RkabItem" ADD CONSTRAINT "RkabItem_rkabId_fkey" FOREIGN KEY ("rkabId") REFERENCES "Rkab"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RkabItem" ADD CONSTRAINT "RkabItem_budgetRequestId_fkey" FOREIGN KEY ("budgetRequestId") REFERENCES "BudgetRequest"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LedgerEntry" ADD CONSTRAINT "LedgerEntry_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LedgerEntry" ADD CONSTRAINT "LedgerEntry_fundingSourceId_fkey" FOREIGN KEY ("fundingSourceId") REFERENCES "FundingSource"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LedgerEntry" ADD CONSTRAINT "LedgerEntry_rkabItemId_fkey" FOREIGN KEY ("rkabItemId") REFERENCES "RkabItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LedgerEntry" ADD CONSTRAINT "LedgerEntry_recordedById_fkey" FOREIGN KEY ("recordedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
