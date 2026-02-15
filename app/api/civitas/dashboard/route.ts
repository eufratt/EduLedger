// app/api/civitas/dashboard/route.ts
import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/pages/api/auth/[...nextauth]" // sesuaikan lokasi authOptions kamu
import { prisma } from "@/lib/prisma" // sesuaikan lokasi prisma client kamu
import { BudgetRequestStatus, Role } from "@prisma/client"

function formatMoneyIDR(amount: number) {
  // UI kamu bisa format sendiri. Ini opsional.
  return amount
}

export async function GET(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const userId = Number((session.user as any).id)
  const role = (session.user as any).role as Role | string

  // kalau dashboard ini khusus CIVITAS, kunci di sini
  if (role !== "CIVITAS") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { searchParams } = new URL(req.url)
  const limitActivities = Number(searchParams.get("limitActivities") ?? "5")

  // Definisi sesuai schema kamu:
  // - "Pengajuan Aktif" = SUBMITTED (lagi menunggu diproses)
  // - "Disetujui" = APPROVED
  // - "Total Dana" = total amountRequested yang APPROVED (karena belum ada tahap pencairan di schema)
  const [pengajuanAktif, disetujui, totalDanaAgg, aktivitasTerbaru] =
    await prisma.$transaction([
      prisma.budgetRequest.count({
        where: { submittedById: userId, status: BudgetRequestStatus.SUBMITTED },
      }),
      prisma.budgetRequest.count({
        where: { submittedById: userId, status: BudgetRequestStatus.APPROVED },
      }),
      prisma.budgetRequest.aggregate({
        where: { submittedById: userId, status: BudgetRequestStatus.APPROVED },
        _sum: { amountRequested: true },
      }),
      prisma.budgetRequest.findMany({
        where: { submittedById: userId },
        orderBy: { createdAt: "desc" },
        take: Number.isFinite(limitActivities) ? limitActivities : 5,
        select: {
          id: true,
          title: true,
          amountRequested: true,
          status: true,
          createdAt: true,
        },
      }),
    ])

  const totalDana = totalDanaAgg._sum.amountRequested ?? 0

  // Notifikasi: schema kamu belum punya model Notification
  const unreadNotif = 0

  return NextResponse.json({
    user: {
      id: userId,
      name: (session.user as any).name ?? "User",
    },
    summary: {
      pengajuanAktif,
      disetujui,
      totalDana: formatMoneyIDR(totalDana),
      unreadNotif,
    },
    aktivitasTerbaru: aktivitasTerbaru.map((x) => ({
      id: x.id,
      judul: x.title,
      jumlah: x.amountRequested,
      status: x.status, // SUBMITTED/APPROVED/REJECTED/...
      createdAt: x.createdAt,
    })),
  })
}