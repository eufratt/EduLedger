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

const GetQuerySchema = z.object({
  // "YYYY-MM"
  period: z.string().regex(/^\d{4}-\d{2}$/).optional(),
  // INCOME / EXPENSE
  type: z.nativeEnum(CategoryType).optional(),
  q: z.string().trim().max(80).optional(),
  cursor: z.coerce.number().int().positive().optional(),
  take: z.coerce.number().int().min(1).max(50).default(20),
})

const PostBodySchema = z.object({
  type: z.nativeEnum(CategoryType),
  amount: z.coerce.number().int().positive(),
  // "YYYY-MM-DD"
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  description: z.string().trim().max(200).optional(),
  fundingSourceId: z.coerce.number().int().positive().optional(),
  rkabItemId: z.coerce.number().int().positive().optional(),
})

function monthRangeUTC(period: string) {
  const [y, m] = period.split("-").map((v) => Number(v))
  const start = new Date(Date.UTC(y, m - 1, 1, 0, 0, 0))
  const end = new Date(Date.UTC(y, m, 1, 0, 0, 0)) // next month
  return { start, end }
}

type TxItem = Prisma.LedgerEntryGetPayload<{
  include: {
    fundingSource: { select: { id: true; name: true; agency: true } }
    rkabItem: {
      select: { id: true; budgetRequest: { select: { id: true; title: true } } }
    }
  }
}>

export async function GET(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return forbidden()
  if (session.user.role !== Role.BENDAHARA) return forbidden()

  const url = new URL(req.url)
  const parsed = GetQuerySchema.safeParse({
    period: url.searchParams.get("period") ?? undefined,
    type: (url.searchParams.get("type") as any) ?? undefined,
    q: url.searchParams.get("q") ?? undefined,
    cursor: url.searchParams.get("cursor") ?? undefined,
    take: url.searchParams.get("take") ?? undefined,
  })
  if (!parsed.success) return badRequest("Invalid query")

  const { period, type, q, cursor, take } = parsed.data

  // Default: bulan ini (biar UI langsung ada isi tanpa query period)
  const periodUsed = period ?? (() => {
    const now = new Date()
    const y = now.getFullYear()
    const m = String(now.getMonth() + 1).padStart(2, "0")
    return `${y}-${m}`
  })()

  const { start, end } = monthRangeUTC(periodUsed)

  const searchWhere: Prisma.LedgerEntryWhereInput | undefined = q
    ? {
      OR: [
        { description: { contains: q, mode: "insensitive" } },
        { fundingSource: { name: { contains: q, mode: "insensitive" } } },
        { rkabItem: { budgetRequest: { title: { contains: q, mode: "insensitive" } } } },
      ],
    }
    : undefined

  const where: Prisma.LedgerEntryWhereInput = {
    date: { gte: start, lt: end },
    ...(type ? { type } : {}),
    ...(searchWhere ?? {}),
  }

  const [sum, items] = await Promise.all([
    prisma.ledgerEntry.aggregate({
      where,
      _sum: { amount: true },
    }),
    prisma.ledgerEntry.findMany({
      where,
      orderBy: [{ date: "desc" }, { id: "desc" }],
      take,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
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

  const mapped = (items as TxItem[]).map((x) => {
    const isIncome = x.type === CategoryType.INCOME
    const title =
      x.description ??
      (isIncome ? x.fundingSource?.name : x.rkabItem?.budgetRequest?.title) ??
      (isIncome ? "Penerimaan" : "Pengeluaran")

    return {
      id: x.id,
      type: x.type,
      title,
      amount: x.amount,
      date: x.date,
      fundingSource: x.fundingSource,
      rkabItemId: x.rkabItemId,
      budgetRequest: x.rkabItem?.budgetRequest ?? null,
    }
  })

  const nextCursor = mapped.length ? mapped[mapped.length - 1].id : null

  return NextResponse.json({
    period: periodUsed,
    range: { start: start.toISOString(), end: end.toISOString() },
    total: Number(sum._sum.amount ?? 0),
    q: q ?? null,
    nextCursor,
    items: mapped,
  })
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return forbidden()
  if (session.user.role !== Role.BENDAHARA) return forbidden()

  const json = await req.json().catch(() => null)
  const parsed = PostBodySchema.safeParse(json)
  if (!parsed.success) return badRequest("Invalid body")

  const {
    type,
    amount,
    date,
    description,
    fundingSourceId,
    rkabItemId,
  } = parsed.data

  // guard: income wajib punya fundingSourceId? (opsional, tapi biasanya iya)
  // kalau mau wajib, uncomment:
  // if (type === CategoryType.INCOME && !fundingSourceId) return badRequest("fundingSourceId wajib untuk INCOME")

  const recordedById = Number(session.user.id)
  if (!Number.isFinite(recordedById) || recordedById <= 0) {
    return badRequest("Invalid session user id")
  }

  const created = await prisma.ledgerEntry.create({
    data: {
      type,
      amount,
      date: new Date(date + "T00:00:00.000Z"),
      description: description?.replace(/\s+/g, " "),
      fundingSourceId: fundingSourceId ?? null,
      rkabItemId: rkabItemId ?? null,
      recordedById, // ✅ ini
    },
    include: {
      fundingSource: { select: { id: true, name: true, agency: true } },
      rkabItem: {
        select: {
          id: true,
          budgetRequest: { select: { id: true, title: true } },
        },
      },
    },
  })

  return NextResponse.json(created, { status: 201 })
}