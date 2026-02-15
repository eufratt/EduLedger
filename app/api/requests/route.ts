// app/api/requests/route.ts
import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/pages/api/auth/[...nextauth]" // sesuaikan path kamu
import { prisma } from "@/lib/prisma" // sesuaikan path prisma client
import { BudgetRequestStatus, CategoryType, Role } from "@prisma/client"

type CreateRequestBody = {
  title?: string
  description?: string
  amountRequested?: number
  neededBy?: string // "YYYY-MM-DD" dari mobile
  // categoryId sengaja gak ada karena mockup belum punya
}

function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 })
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const role = (session.user as any).role as Role | string
  if (role !== "CIVITAS") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const userId = Number((session.user as any).id)
  if (!Number.isFinite(userId)) {
    return NextResponse.json({ error: "Invalid session userId" }, { status: 500 })
  }

  let body: CreateRequestBody
  try {
    body = await req.json()
  } catch {
    return badRequest("Body harus JSON")
  }

  const title = (body.title ?? "").trim()
  const description = (body.description ?? "").trim()
  const amountRequested = Number(body.amountRequested)

  if (title.length < 3) return badRequest("Judul minimal 3 karakter")
  if (description.length > 0 && description.length < 10)
    return badRequest("Deskripsi minimal 10 karakter (atau kosongin)")

  if (!Number.isFinite(amountRequested) || amountRequested <= 0)
    return badRequest("Jumlah dana harus > 0")

  // neededBy opsional di schema, tapi mockup ada fieldnya.
  // kita validasi kalau diisi.
  let neededByDate: Date | null = null
  if (body.neededBy) {
    // parse "YYYY-MM-DD" menjadi Date UTC biar konsisten
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(body.neededBy)
    if (!m) return badRequest("Format tanggal harus YYYY-MM-DD")
    const y = Number(m[1])
    const mo = Number(m[2])
    const d = Number(m[3])
    neededByDate = new Date(Date.UTC(y, mo - 1, d, 0, 0, 0))

    const todayUTC = new Date()
    const todayFloor = new Date(Date.UTC(todayUTC.getUTCFullYear(), todayUTC.getUTCMonth(), todayUTC.getUTCDate()))
    if (neededByDate < todayFloor) return badRequest("Tanggal dibutuhkan tidak boleh di masa lalu")
  }

  // Karena schema butuh categoryId, kita pakai kategori default:
  // name: "Umum", type: EXPENSE
  const defaultCategory = await prisma.category.upsert({
    where: {
      // gak ada unique key di schema selain id, jadi kita cari manual via findFirst + create.
      // Upsert gak bisa pakai findFirst. Jadi kita lakukan cara aman via transaction:
      // (kita implement di bawah, bukan di sini)
      id: -1,
    },
    update: {},
    create: { name: "Umum", type: CategoryType.EXPENSE },
  }).catch(async () => {
    // fallback: cari dulu
    const existing = await prisma.category.findFirst({
      where: { name: "Umum", type: CategoryType.EXPENSE },
      select: { id: true },
    })
    if (existing) return existing
    const created = await prisma.category.create({
      data: { name: "Umum", type: CategoryType.EXPENSE },
      select: { id: true },
    })
    return created
  })

  const created = await prisma.budgetRequest.create({
    data: {
    title,
    description: description.length ? description : null,
    amountRequested,
    neededBy: neededByDate,
    status: BudgetRequestStatus.SUBMITTED,
    submittedById: userId,
    submittedAt: new Date(),
    // categoryId: tidak diisi
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

  return NextResponse.json(
    {
      id: created.id,
      title: created.title,
      description: created.description,
      amountRequested: created.amountRequested,
      neededBy: created.neededBy,
      status: created.status,
      submittedAt: created.submittedAt,
      createdAt: created.createdAt,
    },
    { status: 201 }
  )
}



function parseIntSafe(v: string | null, def: number) {
  const n = Number(v)
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : def
}

function mapFilterToStatuses(filter: string | null): BudgetRequestStatus[] | null {
  // filter UI: semua | menunggu | disetujui | ditolak
  if (!filter || filter === "semua") return null

  switch (filter) {
    case "menunggu":
      return [BudgetRequestStatus.SUBMITTED]
    case "disetujui":
      return [BudgetRequestStatus.APPROVED]
    case "ditolak":
      return [BudgetRequestStatus.REJECTED]
    default:
      return null
  }
}

export async function GET(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const role = (session.user as any).role as Role | string
  if (role !== "CIVITAS") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const userId = Number((session.user as any).id)
  if (!Number.isFinite(userId)) {
    return NextResponse.json({ error: "Invalid session userId" }, { status: 500 })
  }

  const { searchParams } = new URL(req.url)

  // query dari UI
  const q = (searchParams.get("q") ?? "").trim()
  const filter = (searchParams.get("filter") ?? "semua").toLowerCase()
  const page = parseIntSafe(searchParams.get("page"), 1)
  const limit = parseIntSafe(searchParams.get("limit"), 10)

  const statuses = mapFilterToStatuses(filter)

  // default “riwayat” civitas biasanya ga butuh DRAFT
  const baseWhere: any = {
    submittedById: userId,
    ...(q
      ? {
          title: { contains: q, mode: "insensitive" as const },
        }
      : {}),
  }

  if (statuses) {
    baseWhere.status = { in: statuses }
  } else {
    // filter "semua": tampilkan yang relevan buat civitas (exclude DRAFT biar gak bikin bingung)
    baseWhere.status = { in: [
      BudgetRequestStatus.SUBMITTED,
      BudgetRequestStatus.APPROVED,
      BudgetRequestStatus.REJECTED,
      //BudgetRequestStatus.CANCELLED, // boleh kamu buang kalau gak mau tampil
    ] }
  }

  const skip = (page - 1) * limit

  const [total, rows] = await prisma.$transaction([
    prisma.budgetRequest.count({ where: baseWhere }),
    prisma.budgetRequest.findMany({
      where: baseWhere,
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
        approvedAt: true,
      },
    }),
  ])

  // mapping label UI
  const toLabel = (s: BudgetRequestStatus) => {
    if (s === BudgetRequestStatus.SUBMITTED) return "Menunggu"
    if (s === BudgetRequestStatus.APPROVED) return "Disetujui"
    if (s === BudgetRequestStatus.REJECTED) return "Ditolak"
    if (s === BudgetRequestStatus.CANCELLED) return "Dibatalkan"
    return s
  }

  return NextResponse.json({
    data: rows.map((r) => ({
      id: r.id,
      judul: r.title,
      jumlah: r.amountRequested,
      status: r.status,
      statusLabel: toLabel(r.status),
      tanggal: (r.submittedAt ?? r.createdAt), // UI format sendiri jadi "12 Des 2024"
    })),
    meta: { page, limit, total },
  })
}