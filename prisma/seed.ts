import { PrismaClient, Role, CivitasType, CategoryType, BudgetRequestStatus, RkabStatus, ReportType, NotificationType } from "@prisma/client"
import bcrypt from "bcrypt"

const prisma = new PrismaClient()

function d(iso: string) {
  return new Date(iso)
}

async function main() {
  console.log("🌱 Cleaning database...")
  // order matters for FK
  await prisma.notification.deleteMany()
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
  const [kepsek, bendahara, civitas, civitas2] = await Promise.all([
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
    prisma.user.create({
      data: {
        name: "Lia Amalia (Pegawai)",
        email: "civitas2@demo.com",
        password: passwordHash,
        role: Role.CIVITAS,
        civitasType: CivitasType.PEGAWAI,
        isActive: true,
      },
    }),
  ])

  console.log("💰 Creating funding sources...")
  const [bos, komite, yayasan] = await Promise.all([
    prisma.fundingSource.create({ data: { name: "Dana BOS 2024", agency: "Kemendikbud" } }),
    prisma.fundingSource.create({ data: { name: "Iuran Komite Sekolah", agency: "Komite" } }),
    prisma.fundingSource.create({ data: { name: "Subsidi Yayasan", agency: "Yayasan" } }),
  ])

  // --- RKAS 2023 (PAST/COMPLETED) ---
  console.log("📜 Seeding RKAS 2023...")
  const rkab2023 = await prisma.rkab.create({
    data: {
      code: "RKAS/2023/001",
      fiscalYear: 2023,
      status: RkabStatus.APPROVED,
      createdById: bendahara.id,
      submittedAt: d("2023-01-05T00:00:00Z"),
      approvedById: kepsek.id,
      approvedAt: d("2023-01-10T00:00:00Z"),
    },
  })

  // --- RKAS 2024 (CURRENT/ACTIVE) ---
  console.log("🚀 Seeding RKAS 2024...")
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

  // --- REQUESTS FOR 2024 ---
  
  // 1. Completed Request (Disbursed + Entry)
  const br1 = await prisma.budgetRequest.create({
    data: {
      title: "Gaji Guru Honorer Jan-Mar",
      amountRequested: 45_000_000,
      status: BudgetRequestStatus.DISBURSED,
      submittedById: civitas.id,
      submittedAt: d("2024-01-15T00:00:00Z"),
      approvedById: kepsek.id,
      approvedAt: d("2024-01-18T00:00:00Z"),
      disbursedById: bendahara.id,
      disbursedAt: d("2024-01-20T00:00:00Z"),
    }
  })
  const ri1 = await prisma.rkabItem.create({
    data: {
      rkabId: rkab2024.id,
      budgetRequestId: br1.id,
      amountAllocated: 50_000_000,
      usedAmount: 45_000_000,
      note: "Gaji 3 bulan pertama",
    }
  })
  await prisma.ledgerEntry.create({
    data: {
      type: CategoryType.EXPENSE,
      amount: 45_000_000,
      date: d("2024-01-20T00:00:00Z"),
      description: "Pembayaran gaji guru honorer",
      rkabItemId: ri1.id,
      recordedById: bendahara.id,
    }
  })

  // 2. Approved but not yet disbursed
  const br2 = await prisma.budgetRequest.create({
    data: {
      title: "Pengadaan Alat Tulis Kantor",
      amountRequested: 2_500_000,
      status: BudgetRequestStatus.APPROVED,
      submittedById: civitas2.id,
      submittedAt: d("2024-03-25T00:00:00Z"),
      approvedById: kepsek.id,
      approvedAt: d("2024-03-28T00:00:00Z"),
    }
  })
  await prisma.rkabItem.create({
    data: {
      rkabId: rkab2024.id,
      budgetRequestId: br2.id,
      amountAllocated: 3_000_000,
      usedAmount: 0,
      note: "Kebutuhan inventaris kantor",
    }
  })

  // 3. Rejected Request
  await prisma.budgetRequest.create({
    data: {
      title: "Study Tour ke Bali",
      amountRequested: 150_000_000,
      status: BudgetRequestStatus.REJECTED,
      submittedById: civitas.id,
      submittedAt: d("2024-03-01T00:00:00Z"),
      approvedById: kepsek.id,
      approvedAt: d("2024-03-05T00:00:00Z"),
      approvalNote: "Anggaran tidak mencukupi untuk kegiatan non-akademik besar saat ini.",
    }
  })

  // 4. Pending Request (New)
  const brNew = await prisma.budgetRequest.create({
    data: {
      title: "Renovasi Genteng Bocor",
      amountRequested: 8_000_000,
      status: BudgetRequestStatus.SUBMITTED,
      submittedById: civitas.id,
      submittedAt: new Date(),
    }
  })

  // --- INCOME ENTRIES ---
  console.log("💵 Seeding Incomes...")
  await prisma.ledgerEntry.createMany({
    data: [
      {
        type: CategoryType.INCOME,
        amount: 250_000_000,
        date: d("2024-01-02T00:00:00Z"),
        description: "Penerimaan Dana BOS Tahap 1",
        fundingSourceId: bos.id,
        recordedById: bendahara.id,
      },
      {
        type: CategoryType.INCOME,
        amount: 35_000_000,
        date: d("2024-02-15T00:00:00Z"),
        description: "Iuran Bulanan Komite Februari",
        fundingSourceId: komite.id,
        recordedById: bendahara.id,
      }
    ]
  })

  // --- FINANCIAL REPORTS ---
  console.log("📊 Seeding Reports...")
  await prisma.financialReport.create({
    data: {
      title: "Laporan Keuangan Januari 2024",
      period: "2024-01",
      type: ReportType.BALANCE,
      fileName: "report-jan-2024.pdf",
      fileUrl: "https://example.com/reports/jan-2024.pdf",
      size: 1024 * 500,
      createdById: bendahara.id,
    }
  })

  // --- NOTIFICATIONS ---
  console.log("🔔 Seeding Notifications...")
  const notifications = [
    // For Kepsek
    {
      userId: kepsek.id,
      title: "Persetujuan Tertunda",
      message: "8 pengajuan menunggu persetujuan Anda",
      type: NotificationType.INFO,
      isRead: false,
      createdAt: new Date(Date.now() - 30 * 60000), // 30 mins ago
    },
    {
      userId: kepsek.id,
      title: "RKAS Baru",
      message: "Bendahara mengajukan RKAS Tahun 2025/2026 untuk ditinjau",
      type: NotificationType.INFO,
      link: `/kepsek/persetujuan`,
      isRead: false,
      createdAt: new Date(Date.now() - 120 * 60000), // 2 hours ago
    },
    {
      userId: kepsek.id,
      title: "Pengajuan Dana Baru",
      message: `Budi Santoso mengajukan dana untuk ${brNew.title} sebesar Rp 8.000.000`,
      type: NotificationType.INFO,
      link: `/kepsek/persetujuan/${brNew.id}?type=request`,
      isRead: false,
      createdAt: new Date(Date.now() - 300 * 60000), // 5 hours ago
    },
    {
      userId: kepsek.id,
      title: "Laporan Keuangan",
      message: "Laporan keuangan bulan Desember 2024 telah tersedia",
      type: NotificationType.INFO,
      isRead: true,
      createdAt: new Date(Date.now() - 24 * 3600000), // 1 day ago
    },
    // For Civitas
    {
      userId: civitas.id,
      title: "Pengajuan Disetujui",
      message: "Pengajuan 'Renovasi Genteng' Anda telah disetujui oleh Kepala Sekolah",
      type: NotificationType.SUCCESS,
      isRead: false,
    },
    {
      userId: civitas.id,
      title: "Dana Dicairkan",
      message: "Dana untuk 'Gaji Guru' telah dicairkan oleh Bendahara",
      type: NotificationType.INFO,
      isRead: true,
    }
  ]

  for (const notif of notifications) {
    await prisma.notification.create({ data: notif })
  }
  console.log(`✅ Seeded ${notifications.length} notifications.`)

  console.log("✅ Seed complete.")
  console.log("--- Login Credentials ---")
  console.log(`Kepala Sekolah: kepsek@demo.com / password123`)
  console.log(`Bendahara: bendahara@demo.com / password123`)
  console.log(`Civitas 1: civitas1@demo.com / password123`)
  console.log(`Civitas 2: civitas2@demo.com / password123`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })