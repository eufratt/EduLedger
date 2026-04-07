import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🗑️  Clearing all data...");

  await prisma.notification.deleteMany();
  await prisma.financialReport.deleteMany();
  await prisma.requestProof.deleteMany();
  await prisma.ledgerEntry.deleteMany();
  await prisma.rkabItem.deleteMany();
  await prisma.rkab.deleteMany();
  await prisma.budgetRequest.deleteMany();
  await prisma.fundingSource.deleteMany();
  await prisma.user.deleteMany();

  console.log("✅ All data cleared!");
}

main()
  .catch((e) => {
    console.error("❌ Failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });