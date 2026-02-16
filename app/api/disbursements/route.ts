import { NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/pages/api/auth/[...nextauth]"
import { prisma } from "@/lib/prisma"
import { Role, BudgetRequestStatus } from "@prisma/client"
import { z } from "zod"

function forbidden() {
  return NextResponse.json({ error: "Forbidden" }, { status: 403 })
}
function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 })
}

const QuerySchema = z.object({
  tab: z.enum(["ready", "done"]).optional(),
})

export async function GET(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return forbidden()
  if (session.user.role !== Role.BENDAHARA) return forbidden()

  const url = new URL(req.url)
  const parsed = QuerySchema.safeParse({ tab: url.searchParams.get("tab") ?? undefined })
  if (!parsed.success) return badRequest("Invalid query")

  const tab = parsed.data.tab ?? "ready"
  const status = tab === "ready" ? BudgetRequestStatus.APPROVED : BudgetRequestStatus.DISBURSED

  const [readyCount, doneCount, items] = await Promise.all([
    prisma.budgetRequest.count({ where: { status: BudgetRequestStatus.APPROVED } }),
    prisma.budgetRequest.count({ where: { status: BudgetRequestStatus.DISBURSED } }),
    prisma.budgetRequest.findMany({
      where: { status },
      orderBy:
        tab === "ready"
          ? { approvedAt: "desc" }
          : { disbursedAt: "desc" },
      take: 50,
      select: {
        id: true,
        title: true,
        amountRequested: true,
        status: true,
        createdAt: true,
        submittedAt: true,
        approvedAt: true,
        disbursedAt: true,
        submittedBy: { select: { id: true, name: true } },
      },
    }),
  ])

  return NextResponse.json({
    tab,
    counts: { ready: readyCount, done: doneCount },
    items: items.map((x) => ({
      id: x.id,
      title: x.title,
      pemohon: x.submittedBy.name,
      amount: x.amountRequested,
      // UI kamu nampilin tanggal; paling masuk akal pakai approvedAt kalau ada, else submittedAt/createdAt
      date: x.approvedAt ?? x.submittedAt ?? x.createdAt,
      badge: x.status === BudgetRequestStatus.APPROVED ? "Disetujui" : "Dicairkan",
    })),
  })
}