-- CreateTable
CREATE TABLE "RequestProof" (
    "id" SERIAL NOT NULL,
    "requestId" INTEGER NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RequestProof_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RequestProof_requestId_idx" ON "RequestProof"("requestId");

-- AddForeignKey
ALTER TABLE "RequestProof" ADD CONSTRAINT "RequestProof_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "BudgetRequest"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
