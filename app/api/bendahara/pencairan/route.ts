import { NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/pages/api/auth/[...nextauth]"
import { prisma } from "@/lib/prisma"
import { BudgetRequestStatus, Role } from "@prisma/client"

export async function GET(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if ((session.user as any).role !== Role.BENDAHARA) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { searchParams } = new URL(req.url)
  const tab = searchParams.get("tab") || "ready" // "ready" (APPROVED) or "done" (DISBURSED)

  const status = tab === "ready" ? BudgetRequestStatus.APPROVED : BudgetRequestStatus.DISBURSED

  try {
    const [items, counts] = await Promise.all([
      prisma.budgetRequest.findMany({
        where: { status },
        orderBy: { updatedAt: "desc" },
        include: {
          submittedBy: { select: { name: true } },
        },
      }),
      prisma.budgetRequest.groupBy({
        by: ["status"],
        where: {
          status: { in: [BudgetRequestStatus.APPROVED, BudgetRequestStatus.DISBURSED] },
        },
        _count: true,
      }),
    ])

    const readyCount = counts.find(c => c.status === BudgetRequestStatus.APPROVED)?._count ?? 0
    const doneCount = counts.find(c => c.status === BudgetRequestStatus.DISBURSED)?._count ?? 0

    return NextResponse.json({
      items: items.map(i => ({
        id: i.id,
        title: i.title,
        amount: i.amountRequested,
        requester: i.submittedBy.name,
        date: i.disbursedAt || i.approvedAt || i.createdAt,
        status: i.status,
      })),
      counts: {
        ready: readyCount,
        done: doneCount,
      },
    })
  } catch (error) {
    console.error("Fetch pencairan error:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
