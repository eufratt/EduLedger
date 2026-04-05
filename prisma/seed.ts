import { PrismaClient, Role, CivitasType, CategoryType, BudgetRequestStatus, RkabStatus, ReportType } from "@prisma/client"
import bcrypt from "bcrypt"

const prisma = new PrismaClient()

function d(iso: string) {
  return new Date(iso)
}

async function main() {
  console.log("🌱 Cleaning database...")
  // bersihin data (urutan penting karena FK)
  await prisma.requestProof.deleteMany()
  await prisma.ledgerEntry.deleteMany()
  await prisma.rkabItem.deleteMany()
  await prisma.budgetRequest.deleteMany()
  await prisma.financialReport.deleteMany()
  await prisma.rkab.deleteMany()
  await prisma.fundingSource.deleteMany()
  await prisma.user.deleteMany()

  const passwordHash = await bcrypt.hash("password123", 10)

  console.log("👤 Creating users...")
  const [kepsek, bendahara, civitas] = await Promise.all([
    prisma.user.create({
      data: {
        name: "Bpk. Ahmad (Kepala Sekolah)",
        email: "kepsek@demo.com",
        password: passwordHash,
        role: Role.KEPSEK,
        isActive: true,
      },
    }),
    prisma.user.create({
      data: {
        name: "Ibu Siti (Bendahara)",
        email: "bendahara@demo.com",
        password: passwordHash,
        role: Role.BENDAHARA,
        isActive: true,
      },
    }),
    prisma.user.create({
      data: {
        name: "Budi Santoso (Guru)",
        email: "civitas1@demo.com",
        password: passwordHash,
        role: Role.CIVITAS,
        civitasType: CivitasType.GURU,
        isActive: true,
      },
    }),
  ])

  console.log("💰 Creating funding sources...")
  const [bos, komite] = await Promise.all([
    prisma.fundingSource.create({ data: { name: "Dana BOS 2024", agency: "Kemendikbud" } }),
    prisma.fundingSource.create({ data: { name: "Iuran Komite Sekolah", agency: "Komite" } }),
  ])

  // --- RKAS 2023 (SELESAI) ---
  console.log("📜 Seeding RKAS 2023 (Completed)...")
  const rkab2023 = await prisma.rkab.create({
    data: {
      code: "RKAS/2023/001",
      fiscalYear: 2023,
      status: RkabStatus.APPROVED, // later UI maps this to SELESAI based on year
      createdById: bendahara.id,
      submittedAt: d("2023-01-05T00:00:00Z"),
      approvedById: kepsek.id,
      approvedAt: d("2023-01-10T00:00:00Z"),
      createdAt: d("2023-01-01T00:00:00Z"),
    },
  })

  // Item 2023 - Gaji (Fully Disbursed)
  const br2023_1 = await prisma.budgetRequest.create({
    data: {
      title: "Gaji & Insentif GTT/PTT 2023",
      description: "Pembayaran gaji tahunan staf honorer",
      amountRequested: 150_000_000,
      status: BudgetRequestStatus.DISBURSED,
      submittedById: civitas.id,
      submittedAt: d("2023-01-05T00:00:00Z"),
      approvedById: kepsek.id,
      approvedAt: d("2023-01-10T00:00:00Z"),
      disbursedById: bendahara.id,
      disbursedAt: d("2023-01-15T00:00:00Z"),
    },
  })
  await prisma.rkabItem.create({
    data: {
      rkabId: rkab2023.id,
      budgetRequestId: br2023_1.id,
      amountAllocated: 150_000_000,
      usedAmount: 150_000_000, // Binary: 100%
      note: "Gaji berkala",
    },
  })

  // --- RKAS 2024 (ACTIVE) ---
  console.log("🚀 Seeding RKAS 2024 (Active)...")
  const rkab2024 = await prisma.rkab.create({
    data: {
      code: "RKAS/2024/001",
      fiscalYear: 2024,
      status: RkabStatus.APPROVED,
      createdById: bendahara.id,
      submittedAt: d("2024-01-05T00:00:00Z"),
      approvedById: kepsek.id,
      approvedAt: d("2024-01-12T00:00:00Z"),
    },
  })

  // Item 2024 - Renovasi (Fully Disbursed)
  const br2024_1 = await prisma.budgetRequest.create({
    data: {
      title: "Renovasi Atap Perpustakaan",
      description: "Perbaikan kebocoran atap sayap kiri",
      amountRequested: 45_000_000,
      status: BudgetRequestStatus.DISBURSED,
      submittedById: civitas.id,
      submittedAt: d("2024-03-01T00:00:00Z"),
      approvedById: kepsek.id,
      approvedAt: d("2024-03-05T00:00:00Z"),
      disbursedById: bendahara.id,
      disbursedAt: d("2024-03-10T00:00:00Z"),
    },
  })
  await prisma.rkabItem.create({
    data: {
      rkabId: rkab2024.id,
      budgetRequestId: br2024_1.id,
      amountAllocated: 45_000_000,
      usedAmount: 45_000_000, // Binary: 100%
      note: "Kontraktor Mandiri",
    },
  })

  // Item 2024 - Lomba Robotik (Fully Disbursed)
  const br2024_2 = await prisma.budgetRequest.create({
    data: {
      title: "Lomba Robotika Nasional",
      description: "Keberangkatan tim robotik ke Jakarta",
      amountRequested: 12_500_000,
      status: BudgetRequestStatus.DISBURSED,
      submittedById: civitas.id,
      submittedAt: d("2024-02-15T00:00:00Z"),
      approvedById: kepsek.id,
      approvedAt: d("2024-02-18T00:00:00Z"),
      disbursedById: bendahara.id,
      disbursedAt: d("2024-02-20T00:00:00Z"),
    },
  })
  await prisma.rkabItem.create({
    data: {
      rkabId: rkab2024.id,
      budgetRequestId: br2024_2.id,
      amountAllocated: 12_500_000,
      usedAmount: 12_500_000, // Binary: 100%
      note: "Pendaftaran & Akomodasi",
    },
  })

  // Item 2024 - Chromebook (Pending)
  const br2024_3 = await prisma.budgetRequest.create({
    data: {
      title: "Pengadaan 30 Unit Chromebook",
      description: "Digitalisasi kelas 7",
      amountRequested: 150_000_000,
      status: BudgetRequestStatus.APPROVED,
      submittedById: civitas.id,
      submittedAt: d("2024-03-20T00:00:00Z"),
      approvedById: kepsek.id,
      approvedAt: d("2024-03-25T00:00:00Z"),
    },
  })
  await prisma.rkabItem.create({
    data: {
      rkabId: rkab2024.id,
      budgetRequestId: br2024_3.id,
      amountAllocated: 150_000_000,
      usedAmount: 0, // Binary: 0%
      note: "Vendor: TechStore Indonesia",
    },
  })

  // --- RKAS 2025 (SUBMITTED) ---
  console.log("📝 Seeding RKAS 2025 (Submitted/Reviewing)...")
  const rkab2025 = await prisma.rkab.create({
    data: {
      code: "RKAS/2025/001",
      fiscalYear: 2025,
      status: RkabStatus.SUBMITTED,
      createdById: bendahara.id,
      submittedAt: d("2024-12-28T00:00:00Z"),
      createdAt: d("2024-12-20T00:00:00Z"),
    },
  })

  // Item 2025 - Lab Alam (Pending review)
  const br2025_1 = await prisma.budgetRequest.create({
    data: {
      title: "Pembangunan Laboratorium Alam",
      description: "Area penelitian biologi outdoor",
      amountRequested: 85_000_000,
      status: BudgetRequestStatus.SUBMITTED,
      submittedById: civitas.id,
      submittedAt: d("2024-12-28T00:00:00Z"),
    },
  })
  await prisma.rkabItem.create({
    data: {
      rkabId: rkab2025.id,
      budgetRequestId: br2025_1.id,
      amountAllocated: 85_000_000,
      usedAmount: 0, // Binary: 0%
      note: "Perencanaan lahan belakang",
    },
  })

  console.log("✅ Seed complete.")
  console.log("--- Access Info ---")
  console.log("Kepala Sekolah: kepsek@demo.com")
  console.log("Bendahara: bendahara@demo.com")
  console.log("Password: password123")
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })