import { PrismaClient, Role, CivitasType, CategoryType, BudgetRequestStatus, RkabStatus, ReportType } from "@prisma/client"
import bcrypt from "bcrypt"

const prisma = new PrismaClient()

function d(iso: string) {
  return new Date(iso)
}

async function main() {
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

  // USERS
  const [kepsek, bendahara, civitas1, civitas2, civitas3] = await Promise.all([
    prisma.user.create({
      data: {
        name: "Kepala Sekolah Demo",
        email: "kepsek@demo.com",
        password: passwordHash,
        role: Role.KEPSEK,
        isActive: true,
      },
    }),
    prisma.user.create({
      data: {
        name: "Bendahara Demo",
        email: "bendahara@demo.com",
        password: passwordHash,
        role: Role.BENDAHARA,
        isActive: true,
      },
    }),
    prisma.user.create({
      data: {
        name: "Civitas Demo 1",
        email: "civitas1@demo.com",
        password: passwordHash,
        role: Role.CIVITAS,
        civitasType: CivitasType.GURU,
        isActive: true,
      },
    }),
    prisma.user.create({
      data: {
        name: "Civitas Demo 2",
        email: "civitas2@demo.com",
        password: passwordHash,
        role: Role.CIVITAS,
        civitasType: CivitasType.PEGAWAI,
        isActive: true,
      },
    }),
    prisma.user.create({
      data: {
        name: "Civitas Demo 3",
        email: "civitas3@demo.com",
        password: passwordHash,
        role: Role.CIVITAS,
        civitasType: CivitasType.GURU,
        isActive: true,
      },
    }),
  ])

  // FUNDING SOURCES
  const [bos, komite, donatur] = await Promise.all([
    prisma.fundingSource.create({ data: { name: "Dana BOS", agency: "Kemendikbud" } }),
    prisma.fundingSource.create({ data: { name: "Komite Sekolah", agency: "Komite" } }),
    prisma.fundingSource.create({ data: { name: "Donatur", agency: "Mitra" } }),
  ])

  /**
   * LEDGER: bikin angka dashboard bendahara “masuk akal”
   * - Total saldo all-time besar
   * - Dana masuk/keluar 12 bulan terakhir juga ada nilainya
   *
   * Anggap presentasi 2026-02 -> 12 bulan terakhir kira-kira 2025-02 s/d 2026-02
   */
  await prisma.ledgerEntry.createMany({
    data: [
      // INCOME all-time (lebih lama dari 12 bulan terakhir)
      { type: CategoryType.INCOME, amount: 120_000_000, date: d("2024-10-15T00:00:00.000Z"), description: "Penerimaan BOS 2024", fundingSourceId: bos.id, recordedById: bendahara.id },
      { type: CategoryType.INCOME, amount: 40_000_000, date: d("2024-12-10T00:00:00.000Z"), description: "Komite Semester 1", fundingSourceId: komite.id, recordedById: bendahara.id },

      // INCOME 12 bulan terakhir
      { type: CategoryType.INCOME, amount: 60_000_000, date: d("2025-08-01T00:00:00.000Z"), description: "Penerimaan BOS 2025", fundingSourceId: bos.id, recordedById: bendahara.id },
      { type: CategoryType.INCOME, amount: 10_000_000, date: d("2025-11-12T00:00:00.000Z"), description: "Donasi Mitra", fundingSourceId: donatur.id, recordedById: bendahara.id },

      // EXPENSE 12 bulan terakhir
      { type: CategoryType.EXPENSE, amount: 18_000_000, date: d("2025-09-05T00:00:00.000Z"), description: "Pembelian ATK & Perlengkapan", fundingSourceId: bos.id, recordedById: bendahara.id },
      { type: CategoryType.EXPENSE, amount: 12_500_000, date: d("2025-12-20T00:00:00.000Z"), description: "Perbaikan ruang kelas", fundingSourceId: komite.id, recordedById: bendahara.id },
      { type: CategoryType.EXPENSE, amount: 7_500_000, date: d("2026-01-18T00:00:00.000Z"), description: "Kegiatan sekolah", fundingSourceId: donatur.id, recordedById: bendahara.id },

      // EXPENSE lebih lama (all-time)
      { type: CategoryType.EXPENSE, amount: 25_000_000, date: d("2024-11-01T00:00:00.000Z"), description: "Pengadaan kursi meja", fundingSourceId: bos.id, recordedById: bendahara.id },
    ],
  })

  /**
   * BUDGET REQUESTS
   * - kepsek: butuh pending SUBMITTED + approved bulan ini
   * - bendahara: approved -> siap dicairkan, disbursed tanpa bukti -> missing proof
   * - civitas: aktivitas terbaru berdasarkan submittedById
   */
  const br1 = await prisma.budgetRequest.create({
    data: {
      title: "Pengadaan Proyektor Kelas",
      description: "Proyektor untuk kelas 9A",
      amountRequested: 6_500_000,
      status: BudgetRequestStatus.SUBMITTED,
      submittedById: civitas1.id,
      submittedAt: d("2026-02-20T00:00:00.000Z"),
      createdAt: d("2026-02-20T00:00:00.000Z"),
    },
  })

  const br2 = await prisma.budgetRequest.create({
    data: {
      title: "Perbaikan LCD Laboratorium",
      description: "LCD sering mati",
      amountRequested: 4_200_000,
      status: BudgetRequestStatus.SUBMITTED,
      submittedById: civitas2.id,
      submittedAt: d("2026-02-19T00:00:00.000Z"),
      createdAt: d("2026-02-19T00:00:00.000Z"),
    },
  })

  const br3 = await prisma.budgetRequest.create({
    data: {
      title: "Kegiatan Lomba Sains",
      description: "Transport & konsumsi",
      amountRequested: 3_000_000,
      status: BudgetRequestStatus.APPROVED,
      submittedById: civitas1.id,
      submittedAt: d("2026-02-10T00:00:00.000Z"),
      approvedById: kepsek.id,
      approvedAt: d("2026-02-12T00:00:00.000Z"),
      approvalNote: "Disetujui, sesuai RKAS",
      createdAt: d("2026-02-10T00:00:00.000Z"),
    },
  })

  const br4 = await prisma.budgetRequest.create({
    data: {
      title: "Pengadaan ATK Guru",
      description: "ATK semester genap",
      amountRequested: 2_400_000,
      status: BudgetRequestStatus.APPROVED,
      submittedById: civitas3.id,
      submittedAt: d("2026-02-05T00:00:00.000Z"),
      approvedById: kepsek.id,
      approvedAt: d("2026-02-06T00:00:00.000Z"),
      approvalNote: "OK",
      createdAt: d("2026-02-05T00:00:00.000Z"),
    },
  })

  const br5 = await prisma.budgetRequest.create({
    data: {
      title: "Servis AC Ruang Guru",
      description: "AC kurang dingin",
      amountRequested: 1_800_000,
      status: BudgetRequestStatus.DISBURSED,
      submittedById: civitas2.id,
      submittedAt: d("2026-01-25T00:00:00.000Z"),
      approvedById: kepsek.id,
      approvedAt: d("2026-01-26T00:00:00.000Z"),
      disbursedById: bendahara.id,
      disbursedAt: d("2026-01-28T00:00:00.000Z"),
      approvalNote: "Disetujui",
      createdAt: d("2026-01-25T00:00:00.000Z"),
    },
  })

  // br6 disbursed + ada bukti (jadi missing proof tidak semua)
  const br6 = await prisma.budgetRequest.create({
    data: {
      title: "Beli Tinta Printer TU",
      description: "Tinta printer habis",
      amountRequested: 950_000,
      status: BudgetRequestStatus.DISBURSED,
      submittedById: civitas1.id,
      submittedAt: d("2026-01-12T00:00:00.000Z"),
      approvedById: kepsek.id,
      approvedAt: d("2026-01-13T00:00:00.000Z"),
      disbursedById: bendahara.id,
      disbursedAt: d("2026-01-14T00:00:00.000Z"),
      createdAt: d("2026-01-12T00:00:00.000Z"),
    },
  })

  // bukti untuk br6
  await prisma.requestProof.create({
    data: {
      requestId: br6.id,
      fileUrl: "https://example.com/bukti/tinta-printer.pdf",
      fileName: "bukti_tinta_printer.pdf",
      mimeType: "application/pdf",
      size: 120_000,
      uploadedAt: d("2026-01-15T00:00:00.000Z"),
    },
  })

  // request ditolak
  await prisma.budgetRequest.create({
    data: {
      title: "Pengadaan Konsumsi Rapat",
      description: "Rapat rutin",
      amountRequested: 1_200_000,
      status: BudgetRequestStatus.REJECTED,
      submittedById: civitas3.id,
      submittedAt: d("2026-02-02T00:00:00.000Z"),
      approvedById: kepsek.id,
      approvedAt: d("2026-02-03T00:00:00.000Z"),
      approvalNote: "Anggaran dialihkan",
      createdAt: d("2026-02-02T00:00:00.000Z"),
    },
  })

  /**
   * RKAS / RKAB
   * - Satu APPROVED untuk fiscalYear 2026 (untuk Total Anggaran & Realisasi)
   * - Satu SUBMITTED untuk review (kartu highlight)
   *
   * IMPORTANT: RkabItem butuh budgetRequestId unique.
   * Jadi kita pakai br3 & br4 yang sudah APPROVED.
   */
  const rkabApproved = await prisma.rkab.create({
    data: {
      code: "RKAS-2026-001",
      fiscalYear: 2026,
      status: RkabStatus.APPROVED,
      createdById: bendahara.id,
      submittedAt: d("2026-01-10T00:00:00.000Z"),
      approvedById: kepsek.id,
      approvedAt: d("2026-01-15T00:00:00.000Z"),
      approvalNote: "Disetujui untuk Tahun 2026",
      createdAt: d("2026-01-10T00:00:00.000Z"),
    },
  })

  // item untuk RKAS approved
  const item1 = await prisma.rkabItem.create({
    data: {
      rkabId: rkabApproved.id,
      budgetRequestId: br3.id,
      amountAllocated: 3_500_000,
      usedAmount: 2_000_000, // biar realisasi > 0
      note: "Kegiatan Lomba Sains",
      createdAt: d("2026-01-11T00:00:00.000Z"),
    },
  })

  const item2 = await prisma.rkabItem.create({
    data: {
      rkabId: rkabApproved.id,
      budgetRequestId: br4.id,
      amountAllocated: 3_000_000,
      usedAmount: 1_500_000,
      note: "Pengadaan ATK Guru",
      createdAt: d("2026-01-11T00:00:00.000Z"),
    },
  })

  // Ledger expense yang terkait rkabItem (opsional tapi bagus buat demo drill-down)
  await prisma.ledgerEntry.createMany({
    data: [
      {
        type: CategoryType.EXPENSE,
        amount: 1_200_000,
        date: d("2026-01-20T00:00:00.000Z"),
        description: "Pembelian kebutuhan lomba (1)",
        rkabItemId: item1.id,
        recordedById: bendahara.id,
        fundingSourceId: bos.id,
      },
      {
        type: CategoryType.EXPENSE,
        amount: 800_000,
        date: d("2026-01-22T00:00:00.000Z"),
        description: "Pembelian kebutuhan lomba (2)",
        rkabItemId: item1.id,
        recordedById: bendahara.id,
        fundingSourceId: bos.id,
      },
      {
        type: CategoryType.EXPENSE,
        amount: 1_500_000,
        date: d("2026-01-25T00:00:00.000Z"),
        description: "ATK semester genap",
        rkabItemId: item2.id,
        recordedById: bendahara.id,
        fundingSourceId: komite.id,
      },
    ],
  })

  // RKAS SUBMITTED untuk review card (kartu highlight)
  const rkabSubmitted = await prisma.rkab.create({
    data: {
      code: "RKAS-2026-002",
      fiscalYear: 2026,
      status: RkabStatus.SUBMITTED,
      createdById: bendahara.id,
      submittedAt: d("2026-02-18T00:00:00.000Z"),
      createdAt: d("2026-02-18T00:00:00.000Z"),
    },
  })

  // Tambah 1 item di RKAS review (butuh budgetRequestId unique -> buat request baru khusus RKAS)
  const brForRkab = await prisma.budgetRequest.create({
    data: {
      title: "Perawatan Komputer Lab",
      description: "Service & upgrade ringan",
      amountRequested: 5_000_000,
      status: BudgetRequestStatus.SUBMITTED,
      submittedById: civitas1.id,
      submittedAt: d("2026-02-18T00:00:00.000Z"),
      createdAt: d("2026-02-18T00:00:00.000Z"),
    },
  })

  await prisma.rkabItem.create({
    data: {
      rkabId: rkabSubmitted.id,
      budgetRequestId: brForRkab.id,
      amountAllocated: 5_000_000,
      usedAmount: 0,
      note: "Usulan perawatan lab",
      createdAt: d("2026-02-18T00:00:00.000Z"),
    },
  })

  // FINANCIAL REPORTS dummy
  await prisma.financialReport.createMany({
    data: [
      {
        type: ReportType.BALANCE,
        period: "2026-01",
        title: "Laporan Neraca Januari 2026",
        fileUrl: "https://example.com/reports/neraca-2026-01.pdf",
        fileName: "neraca_2026_01.pdf",
        mimeType: "application/pdf",
        size: 240_000,
        summary: { saldo: 170000000 },
        createdById: bendahara.id,
        createdAt: d("2026-02-01T00:00:00.000Z"),
      },
      {
        type: ReportType.INCOME,
        period: "2026-01",
        title: "Laporan Pemasukan Januari 2026",
        fileUrl: "https://example.com/reports/income-2026-01.pdf",
        fileName: "income_2026_01.pdf",
        mimeType: "application/pdf",
        size: 180_000,
        summary: { income: 10000000 },
        createdById: bendahara.id,
        createdAt: d("2026-02-01T00:00:00.000Z"),
      },
    ],
  })

  console.log("✅ Seed selesai.")
  console.log("Login demo:")
  console.log("- kepsek@demo.com / password123")
  console.log("- bendahara@demo.com / password123")
  console.log("- civitas1@demo.com / password123")
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })