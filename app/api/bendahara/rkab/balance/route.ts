import { NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/pages/api/auth/[...nextauth]"
import { prisma } from "@/lib/prisma"
import { CategoryType, Role } from "@prisma/client"

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (session.user.role !== Role.BENDAHARA) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const incomeAll = await prisma.ledgerEntry.aggregate({
    where: { type: CategoryType.INCOME },
    _sum: { amount: true },
  })
  const expenseAll = await prisma.ledgerEntry.aggregate({
    where: { type: CategoryType.EXPENSE },
    _sum: { amount: true },
  })

  const totalIncome = Number(incomeAll._sum.amount ?? 0)
  const totalExpense = Number(expenseAll._sum.amount ?? 0)
  const totalSaldo = totalIncome - totalExpense

  return NextResponse.json({ totalSaldo })
}
