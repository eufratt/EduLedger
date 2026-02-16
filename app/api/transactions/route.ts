import { NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/pages/api/auth/[...nextauth]"
import { prisma } from "@/lib/prisma"
import { CategoryType, Role, Prisma } from "@prisma/client"
import { z } from "zod"

function forbidden() {
  return NextResponse.json({ error: "Forbidden" }, { status: 403 })
}
function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 })
}

const QuerySchema = z.object({
  filter: z.enum(["all", "income", "expense"]).optional(),
  q: z.string().trim().max(80).optional(),
  cursor: z.coerce.number().int().positive().optional(),
  take: z.coerce.number().int().min(1).max(50).optional(),
})

type TxItem = Prisma.LedgerEntryGetPayload<{
  include: {
    fundingSource: { select: { id: true; name: true; agency: true } }
    rkabItem: {
      select: {
        id: true
        budgetRequest: { select: { id: true; title: true } }
      }
    }
  }
}>

export async function GET(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return forbidden()
  if (session.user.role !== Role.BENDAHARA) return forbidden()

  const url = new URL(req.url)
  const parsed = QuerySchema.safeParse({
    filter: url.searchParams.get("filter") ?? undefined,
    q: url.searchParams.get("q") ?? undefined,
    cursor: url.searchParams.get("cursor") ?? undefined,
    take: url.searchParams.get("take") ?? undefined,
  })
  if (!parsed.success) return badRequest("Invalid query")

  const filter = parsed.data.filter ?? "all"
  const q = parsed.data.q?.trim()
  const take = parsed.data.take ?? 20
  const cursorId = parsed.data.cursor

  // rolling 12 bulan (periode sama buat masuk/keluar/saldo)
  const end = new Date()
  const start = new Date(end)
  start.setUTCFullYear(end.getUTCFullYear() - 1)

  const typeWhere =
    filter === "income"
      ? CategoryType.INCOME
      : filter === "expense"
      ? CategoryType.EXPENSE
      : null

  // search: cari di description, fundingSource.name, dan (kalau expense) title pengajuan di rkabItem.budgetRequest.title
  const searchWhere: Prisma.LedgerEntryWhereInput | undefined = q
    ? {
        OR: [
          { description: { contains: q, mode: "insensitive" } },
          { fundingSource: { name: { contains: q, mode: "insensitive" } } },
          { rkabItem: { budgetRequest: { title: { contains: q, mode: "insensitive" } } } },
        ],
      }
    : undefined

  const baseWhere: Prisma.LedgerEntryWhereInput = {
    date: { gte: start, lt: end },
    ...(typeWhere ? { type: typeWhere } : {}),
    ...(searchWhere ? searchWhere : {}),
  }

  // Summary harus tetap ALL types biar kartu Masuk/Keluar/Saldo selalu lengkap
  const [sumIncome, sumExpense, items] = await Promise.all([
    prisma.ledgerEntry.aggregate({
      where: { date: { gte: start, lt: end }, type: CategoryType.INCOME },
      _sum: { amount: true },
    }),
    prisma.ledgerEntry.aggregate({
      where: { date: { gte: start, lt: end }, type: CategoryType.EXPENSE },
      _sum: { amount: true },
    }),
    prisma.ledgerEntry.findMany({
      where: baseWhere,
      orderBy: [{ date: "desc" }, { id: "desc" }],
      take,
      ...(cursorId ? { cursor: { id: cursorId }, skip: 1 } : {}),
      include: {
        fundingSource: { select: { id: true, name: true, agency: true } },
        rkabItem: {
          select: {
            id: true,
            budgetRequest: { select: { id: true, title: true } },
          },
        },
      },
    }),
  ])

  const income = Number(sumIncome._sum.amount ?? 0)
  const expense = Number(sumExpense._sum.amount ?? 0)
  const balance = income - expense

  const mapped = (items as TxItem[]).map((x) => {
    const isIncome = x.type === CategoryType.INCOME
    const title =
      x.description ??
      (isIncome
        ? x.fundingSource?.name
        : x.rkabItem?.budgetRequest?.title) ??
      (isIncome ? "Penerimaan" : "Pengeluaran")

    return {
      id: x.id,
      type: x.type, // INCOME/EXPENSE
      title,
      amount: x.amount,
      date: x.date,
      // optional detail
      fundingSource: x.fundingSource,
      rkabItemId: x.rkabItemId,
      budgetRequest: x.rkabItem?.budgetRequest ?? null,
    }
  })

  const nextCursor = mapped.length ? mapped[mapped.length - 1].id : null

  return NextResponse.json({
    period: { start: start.toISOString(), end: end.toISOString() },
    summary: { income, expense, balance },
    filter,
    q: q ?? null,
    nextCursor,
    items: mapped,
  })
}