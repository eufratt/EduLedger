import { NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/pages/api/auth/[...nextauth]"
import { prisma } from "@/lib/prisma"
import { BudgetRequestStatus } from "@prisma/client"

function toLabel(s: BudgetRequestStatus) {
  if (s === BudgetRequestStatus.SUBMITTED) return "Menunggu"
  if (s === BudgetRequestStatus.APPROVED) return "Disetujui"
  if (s === BudgetRequestStatus.REJECTED) return "Ditolak"
  if (s === BudgetRequestStatus.DISBURSED) return "Dicairkan"
  if (s === BudgetRequestStatus.COMPLETED) return "Selesai"
  return s
}

export async function GET(
  _req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id: rawId } = await context.params
  const id = Number(rawId)

  if (!Number.isInteger(id) || id <= 0) {
    return NextResponse.json({ error: "INVALID_ID" }, { status: 400 })
  }

  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 })

  const role = (session.user as any).role as string
  if (role !== "CIVITAS") {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 })
  }

  const userId = Number((session.user as any).id)
  if (!Number.isInteger(userId) || userId <= 0) {
    return NextResponse.json({ error: "INVALID_SESSION_USER" }, { status: 500 })
  }

  const r = await prisma.budgetRequest.findFirst({
    where: { id, submittedById: userId },
    select: {
      id: true,
      title: true,
      description: true,
      amountRequested: true,
      status: true,
      createdAt: true,
      submittedAt: true,
      approvedAt: true,
      approvalNote: true,
      neededBy: true,
    },
  })

  if (!r) {
    return NextResponse.json({ message: "Request not found" }, { status: 404 })
  }

  const createdDate = r.submittedAt ?? r.createdAt

  const timeline: Array<{
    key: string
    title: string
    at: string
    note?: string | null
  }> = [
      { key: "created", title: "Pengajuan Dibuat", at: createdDate.toISOString() },
    ]

  if (r.status === BudgetRequestStatus.APPROVED && r.approvedAt) {
    timeline.push({
      key: "approved",
      title: "Disetujui",
      at: r.approvedAt.toISOString(),
      note: r.approvalNote ?? null,
    })
  }

  if (r.status === BudgetRequestStatus.REJECTED && r.approvedAt) {
    timeline.push({
      key: "rejected",
      title: "Ditolak",
      at: r.approvedAt.toISOString(),
      note: r.approvalNote ?? null,
    })
  }

  return NextResponse.json({
    data: {
      id: r.id,
      judul: r.title,
      jumlah: r.amountRequested,
      status: r.status,
      statusLabel: toLabel(r.status),
      diajukanAt: createdDate.toISOString(),
      deskripsi: r.description ?? "",
      neededBy: r.neededBy ? r.neededBy.toISOString() : null,
      timeline,
    },
  })
}