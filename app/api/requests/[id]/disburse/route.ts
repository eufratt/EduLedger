import { NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/pages/api/auth/[...nextauth]"
import { prisma } from "@/lib/prisma"
import { BudgetRequestStatus, CategoryType, Role } from "@prisma/client"

export async function POST(
  _req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id: rawId } = await context.params
  const id = Number(rawId)

  if (!Number.isInteger(id) || id <= 0) {
    return NextResponse.json({ error: "INVALID_ID" }, { status: 400 })
  }

  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  }

  const role = (session.user as any).role as Role
  if (role !== Role.BENDAHARA) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 })
  }

  const bendaharaId = Number((session.user as any).id)

  try {
    const result = await prisma.$transaction(async (tx) => {
      // 1. Get the request and its linked RKAB item
      const request = await tx.budgetRequest.findUnique({
        where: { id },
        include: { rkabItem: true },
      })

      if (!request) {
        throw new Error("REQUEST_NOT_FOUND")
      }

      if (request.status !== BudgetRequestStatus.APPROVED) {
        throw new Error("INVALID_STATUS")
      }

      const rkabItem = request.rkabItem
      if (!rkabItem) {
        throw new Error("RKAB_ITEM_NOT_FOUND")
      }

      // 2. Update BudgetRequest status
      const updatedRequest = await tx.budgetRequest.update({
        where: { id },
        data: {
          status: BudgetRequestStatus.DISBURSED,
          disbursedAt: new Date(),
          disbursedById: bendaharaId,
        },
      })

      // 3. Update RKAB Item used amount
      const updatedRkabItem = await tx.rkabItem.update({
        where: { id: rkabItem.id },
        data: {
          usedAmount: {
            increment: request.amountRequested,
          },
        },
      })

      // 4. Create Ledger Entry (Expense)
      const ledgerEntry = await tx.ledgerEntry.create({
        data: {
          type: CategoryType.EXPENSE,
          amount: request.amountRequested,
          date: new Date(),
          description: `Pencairan: ${request.title}`,
          rkabItemId: rkabItem.id,
          recordedById: bendaharaId,
        },
      })

      return { updatedRequest, updatedRkabItem, ledgerEntry }
    })

    return NextResponse.json({
      message: "Fund disbursed successfully",
      data: result,
    })
  } catch (error: any) {
    console.error("Disbursement error:", error)
    if (error.message === "REQUEST_NOT_FOUND") {
      return NextResponse.json({ error: "Pengajuan tidak ditemukan" }, { status: 404 })
    }
    if (error.message === "INVALID_STATUS") {
      return NextResponse.json({ error: "Pengajuan harus berstatus Disetujui" }, { status: 400 })
    }
    if (error.message === "RKAB_ITEM_NOT_FOUND") {
      return NextResponse.json({ error: "Item RKAS terkait tidak ditemukan" }, { status: 400 })
    }
    return NextResponse.json({ error: "Terjadi kesalahan pada server" }, { status: 500 })
  }
}
