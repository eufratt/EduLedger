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
  requestsTake: z.coerce.number().int().min(1).max(20).default(5),
  rkabsTake: z.coerce.number().int().min(1).max(20).default(3),
  fiscalYear: z.coerce.number().int().min(2000).max(2100).optional(),
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
    fiscalYear: url.searchParams.get("fiscalYear"),
  })
  const { requestsTake, rkabsTake, fiscalYear } = parsed.success
    ? parsed.data
    : { requestsTake: 5, rkabsTake: 3, fiscalYear: undefined }

  const now = new Date()
  const startOfMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0))
  const startOfNextMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1, 0, 0, 0))

  const year = fiscalYear ?? now.getUTCFullYear()

  const [
    waitingApproval,
    approvedThisMonth,
    pendingRequests,
    pendingRkabs,
    // RKAS metrics
    rkabAgg,
    rkabReviewedCard,
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
        submittedBy: { select: { name: true } },
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
        createdBy: { select: { name: true } },
      },
    }),

    // Total Anggaran & Realisasi dari RKAS APPROVED tahun ini
    prisma.rkabItem.aggregate({
      where: {
        rkab: { status: RkabStatus.APPROVED, fiscalYear: year },
      },
      _sum: { amountAllocated: true, usedAmount: true },
    }),

    // Untuk kartu "RKAS Tahun 2025 — Review" (ambil yang paling baru SUBMITTED)
    prisma.rkab.findFirst({
      where: { status: RkabStatus.SUBMITTED },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        code: true,
        fiscalYear: true,
        createdAt: true,
        createdBy: { select: { name: true } },
        items: { select: { amountAllocated: true } },
      },
    }),
  ])

  const totalAnggaran = Number(rkabAgg._sum.amountAllocated ?? 0)
  const totalUsed = Number(rkabAgg._sum.usedAmount ?? 0)
  const realisasiPercent =
    totalAnggaran > 0 ? Math.round((totalUsed / totalAnggaran) * 100) : 0

  const rkabReviewTotal =
    rkabReviewedCard?.items?.reduce((acc, it) => acc + (it.amountAllocated ?? 0), 0) ?? 0

  return NextResponse.json({
    user: {
      id: (session.user as any).id,
      name: (session.user as any).name,
      role,
    },
    cards: {
      menungguPersetujuan: waitingApproval,
      disetujuiBulanIni: approvedThisMonth,
      totalAnggaran,
      realisasiPercent,
      fiscalYear: year,
    },
    persetujuanTertunda: {
      requests: pendingRequests.map((r) => ({
        id: r.id,
        title: r.title,
        amountRequested: r.amountRequested,
        submittedBy: r.submittedBy?.name ?? null,
        createdAt: r.createdAt.toISOString(),
      })),
      rkabs: pendingRkabs.map((x) => ({
        id: x.id,
        code: x.code,
        fiscalYear: x.fiscalYear,
        createdBy: x.createdBy?.name ?? null,
        createdAt: x.createdAt.toISOString(),
      })),
    },
    // kartu rkas review seperti screenshot (opsional)
    highlight: rkabReviewedCard
      ? {
          id: rkabReviewedCard.id,
          title: `RKAS Tahun ${rkabReviewedCard.fiscalYear}`,
          createdBy: rkabReviewedCard.createdBy?.name ?? null,
          total: rkabReviewTotal,
          status: "REVIEW",
        }
      : null,
  })
}