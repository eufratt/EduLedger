import { NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/pages/api/auth/[...nextauth]"
import { prisma } from "@/lib/prisma"
import { BudgetRequestStatus } from "@prisma/client"
import { CreateRequestSchema } from "@/schemas/requests.schema"


function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 })
}

function parseIntSafe(v: string | null, def: number) {
  const n = Number(v)
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : def
}

function mapFilterToStatuses(filter: string | null): BudgetRequestStatus[] | null {
  if (!filter || filter === "semua") return null
  switch (filter) {
    case "menunggu":
      return [BudgetRequestStatus.SUBMITTED]
    case "disetujui":
      return [BudgetRequestStatus.APPROVED,
      BudgetRequestStatus.DISBURSED,
      BudgetRequestStatus.COMPLETED
      ]
    case "ditolak":
      return [BudgetRequestStatus.REJECTED]
    default:
      return null
  }
}

function toLabel(s: BudgetRequestStatus) {
  if (s === BudgetRequestStatus.SUBMITTED) return "Menunggu"
  if (s === BudgetRequestStatus.APPROVED) return "Disetujui"
  if (s === BudgetRequestStatus.REJECTED) return "Ditolak"
  if (s === BudgetRequestStatus.DISBURSED) return "Dicairkan"
  if (s === BudgetRequestStatus.COMPLETED) return "Selesai"
  if (s === BudgetRequestStatus.CANCELLED) return "Dibatalkan"
  if (s === BudgetRequestStatus.DRAFT) return "Draft"
  return s
}


export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  if ((session.user as any).role !== "CIVITAS") {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 })
  }

  const userId = Number((session.user as any).id)
  if (!Number.isFinite(userId)) {
    return NextResponse.json({ error: "Invalid session userId" }, { status: 500 })
  }

  const json = await req.json().catch(() => null)
  if (!json) return badRequest("Body harus JSON")

  const result = CreateRequestSchema.safeParse(json)
  if (!result.success) {
    const error = result.error.issues[0]?.message || "Input tidak valid"
    return badRequest(error)
  }

  const { title, description, amountRequested, neededBy } = result.data

  let neededByDate: Date | null = null
  if (neededBy) {
    neededByDate = new Date(neededBy)
  }

  const created = await prisma.budgetRequest.create({
    data: {
      title,
      description: description && description.trim().length > 0 ? description : null,
      amountRequested,
      neededBy: neededByDate,
      status: BudgetRequestStatus.SUBMITTED,
      submittedById: userId,
      submittedAt: new Date(),
    },
    select: {
      id: true,
      title: true,
      description: true,
      amountRequested: true,
      neededBy: true,
      status: true,
      submittedAt: true,
      createdAt: true,
    },
  })

  return NextResponse.json({ data: created }, { status: 201 })
}

export async function GET(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  if ((session.user as any).role !== "CIVITAS") {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 })
  }

  const userId = Number((session.user as any).id)
  if (!Number.isFinite(userId)) {
    return NextResponse.json({ error: "Invalid session userId" }, { status: 500 })
  }

  const { searchParams } = new URL(req.url)
  const q = (searchParams.get("q") ?? "").trim()
  const filter = (searchParams.get("filter") ?? "semua").toLowerCase()
  const page = parseIntSafe(searchParams.get("page"), 1)
  const limit = parseIntSafe(searchParams.get("limit"), 10)

  const statuses = mapFilterToStatuses(filter)

  const where: any = {
    submittedById: userId,
    ...(q ? { title: { contains: q, mode: "insensitive" as const } } : {}),
  }

  if (statuses) {
    where.status = { in: statuses }
  } else {
    where.status = {
      in: [
        BudgetRequestStatus.SUBMITTED,
        BudgetRequestStatus.APPROVED,
        BudgetRequestStatus.REJECTED,
        BudgetRequestStatus.DISBURSED,
        BudgetRequestStatus.COMPLETED,
      ],
    }
  }

  const skip = (page - 1) * limit

  const [total, rows] = await prisma.$transaction([
    prisma.budgetRequest.count({ where }),
    prisma.budgetRequest.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
      select: {
        id: true,
        title: true,
        amountRequested: true,
        status: true,
        createdAt: true,
        submittedAt: true,
        disbursedAt: true,
      },
    }),
  ])

  return NextResponse.json({
    data: rows.map((r) => ({
      id: r.id,
      judul: r.title,
      jumlah: r.amountRequested,
      status: r.status,
      statusLabel: toLabel(r.status),
      tanggal: r.disbursedAt ?? r.createdAt,
    })),
    meta: { page, limit, total },
  })
}