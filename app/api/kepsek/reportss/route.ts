import { NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/pages/api/auth/[...nextauth]"
import { prisma } from "@/lib/prisma"
import { ReportType, Role } from "@prisma/client"
import { z } from "zod"

function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
}
function forbidden() {
  return NextResponse.json({ error: "Forbidden" }, { status: 403 })
}

const QuerySchema = z.object({
  period: z.string().regex(/^\d{4}-\d{2}$/).optional(), // "2024-12"
  type: z.nativeEnum(ReportType).optional(),
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
    period: url.searchParams.get("period") ?? undefined,
    type: url.searchParams.get("type") ?? undefined,
    page: url.searchParams.get("page"),
    take: url.searchParams.get("take"),
  })
  const { period, type, page, take } = parsed.success
    ? parsed.data
    : { page: 1, take: 10 }

  const where: any = {}
  if (period) where.period = period
  if (type) where.type = type

  const skip = (page - 1) * take

  const [items, total] = await Promise.all([
    prisma.financialReport.findMany({
      where,
      orderBy: [{ period: "desc" }, { createdAt: "desc" }],
      skip,
      take,
      select: {
        id: true,
        type: true,
        period: true,
        title: true,
        createdAt: true,
        size: true,
      },
    }),
    prisma.financialReport.count({ where }),
  ])

  return NextResponse.json({
    page,
    take,
    total,
    items: items.map((r) => ({
      id: r.id,
      title: r.title,
      type: r.type,
      period: r.period,
      dibuatAt: r.createdAt,
      size: r.size, // bytes
    })),
  })
}