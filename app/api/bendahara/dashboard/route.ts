import { NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/pages/api/auth/[...nextauth]"
import { prisma } from "@/lib/prisma"
import { BudgetRequestStatus, CategoryType, Role } from "@prisma/client"

function forbidden() {
  return NextResponse.json({ error: "Forbidden" }, { status: 403 })
}

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user) return forbidden()
  if (session.user.role !== Role.BENDAHARA) return forbidden()

  // 12 bulan terakhir (untuk masuk/keluar)
  const end = new Date()
  const start12M = new Date(end)
  start12M.setUTCFullYear(end.getUTCFullYear() - 1)

  // Saldo sepanjang waktu
  const incomeAllQ = prisma.ledgerEntry.aggregate({
    where: { type: CategoryType.INCOME },
    _sum: { amount: true },
  })
  const expenseAllQ = prisma.ledgerEntry.aggregate({
    where: { type: CategoryType.EXPENSE },
    _sum: { amount: true },
  })

  // Masuk/Keluar 12 bulan terakhir
  const income12MQ = prisma.ledgerEntry.aggregate({
    where: { type: CategoryType.INCOME, date: { gte: start12M, lt: end } },
    _sum: { amount: true },
  })
  const expense12MQ = prisma.ledgerEntry.aggregate({
    where: { type: CategoryType.EXPENSE, date: { gte: start12M, lt: end } },
    _sum: { amount: true },
  })

  // Actions (global)
  const readyDisburseQ = prisma.budgetRequest.aggregate({
    where: { status: BudgetRequestStatus.APPROVED },
    _count: { _all: true },
    _sum: { amountRequested: true },
  })

  const missingProofQ = prisma.budgetRequest.count({
    where: {
      status: BudgetRequestStatus.DISBURSED,
      proofs: { none: {} },
    },
  })

  const [incomeAll, expenseAll, income12M, expense12M, readyAgg, missingProofCount] =
    await Promise.all([
      incomeAllQ,
      expenseAllQ,
      income12MQ,
      expense12MQ,
      readyDisburseQ,
      missingProofQ,
    ])

  const totalIncome = Number(incomeAll._sum.amount ?? 0)
  const totalExpense = Number(expenseAll._sum.amount ?? 0)
  const totalSaldo = totalIncome - totalExpense

  const danaMasuk = Number(income12M._sum.amount ?? 0)
  const danaKeluar = Number(expense12M._sum.amount ?? 0)

  const readyCount = Number(readyAgg._count._all ?? 0)
  const readyTotal = Number(readyAgg._sum.amountRequested ?? 0)

  // belum ada model Notification, jadi badge dihitung dari tindakan
  const notifCount = readyCount + missingProofCount

  return NextResponse.json({
    period: {
      rolling12m: { start: start12M.toISOString(), end: end.toISOString() },
    },
    header: {
      greetingName: session.user.name ?? "Bendahara",
      tagline: "Kelola keuangan sekolah dengan efisien",
      notifications: { unreadCount: notifCount },
    },
    summary: {
      totalSaldo, // sepanjang waktu
      danaMasuk,  // 12 bulan terakhir
      danaKeluar, // 12 bulan terakhir
    },
    actionsRequired: [
      {
        key: "ready_disbursement",
        title: `${readyCount} Pengajuan Siap Dicairkan`,
        subtitle: `Total: Rp ${readyTotal}`,
      },
      {
        key: "missing_proof",
        title: `${missingProofCount} Pengajuan Belum Ada Bukti`,
        subtitle: "Cek & minta upload bukti",
      },
    ],
  })
}