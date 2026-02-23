import { NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/pages/api/auth/[...nextauth]"
import { prisma } from "@/lib/prisma"
import { BudgetRequestStatus, CategoryType, Role } from "@prisma/client"

function forbidden() {
  return NextResponse.json({ error: "Forbidden" }, { status: 403 })
}

function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
}

function parseIntSafe(v: string | null, def: number) {
  const n = Number(v)
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : def
}

export async function GET(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return unauthorized()
  if (session.user.role !== Role.BENDAHARA) return forbidden()

  const url = new URL(req.url)
  const limitActivities = parseIntSafe(url.searchParams.get("limitActivities"), 5)

  // 12 bulan terakhir
  const end = new Date()
  const start12M = new Date(end)
  start12M.setUTCFullYear(end.getUTCFullYear() - 1)

  // saldo all-time
  const incomeAllQ = prisma.ledgerEntry.aggregate({
    where: { type: CategoryType.INCOME },
    _sum: { amount: true },
  })
  const expenseAllQ = prisma.ledgerEntry.aggregate({
    where: { type: CategoryType.EXPENSE },
    _sum: { amount: true },
  })

  // masuk/keluar 12 bulan
  const income12MQ = prisma.ledgerEntry.aggregate({
    where: { type: CategoryType.INCOME, date: { gte: start12M, lt: end } },
    _sum: { amount: true },
  })
  const expense12MQ = prisma.ledgerEntry.aggregate({
    where: { type: CategoryType.EXPENSE, date: { gte: start12M, lt: end } },
    _sum: { amount: true },
  })

  // tindakan
  const readyDisburseQ = prisma.budgetRequest.aggregate({
    where: { status: BudgetRequestStatus.APPROVED },
    _count: { _all: true },
    _sum: { amountRequested: true },
  })

  const missingProofQ = prisma.budgetRequest.count({
    where: { status: BudgetRequestStatus.DISBURSED, proofs: { none: {} } },
  })

  // aktivitas terbaru (ambil dari BudgetRequest biar relevan)
  const activityQ = prisma.budgetRequest.findMany({
    orderBy: { createdAt: "desc" },
    take: Math.min(limitActivities, 20),
    select: {
      id: true,
      title: true,
      amountRequested: true,
      status: true,
      createdAt: true,
      submittedBy: { select: { name: true } },
    },
  })

  const [incomeAll, expenseAll, income12M, expense12M, readyAgg, missingProofCount, activities] =
    await Promise.all([
      incomeAllQ,
      expenseAllQ,
      income12MQ,
      expense12MQ,
      readyDisburseQ,
      missingProofQ,
      activityQ,
    ])

  const totalIncome = Number(incomeAll._sum.amount ?? 0)
  const totalExpense = Number(expenseAll._sum.amount ?? 0)

  const totalSaldo = totalIncome - totalExpense
  const danaMasuk12M = Number(income12M._sum.amount ?? 0)
  const danaKeluar12M = Number(expense12M._sum.amount ?? 0)

  const readyCount = Number(readyAgg._count._all ?? 0)
  const readyTotal = Number(readyAgg._sum.amountRequested ?? 0)

  const unreadNotif = readyCount + missingProofCount

  return NextResponse.json({
    user: {
      name: session.user.name ?? "Bendahara",
    },
    summary: {
      totalSaldo,
      danaMasuk12M,
      danaKeluar12M,
      siapCairCount: readyCount,
      siapCairTotal: readyTotal,
      buktiKurangCount: missingProofCount,
      unreadNotif,
    },
    aktivitasTerbaru: activities.map((a) => ({
      id: a.id,
      judul: a.title,
      jumlah: a.amountRequested,
      status: a.status,
      createdAt: a.createdAt.toISOString(),
      oleh: a.submittedBy?.name ?? "-",
    })),
  })
}