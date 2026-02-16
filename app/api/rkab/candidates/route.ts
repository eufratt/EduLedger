import { NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/pages/api/auth/[...nextauth]"
import { prisma } from "@/lib/prisma"
import { BudgetRequestStatus, Role } from "@prisma/client"

function forbidden() {
  return NextResponse.json({ error: "Forbidden" }, { status: 403 })
}

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user) return forbidden()
  if (session.user.role !== Role.BENDAHARA) return forbidden()

  const items = await prisma.budgetRequest.findMany({
    where: {
      status: BudgetRequestStatus.APPROVED,
      rkabItem: null, // belum masuk RKAB
    },
    orderBy: { approvedAt: "desc" },
    take: 50,
    select: {
      id: true,
      title: true,
      amountRequested: true,
      approvedAt: true,
      submittedBy: { select: { id: true, name: true } },
    },
  })

  return NextResponse.json({
    items: items.map((x) => ({
      id: x.id,
      title: x.title,
      amountRequested: x.amountRequested,
      pemohon: x.submittedBy.name,
      approvedAt: x.approvedAt,
    })),
  })
}