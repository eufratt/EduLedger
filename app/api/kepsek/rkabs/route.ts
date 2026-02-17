import { NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/pages/api/auth/[...nextauth]"
import { prisma } from "@/lib/prisma"
import { RkabStatus, Role } from "@prisma/client"
import { z } from "zod"

function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
}
function forbidden() {
  return NextResponse.json({ error: "Forbidden" }, { status: 403 })
}

const QuerySchema = z.object({
  status: z.enum(["submitted", "all"]).default("submitted"),
  page: z.coerce.number().int().min(1).default(1),
  take: z.coerce.number().int().min(1).max(50).default(10),
})

export async function GET(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return unauthorized()

  const role = (session.user as any).role as Role | undefined
  if (role !== Role.KEPSEK) return forbidden()

  const url = new URL(req.url)
  const parsed = QuerySchema.safeParse({
    status: url.searchParams.get("status"),
    page: url.searchParams.get("page"),
    take: url.searchParams.get("take"),
  })
  const { status, page, take } = parsed.success
    ? parsed.data
    : { status: "submitted" as const, page: 1, take: 10 }

  const skip = (page - 1) * take
  const where = status === "submitted" ? { status: RkabStatus.SUBMITTED } : {}

  const [items, total, submittedCount] = await Promise.all([
    prisma.rkab.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take,
      select: {
        id: true,
        code: true,
        fiscalYear: true,
        status: true,
        submittedAt: true,
        createdAt: true,
        createdBy: { select: { id: true, name: true } },
        items: { select: { amountAllocated: true } },
      },
    }),
    prisma.rkab.count({ where }),
    prisma.rkab.count({ where: { status: RkabStatus.SUBMITTED } }),
  ])

  return NextResponse.json({
    counts: { rkabsSubmitted: submittedCount },
    page,
    take,
    total,
    items: items.map((x) => ({
      id: x.id,
      title: `RKAS Tahun ${x.fiscalYear}/${x.fiscalYear + 1}`,
      pengaju: x.createdBy.name,
      totalAnggaran: x.items.reduce((a, b) => a + b.amountAllocated, 0),
      status: x.status,
      statusLabel: x.status === RkabStatus.SUBMITTED ? "Menunggu" : x.status,
      diajukanAt: x.submittedAt ?? x.createdAt,
    })),
  })
}