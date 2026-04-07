import { PrismaClient, Role, CivitasType, CategoryType, BudgetRequestStatus, RkabStatus, ReportType, NotificationType } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting seed...");

  // ─── Hapus data lama (urutan penting karena foreign key) ─────────────────────
  await prisma.notification.deleteMany();
  await prisma.financialReport.deleteMany();
  await prisma.requestProof.deleteMany();
  await prisma.ledgerEntry.deleteMany();
  await prisma.rkabItem.deleteMany();
  await prisma.rkab.deleteMany();
  await prisma.budgetRequest.deleteMany();
  await prisma.fundingSource.deleteMany();
  await prisma.user.deleteMany();

  console.log("🗑️  Cleared existing data");

  // ─── Users ───────────────────────────────────────────────────────────────────
  const hashedPassword = await bcrypt.hash("password123", 10);

  const kepsek = await prisma.user.create({
    data: {
      name: "Budi Santoso",
      email: "kepsek@sekolah.sch.id",
      password: hashedPassword,
      role: Role.KEPSEK,
      isActive: true,
    },
  });

  const bendahara = await prisma.user.create({
    data: {
      name: "Siti Rahayu",
      email: "bendahara@sekolah.sch.id",
      password: hashedPassword,
      role: Role.BENDAHARA,
      isActive: true,
    },
  });

  const guru1 = await prisma.user.create({
    data: {
      name: "Ahmad Fauzi",
      email: "ahmad.fauzi@sekolah.sch.id",
      password: hashedPassword,
      role: Role.CIVITAS,
      civitasType: CivitasType.GURU,
      isActive: true,
    },
  });

  const guru2 = await prisma.user.create({
    data: {
      name: "Dewi Kartika",
      email: "dewi.kartika@sekolah.sch.id",
      password: hashedPassword,
      role: Role.CIVITAS,
      civitasType: CivitasType.GURU,
      isActive: true,
    },
  });

  const pegawai1 = await prisma.user.create({
    data: {
      name: "Rudi Hartono",
      email: "rudi.hartono@sekolah.sch.id",
      password: hashedPassword,
      role: Role.CIVITAS,
      civitasType: CivitasType.PEGAWAI,
      isActive: true,
    },
  });

  const pegawai2 = await prisma.user.create({
    data: {
      name: "Lina Susanti",
      email: "lina.susanti@sekolah.sch.id",
      password: hashedPassword,
      role: Role.CIVITAS,
      civitasType: CivitasType.PEGAWAI,
      isActive: true,
    },
  });

  console.log("👤 Users created");

  // ─── Funding Sources ─────────────────────────────────────────────────────────
  const bos = await prisma.fundingSource.create({
    data: {
      name: "Dana BOS",
      agency: "Kementerian Pendidikan dan Kebudayaan",
    },
  });

  const bosda = await prisma.fundingSource.create({
    data: {
      name: "Dana BOSDA",
      agency: "Dinas Pendidikan Provinsi DIY",
    },
  });

  const komite = await prisma.fundingSource.create({
    data: {
      name: "Dana Komite",
      agency: "Komite Sekolah",
    },
  });

  console.log("💰 Funding sources created");

  // ─── RKAB ────────────────────────────────────────────────────────────────────
  const rkabApproved = await prisma.rkab.create({
    data: {
      code: "RKAB/2025/001",
      fiscalYear: 2025,
      status: RkabStatus.APPROVED,
      createdById: bendahara.id,
      submittedAt: new Date("2025-01-10"),
      approvedById: kepsek.id,
      approvedAt: new Date("2025-01-15"),
      approvalNote: "Disetujui dengan catatan efisiensi anggaran.",
    },
  });

  const rkabDraft = await prisma.rkab.create({
    data: {
      code: "RKAB/2025/002",
      fiscalYear: 2025,
      status: RkabStatus.DRAFT,
      createdById: bendahara.id,
    },
  });

  console.log("📋 RKAB created");

  // ─── RKAB Items ──────────────────────────────────────────────────────────────
  const rkabItem1 = await prisma.rkabItem.create({
    data: {
      rkabId: rkabApproved.id,
      name: "Pengadaan ATK Semester 1",
      amountAllocated: 5_000_000,
      usedAmount: 3_200_000,
      note: "Alokasi untuk kebutuhan administrasi kelas",
    },
  });

  const rkabItem2 = await prisma.rkabItem.create({
    data: {
      rkabId: rkabApproved.id,
      name: "Pemeliharaan Sarana Prasarana",
      amountAllocated: 10_000_000,
      usedAmount: 4_500_000,
      note: "Perbaikan gedung dan fasilitas",
    },
  });

  const rkabItem3 = await prisma.rkabItem.create({
    data: {
      rkabId: rkabApproved.id,
      name: "Kegiatan Ekstrakurikuler",
      amountAllocated: 3_000_000,
      usedAmount: 1_500_000,
    },
  });

  const rkabItem4 = await prisma.rkabItem.create({
    data: {
      rkabId: rkabDraft.id,
      name: "Pengadaan Buku Perpustakaan",
      amountAllocated: 8_000_000,
      usedAmount: 0,
    },
  });

  console.log("📦 RKAB items created");

  // ─── Budget Requests ─────────────────────────────────────────────────────────
  // 1. DISBURSED – sudah cair, terhubung ke rkabItem
  const reqDisbursed = await prisma.budgetRequest.create({
    data: {
      title: "Pembelian ATK Kelas X",
      description: "Kebutuhan alat tulis kantor untuk kegiatan belajar mengajar semester ganjil.",
      amountRequested: 1_200_000,
      neededBy: new Date("2025-02-15"),
      status: BudgetRequestStatus.DISBURSED,
      submittedById: guru1.id,
      submittedAt: new Date("2025-01-20"),
      approvedById: kepsek.id,
      approvedAt: new Date("2025-01-22"),
      approvalNote: "Disetujui. Harap lampirkan nota pembelian.",
      disbursedById: bendahara.id,
      disbursedAt: new Date("2025-01-25"),
    },
  });

  // Hubungkan ke rkabItem1
  await prisma.rkabItem.update({
    where: { id: rkabItem1.id },
    data: { budgetRequestId: reqDisbursed.id },
  });

  // 2. APPROVED
  const reqApproved = await prisma.budgetRequest.create({
    data: {
      title: "Perbaikan Plafon Ruang Kelas XI",
      description: "Plafon ruang kelas XI mengalami kerusakan akibat hujan lebat.",
      amountRequested: 2_500_000,
      neededBy: new Date("2025-03-01"),
      status: BudgetRequestStatus.APPROVED,
      submittedById: pegawai1.id,
      submittedAt: new Date("2025-02-01"),
      approvedById: kepsek.id,
      approvedAt: new Date("2025-02-05"),
      approvalNote: "Segera dilaksanakan.",
    },
  });

  // Hubungkan ke rkabItem2
  await prisma.rkabItem.update({
    where: { id: rkabItem2.id },
    data: { budgetRequestId: reqApproved.id },
  });

  // 3. SUBMITTED
  const reqSubmitted = await prisma.budgetRequest.create({
    data: {
      title: "Pengadaan Seragam Olahraga Ekstrakurikuler",
      description: "Seragam untuk peserta ekstrakurikuler pramuka dan basket.",
      amountRequested: 1_500_000,
      neededBy: new Date("2025-04-01"),
      status: BudgetRequestStatus.SUBMITTED,
      submittedById: guru2.id,
      submittedAt: new Date("2025-02-10"),
    },
  });

  // 4. REJECTED
  const reqRejected = await prisma.budgetRequest.create({
    data: {
      title: "Pembelian Laptop Baru",
      description: "Pengajuan laptop untuk ruang TIK.",
      amountRequested: 15_000_000,
      status: BudgetRequestStatus.REJECTED,
      submittedById: guru1.id,
      submittedAt: new Date("2025-02-05"),
      approvedById: kepsek.id,
      approvedAt: new Date("2025-02-08"),
      approvalNote: "Tidak sesuai dengan prioritas anggaran tahun ini. Ajukan kembali di RKAB 2026.",
    },
  });

  // 5. DRAFT
  await prisma.budgetRequest.create({
    data: {
      title: "Transport Studi Banding",
      description: "Biaya transport kunjungan ke sekolah referensi.",
      amountRequested: 3_000_000,
      status: BudgetRequestStatus.DRAFT,
      submittedById: pegawai2.id,
    },
  });

  // 6. COMPLETED – dengan bukti
  const reqCompleted = await prisma.budgetRequest.create({
    data: {
      title: "Perlengkapan Upacara HUT RI",
      description: "Pembelian bendera, tiang, dan perlengkapan upacara.",
      amountRequested: 800_000,
      status: BudgetRequestStatus.COMPLETED,
      submittedById: pegawai1.id,
      submittedAt: new Date("2025-07-20"),
      approvedById: kepsek.id,
      approvedAt: new Date("2025-07-22"),
      disbursedById: bendahara.id,
      disbursedAt: new Date("2025-07-25"),
    },
  });

  console.log("📝 Budget requests created");

  // ─── Request Proofs ───────────────────────────────────────────────────────────
  await prisma.requestProof.createMany({
    data: [
      {
        requestId: reqCompleted.id,
        fileUrl: "https://storage.example.com/proofs/nota-perlengkapan-upacara.pdf",
        publicId: "proofs/nota-perlengkapan-upacara",
        fileName: "nota-perlengkapan-upacara.pdf",
        mimeType: "application/pdf",
        size: 124_000,
      },
      {
        requestId: reqDisbursed.id,
        fileUrl: "https://storage.example.com/proofs/kwitansi-atk-januari.jpg",
        publicId: "proofs/kwitansi-atk-januari",
        fileName: "kwitansi-atk-januari.jpg",
        mimeType: "image/jpeg",
        size: 87_500,
      },
    ],
  });

  console.log("📎 Request proofs created");

  // ─── Ledger Entries ───────────────────────────────────────────────────────────
  await prisma.ledgerEntry.createMany({
    data: [
      // INCOME
      {
        type: CategoryType.INCOME,
        amount: 50_000_000,
        date: new Date("2025-01-05"),
        description: "Penerimaan Dana BOS Triwulan I",
        fundingSourceId: bos.id,
        recordedById: bendahara.id,
      },
      {
        type: CategoryType.INCOME,
        amount: 20_000_000,
        date: new Date("2025-01-07"),
        description: "Penerimaan Dana BOSDA Semester 1",
        fundingSourceId: bosda.id,
        recordedById: bendahara.id,
      },
      {
        type: CategoryType.INCOME,
        amount: 15_000_000,
        date: new Date("2025-02-01"),
        description: "Penerimaan Dana Komite Februari",
        fundingSourceId: komite.id,
        recordedById: bendahara.id,
      },
      {
        type: CategoryType.INCOME,
        amount: 50_000_000,
        date: new Date("2025-04-05"),
        description: "Penerimaan Dana BOS Triwulan II",
        fundingSourceId: bos.id,
        recordedById: bendahara.id,
      },
      // EXPENSE
      {
        type: CategoryType.EXPENSE,
        amount: 1_200_000,
        date: new Date("2025-01-26"),
        description: "Pembelian ATK Kelas X",
        rkabItemId: rkabItem1.id,
        recordedById: bendahara.id,
      },
      {
        type: CategoryType.EXPENSE,
        amount: 2_000_000,
        date: new Date("2025-02-10"),
        description: "Pembelian cat dan material perbaikan gedung",
        rkabItemId: rkabItem2.id,
        recordedById: bendahara.id,
      },
      {
        type: CategoryType.EXPENSE,
        amount: 1_500_000,
        date: new Date("2025-03-05"),
        description: "Honor pelatih ekstrakurikuler",
        rkabItemId: rkabItem3.id,
        recordedById: bendahara.id,
      },
      {
        type: CategoryType.EXPENSE,
        amount: 2_500_000,
        date: new Date("2025-03-15"),
        description: "Biaya tenaga ahli perbaikan plafon",
        rkabItemId: rkabItem2.id,
        recordedById: bendahara.id,
      },
      {
        type: CategoryType.EXPENSE,
        amount: 800_000,
        date: new Date("2025-07-26"),
        description: "Perlengkapan upacara HUT RI",
        recordedById: bendahara.id,
      },
    ],
  });

  console.log("📒 Ledger entries created");

  // ─── Financial Reports ────────────────────────────────────────────────────────
  await prisma.financialReport.createMany({
    data: [
      {
        type: ReportType.INCOME,
        period: "2025-01",
        title: "Laporan Pemasukan Januari 2025",
        fileUrl: "https://storage.example.com/reports/income-2025-01.pdf",
        fileName: "laporan-pemasukan-januari-2025.pdf",
        mimeType: "application/pdf",
        size: 215_000,
        summary: {
          totalIncome: 70_000_000,
          sources: ["Dana BOS", "Dana BOSDA"],
        },
        createdById: bendahara.id,
      },
      {
        type: ReportType.EXPENSE,
        period: "2025-01",
        title: "Laporan Pengeluaran Januari 2025",
        fileUrl: "https://storage.example.com/reports/expense-2025-01.pdf",
        fileName: "laporan-pengeluaran-januari-2025.pdf",
        mimeType: "application/pdf",
        size: 198_000,
        summary: {
          totalExpense: 1_200_000,
          categories: ["ATK"],
        },
        createdById: bendahara.id,
      },
      {
        type: ReportType.BALANCE,
        period: "2025-01",
        title: "Laporan Neraca Januari 2025",
        fileUrl: "https://storage.example.com/reports/balance-2025-01.pdf",
        fileName: "laporan-neraca-januari-2025.pdf",
        mimeType: "application/pdf",
        size: 230_000,
        summary: {
          totalIncome: 70_000_000,
          totalExpense: 1_200_000,
          balance: 68_800_000,
        },
        createdById: bendahara.id,
      },
    ],
  });

  console.log("📊 Financial reports created");

  // ─── Notifications ────────────────────────────────────────────────────────────
  await prisma.notification.createMany({
    data: [
      // Ke guru1: pengajuannya disetujui
      {
        userId: guru1.id,
        title: "Pengajuan Disetujui",
        message: `Pengajuan anggaran "${reqDisbursed.title}" telah disetujui oleh Kepala Sekolah.`,
        type: NotificationType.SUCCESS,
        isRead: true,
        link: `/requests/${reqDisbursed.id}`,
      },
      // Ke guru1: pengajuannya ditolak
      {
        userId: guru1.id,
        title: "Pengajuan Ditolak",
        message: `Pengajuan anggaran "${reqRejected.title}" ditolak. Lihat catatan persetujuan untuk detail.`,
        type: NotificationType.ERROR,
        isRead: false,
        link: `/requests/${reqRejected.id}`,
      },
      // Ke guru2: ada pengajuan masuk (SUBMITTED)
      {
        userId: guru2.id,
        title: "Pengajuan Terkirim",
        message: `Pengajuan "${reqSubmitted.title}" berhasil dikirim dan menunggu persetujuan.`,
        type: NotificationType.INFO,
        isRead: false,
        link: `/requests/${reqSubmitted.id}`,
      },
      // Ke kepsek: ada pengajuan baru masuk
      {
        userId: kepsek.id,
        title: "Pengajuan Baru Menunggu Persetujuan",
        message: `"${reqSubmitted.title}" dari ${guru2.name} menunggu persetujuan Anda.`,
        type: NotificationType.WARNING,
        isRead: false,
        link: `/requests/${reqSubmitted.id}`,
      },
      // Ke bendahara: ada yang sudah disetujui, siap dicairkan
      {
        userId: bendahara.id,
        title: "Dana Siap Dicairkan",
        message: `Pengajuan "${reqApproved.title}" telah disetujui Kepala Sekolah dan siap dicairkan.`,
        type: NotificationType.INFO,
        isRead: false,
        link: `/requests/${reqApproved.id}`,
      },
      // Ke pegawai1: dana sudah cair
      {
        userId: pegawai1.id,
        title: "Dana Telah Dicairkan",
        message: `Dana untuk "${reqApproved.title}" telah dicairkan oleh Bendahara.`,
        type: NotificationType.SUCCESS,
        isRead: false,
        link: `/requests/${reqApproved.id}`,
      },
    ],
  });

  console.log("🔔 Notifications created");

  console.log("\n✅ Seed completed successfully!");
  console.log("\n📋 Summary:");
  console.log("   Users         : 6 (1 Kepsek, 1 Bendahara, 2 Guru, 2 Pegawai)");
  console.log("   Funding Sources: 3 (BOS, BOSDA, Komite)");
  console.log("   RKAB          : 2 (1 Approved, 1 Draft)");
  console.log("   RKAB Items    : 4");
  console.log("   Budget Requests: 6 (Disbursed/Approved/Submitted/Rejected/Draft/Completed)");
  console.log("   Request Proofs : 2");
  console.log("   Ledger Entries : 9 (4 Income, 5 Expense)");
  console.log("   Financial Reports: 3 (Income/Expense/Balance Jan 2025)");
  console.log("   Notifications  : 6");
  console.log("\n🔐 Default password untuk semua akun: password123");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });