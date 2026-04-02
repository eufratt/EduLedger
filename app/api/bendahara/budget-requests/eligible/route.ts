import { NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/pages/api/auth/[...nextauth]"
import { prisma } from "@/lib/prisma"
import { BudgetRequestStatus, Role } from "@prisma/client"

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (session.user.role !== Role.BENDAHARA) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const requests = await prisma.budgetRequest.findMany({
    where: {
      status: BudgetRequestStatus.APPROVED,
      rkabItem: { is: null },
    },
    select: {
      id: true,
      title: true,
      amountRequested: true,
    },
    orderBy: { createdAt: "desc" },
  })

  return NextResponse.json({ items: requests })
}
