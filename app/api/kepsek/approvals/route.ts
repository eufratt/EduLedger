import { NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/pages/api/auth/[...nextauth]"
import { prisma } from "@/lib/prisma"
import { BudgetRequestStatus, RkabStatus, Role } from "@prisma/client"
import { z } from "zod"

function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
}
function forbidden() {
  return NextResponse.json({ error: "Forbidden" }, { status: 403 })
}

const QuerySchema = z.object({
  tab: z.enum(["requests", "rkabs"]).default("requests"),
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
    tab: url.searchParams.get("tab"),
    page: url.searchParams.get("page"),
    take: url.searchParams.get("take"),
  })
  const { tab, page, take } = parsed.success
    ? parsed.data
    : { tab: "requests" as const, page: 1, take: 10 }

  const skip = (page - 1) * take

  const [requestCount, rkabCount] = await Promise.all([
    prisma.budgetRequest.count({ where: { status: BudgetRequestStatus.SUBMITTED } }),
    prisma.rkab.count({ where: { status: RkabStatus.SUBMITTED } }),
  ])

  if (tab === "requests") {
    const [items, total] = await Promise.all([
      prisma.budgetRequest.findMany({
        where: { status: BudgetRequestStatus.SUBMITTED },
        orderBy: { createdAt: "desc" },
        skip,
        take,
        select: {
          id: true,
          title: true,
          amountRequested: true,
          createdAt: true,
          submittedBy: { select: { id: true, name: true } },
        },
      }),
      prisma.budgetRequest.count({ where: { status: BudgetRequestStatus.SUBMITTED } }),
    ])

    return NextResponse.json({
      counts: { requests: requestCount, rkabs: rkabCount },
      tab,
      page,
      take,
      total,
      items: items.map((r) => ({
        id: r.id,
        title: r.title,
        pengaju: r.submittedBy.name,
        amountRequested: r.amountRequested,
        statusLabel: "Menunggu",
        createdAt: r.createdAt,
      })),
    })
  }

  // tab === "rkabs"
  const [items, total] = await Promise.all([
    prisma.rkab.findMany({
      where: { status: RkabStatus.SUBMITTED },
      orderBy: { createdAt: "desc" },
      skip,
      take,
      select: {
        id: true,
        code: true,
        fiscalYear: true,
        createdAt: true,
        createdBy: { select: { id: true, name: true } },
      },
    }),
    prisma.rkab.count({ where: { status: RkabStatus.SUBMITTED } }),
  ])

  return NextResponse.json({
    counts: { requests: requestCount, rkabs: rkabCount },
    tab,
    page,
    take,
    total,
    items: items.map((x) => ({
      id: x.id,
      title: `RKAS ${x.fiscalYear}`,
      code: x.code,
      createdBy: x.createdBy.name,
      statusLabel: "Menunggu",
      createdAt: x.createdAt,
    })),
  })
}