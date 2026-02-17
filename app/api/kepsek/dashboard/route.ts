import { NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/pages/api/auth/[...nextauth]"
import { prisma } from "@/lib/prisma"
import { BudgetRequestStatus, RkabStatus, Role } from "@prisma/client"
import { z } from "zod"

function forbidden() {
  return NextResponse.json({ error: "Forbidden" }, { status: 403 })
}
function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
}

const QuerySchema = z.object({
  // berapa item ditampilkan di section "Persetujuan Tertunda"
  requestsTake: z.coerce.number().int().min(1).max(20).default(5),
  rkabsTake: z.coerce.number().int().min(1).max(20).default(3),
})

export async function GET(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return unauthorized()

  const role = (session.user as any).role as Role | undefined
  if (role !== Role.KEPSEK) return forbidden()

  const url = new URL(req.url)
  const parsed = QuerySchema.safeParse({
    requestsTake: url.searchParams.get("requestsTake"),
    rkabsTake: url.searchParams.get("rkabsTake"),
  })
  const { requestsTake, rkabsTake } = parsed.success
    ? parsed.data
    : { requestsTake: 5, rkabsTake: 3 }

  // range bulan ini (UTC) biar konsisten
  const now = new Date()
  const startOfMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0))
  const startOfNextMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1, 0, 0, 0))

  const [
    waitingApproval,
    approvedThisMonth,
    pendingRequests,
    pendingRkabs,
  ] = await Promise.all([
    prisma.budgetRequest.count({
      where: { status: BudgetRequestStatus.SUBMITTED },
    }),
    prisma.budgetRequest.count({
      where: {
        status: BudgetRequestStatus.APPROVED,
        approvedAt: { gte: startOfMonth, lt: startOfNextMonth },
      },
    }),
    prisma.budgetRequest.findMany({
      where: { status: BudgetRequestStatus.SUBMITTED },
      orderBy: { createdAt: "desc" },
      take: requestsTake,
      select: {
        id: true,
        title: true,
        amountRequested: true,
        createdAt: true,
        submittedAt: true,
        submittedBy: { select: { id: true, name: true } },
      },
    }),
    prisma.rkab.findMany({
      where: { status: RkabStatus.SUBMITTED },
      orderBy: { createdAt: "desc" },
      take: rkabsTake,
      select: {
        id: true,
        code: true,
        fiscalYear: true,
        createdAt: true,
        submittedAt: true,
        createdBy: { select: { id: true, name: true } },
      },
    }),
  ])

  return NextResponse.json({
    user: {
      id: (session.user as any).id,
      name: (session.user as any).name,
      role,
    },
    cards: {
      menungguPersetujuan: waitingApproval,
      disetujuiBulanIni: approvedThisMonth,
    },
    persetujuanTertunda: {
      requests: pendingRequests.map((r) => ({
        id: r.id,
        title: r.title,
        amountRequested: r.amountRequested,
        submittedBy: r.submittedBy?.name ?? null,
        createdAt: r.createdAt,
      })),
      rkabs: pendingRkabs.map((x) => ({
        id: x.id,
        code: x.code,
        fiscalYear: x.fiscalYear,
        createdBy: x.createdBy?.name ?? null,
        createdAt: x.createdAt,
      })),
    },
  })
}