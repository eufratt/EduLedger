import { NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/pages/api/auth/[...nextauth]"
import { prisma } from "@/lib/prisma"
import { ReportType, Role, CategoryType } from "@prisma/client"
import { z } from "zod"

function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
}
function forbidden() {
  return NextResponse.json({ error: "Forbidden" }, { status: 403 })
}
function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 })
}

const BodySchema = z.object({
  type: z.nativeEnum(ReportType),
  period: z.string().regex(/^\d{4}-\d{2}$/), // "YYYY-MM"
})

function monthRangeUTC(period: string) {
  const [yStr, mStr] = period.split("-")
  const y = Number(yStr)
  const m = Number(mStr) // 1-12
  const start = new Date(Date.UTC(y, m - 1, 1, 0, 0, 0))
  const end = new Date(Date.UTC(y, m, 1, 0, 0, 0))
  return { start, end, y, m }
}

function buildDummyFile(period: string, type: ReportType) {
  // dummy dulu: nanti ganti ke storage beneran
  const safeType = String(type).toLowerCase()
  const fileName = `laporan_${safeType}_${period}.pdf`
  const fileUrl = `/dummy-reports/${fileName}` // kamu bisa taruh file placeholder di public/dummy-reports/
  return { fileName, fileUrl }
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return unauthorized()

  const role = (session.user as any).role as Role | undefined
  if (role !== Role.KEPSEK) return forbidden()

  const bodyJson = await req.json().catch(() => null)
  const parsed = BodySchema.safeParse(bodyJson)
  if (!parsed.success) return badRequest("Invalid body")

  const { type, period } = parsed.data
  const { start, end } = monthRangeUTC(period)

  // Ambil ledger sesuai type laporan
  // - INCOME: ambil LedgerEntry.type = INCOME + fundingSource
  // - EXPENSE: ambil LedgerEntry.type = EXPENSE + rkabItem -> budgetRequest
  // - BALANCE: ambil dua-duanya (income & expense) untuk total
  const ledger = await prisma.ledgerEntry.findMany({
    where: {
      date: { gte: start, lt: end },
      ...(type === ReportType.BALANCE
        ? {}
        : {
            type:
              type === ReportType.INCOME
                ? CategoryType.INCOME
                : CategoryType.EXPENSE,
          }),
    },
    select: {
      type: true,
      amount: true,
      fundingSource: { select: { name: true } },
      rkabItem: {
        select: {
          budgetRequest: { select: { title: true } },
        },
      },
    },
  })

  // Build summary
  type Row = { label: string; amount: number; isTotal?: boolean }
  let summary: Row[] = []
  let title = ""

  if (type === ReportType.INCOME) {
    title = `Laporan Penerimaan Dana (${period})`
    const map = new Map<string, number>()
    for (const e of ledger) {
      const label = e.fundingSource?.name ?? "Lainnya"
      map.set(label, (map.get(label) ?? 0) + e.amount)
    }
    summary = Array.from(map.entries())
      .map(([label, amount]) => ({ label, amount }))
      .sort((a, b) => b.amount - a.amount)
    const total = summary.reduce((acc, x) => acc + x.amount, 0)
    summary.push({ label: "Total Penerimaan", amount: total, isTotal: true })
  }

  if (type === ReportType.EXPENSE) {
    title = `Laporan Pengeluaran Dana (${period})`
    const map = new Map<string, number>()
    for (const e of ledger) {
      const label = e.rkabItem?.budgetRequest?.title ?? "Pengeluaran Lainnya"
      map.set(label, (map.get(label) ?? 0) + e.amount)
    }
    summary = Array.from(map.entries())
      .map(([label, amount]) => ({ label, amount }))
      .sort((a, b) => b.amount - a.amount)
    const total = summary.reduce((acc, x) => acc + x.amount, 0)
    summary.push({ label: "Total Pengeluaran", amount: total, isTotal: true })
  }

  if (type === ReportType.BALANCE) {
    title = `Laporan Neraca Sederhana (${period})`
    let income = 0
    let expense = 0
    for (const e of ledger) {
      if (e.type === CategoryType.INCOME) income += e.amount
      if (e.type === CategoryType.EXPENSE) expense += e.amount
    }
    summary = [
      { label: "Total Penerimaan", amount: income },
      { label: "Total Pengeluaran", amount: expense },
      { label: "Saldo", amount: income - expense, isTotal: true },
    ]
  }

  const { fileName, fileUrl } = buildDummyFile(period, type)

  // size dummy: karena PDF belum beneran
  // biar UI kamu gak kosong, isi 0 dulu. Nanti pas udah upload PDF beneran, update size.
  const createdById = (session.user as any).id as number

  const saved = await prisma.financialReport.upsert({
    where: { type_period: { type, period } }, // requires @@unique([type, period]) -> Prisma creates compound unique input
    update: {
      title,
      summary: summary as any,
      fileUrl,
      fileName,
      size: 0,
      createdById, // optional: kalau mau pencatat siapa yang terakhir generate
    },
    create: {
      type,
      period,
      title,
      summary: summary as any,
      fileUrl,
      fileName,
      size: 0,
      createdById,
    },
    select: {
      id: true,
      type: true,
      period: true,
      title: true,
      createdAt: true,
    },
  })

  return NextResponse.json({
    ok: true,
    data: saved,
    meta: {
      rangeUTC: { start, end },
      itemsCount: ledger.length,
    },
  })
}