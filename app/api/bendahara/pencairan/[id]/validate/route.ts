import { NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/pages/api/auth/[...nextauth]"
import { prisma } from "@/lib/prisma"
import { BudgetRequestStatus, Role } from "@prisma/client"

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

  try {
    const request = await prisma.budgetRequest.findUnique({
      where: { id },
      include: { proofs: { take: 1 } },
    })

    if (!request) {
      return NextResponse.json({ error: "Pengajuan tidak ditemukan" }, { status: 404 })
    }

    if (request.status !== BudgetRequestStatus.DISBURSED) {
      return NextResponse.json({ error: "Pengajuan belum dalam tahap validasi (harus Dicairkan)" }, { status: 400 })
    }

    if (request.proofs.length === 0) {
      return NextResponse.json({ error: "Bukti pengeluaran belum diupload oleh pemohon" }, { status: 400 })
    }

    const updated = await prisma.budgetRequest.update({
      where: { id },
      data: {
        status: BudgetRequestStatus.COMPLETED,
      },
    })

    return NextResponse.json({
      message: "Pencairan berhasil divalidasi",
      data: updated,
    })
  } catch (error) {
    console.error("Validation error:", error)
    return NextResponse.json({ error: "Terjadi kesalahan pada server" }, { status: 500 })
  }
}
