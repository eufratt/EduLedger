import { NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/pages/api/auth/[...nextauth]"
import { prisma } from "@/lib/prisma"
import { z } from "zod"
import { CategoryType, Role, Prisma } from "@prisma/client"

function forbidden() {
  return NextResponse.json({ error: "Forbidden" }, { status: 403 })
}
function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 })
}

const CreateIncomeSchema = z.object({
  amount: z.number({
    message: "Jumlah dana harus berupa angka",
  }).int().positive("Jumlah dana harus berupa angka positif"),
  date: z.string({
    message: "Tanggal penerimaan wajib diisi",
  }).datetime({ message: "Format tanggal tidak valid" }),
  description: z.string().trim().max(200, "Deskripsi maksimal 200 karakter").optional(),
  fundingSourceId: z.number({
    message: "ID sumber dana tidak valid",
  }).int().positive().optional(),
})

type IncomeItem = Prisma.LedgerEntryGetPayload<{
  include: {
    fundingSource: { select: { id: true; name: true; agency: true } }
    recordedBy: { select: { id: true; name: true } }
  }
}>

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user) return forbidden()
  if (session.user.role !== Role.BENDAHARA) return forbidden()

  // rolling 12 bulan terakhir (UTC-ish)
  const end = new Date()
  const start = new Date(end)
  start.setUTCFullYear(end.getUTCFullYear() - 1)

  const [sumAgg, items] = await Promise.all([
    prisma.ledgerEntry.aggregate({
      where: { type: CategoryType.INCOME, date: { gte: start, lt: end } },
      _sum: { amount: true },
    }),
    prisma.ledgerEntry.findMany({
      where: { type: CategoryType.INCOME, date: { gte: start, lt: end } },
      orderBy: { date: "desc" },
      take: 50,
      include: {
        fundingSource: { select: { id: true, name: true, agency: true } },
        recordedBy: { select: { id: true, name: true } },
      },
    }),
  ])

  const total = Number(sumAgg._sum.amount ?? 0)

  return NextResponse.json({
    period: { start: start.toISOString(), end: end.toISOString() },
    totalPenerimaan: total,
    items: (items as IncomeItem[]).map((x) => ({
      id: x.id,
      amount: x.amount,
      date: x.date,
      title: x.description ?? x.fundingSource?.name ?? "Penerimaan",
      description: x.description,
      fundingSource: x.fundingSource,
      recordedBy: x.recordedBy,
      createdAt: x.createdAt,
    })),
  })
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return forbidden()
  if (session.user.role !== Role.BENDAHARA) return forbidden()

  const recordedById = Number(session.user.id)
  if (!Number.isInteger(recordedById) || recordedById <= 0) {
    return NextResponse.json({ error: "Invalid session user id" }, { status: 401 })
  }

  const json = await req.json().catch(() => null)
  const parsed = CreateIncomeSchema.safeParse(json)

  if (!parsed.success) {
    const firstError = parsed.error.issues[0]?.message || "Invalid body"
    return badRequest(firstError)
  }

  if (parsed.data.fundingSourceId) {
    const fs = await prisma.fundingSource.findUnique({
      where: { id: parsed.data.fundingSourceId },
      select: { id: true },
    })
    if (!fs) return badRequest("Funding source not found")
  }

  const created: IncomeItem = await prisma.ledgerEntry.create({
    data: {
      type: CategoryType.INCOME,
      amount: parsed.data.amount,
      date: new Date(parsed.data.date),
      description: parsed.data.description,
      fundingSourceId: parsed.data.fundingSourceId,
      recordedById,
    },
    include: {
      fundingSource: { select: { id: true, name: true, agency: true } },
      recordedBy: { select: { id: true, name: true } },
    },
  })

  return NextResponse.json(
    {
      id: created.id,
      amount: created.amount,
      date: created.date,
      title: created.description ?? created.fundingSource?.name ?? "Penerimaan",
      description: created.description,
      fundingSource: created.fundingSource,
      recordedBy: created.recordedBy,
      createdAt: created.createdAt,
    },
    { status: 201 }
  )
}
