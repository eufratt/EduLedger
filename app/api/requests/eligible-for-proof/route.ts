import { NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/pages/api/auth/[...nextauth]"
import { prisma } from "@/lib/prisma"
import { BudgetRequestStatus } from "@prisma/client"

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  if ((session.user as any).role !== "CIVITAS") {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 })
  }

  const userId = Number((session.user as any).id)

  const rows = await prisma.budgetRequest.findMany({
    where: {
      submittedById: userId,
      status: BudgetRequestStatus.APPROVED, // ✅ eligible
    },
    orderBy: { approvedAt: "desc" },
    select: {
      id: true,
      title: true,
      amountRequested: true,
      status: true,
      approvedAt: true,
      proofs: { select: { id: true }, take: 1 },
    },
  })

  return NextResponse.json({
    data: rows.map((r) => ({
      id: r.id,
      judul: r.title,
      jumlah: r.amountRequested,
      status: r.status,
      eligibleAt: r.approvedAt,
      hasProof: r.proofs.length > 0,
    })),
  })
}