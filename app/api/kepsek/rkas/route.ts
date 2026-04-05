import { NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/pages/api/auth/[...nextauth]"
import { prisma } from "@/lib/prisma"
import { RkabStatus, Role } from "@prisma/client"

function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
}

function forbidden() {
  return NextResponse.json({ error: "Forbidden" }, { status: 403 })
}

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user) return unauthorized()

  const role = (session.user as any).role as Role | undefined
  if (role !== Role.KEPSEK) return forbidden()

  const now = new Date()
  const currentYear = now.getUTCFullYear()

  // Fetch all RKAS for history
  const allRkabs = await prisma.rkab.findMany({
    orderBy: { fiscalYear: "desc" },
    include: {
      items: {
        select: {
          amountAllocated: true,
          usedAmount: true,
        },
      },
      createdBy: { select: { name: true } },
    },
  })

  // Active metrics: from APPROVED RKAS in current year
  const activeRkabs = allRkabs.filter(
    (r) => r.status === RkabStatus.APPROVED && r.fiscalYear === currentYear
  )

  const activeAnggaran = activeRkabs.reduce(
    (sum, r) => sum + r.items.reduce((s, it) => s + it.amountAllocated, 0),
    0
  )
  const activeRealisasi = activeRkabs.reduce(
    (sum, r) => sum + r.items.reduce((s, it) => s + it.usedAmount, 0),
    0
  )

  const realisasiPercent =
    activeAnggaran > 0 ? Math.round((activeRealisasi / activeAnggaran) * 100) : 0

  const items = allRkabs.map((r) => {
    const totalAmount = r.items.reduce((s, it) => s + it.amountAllocated, 0)
    const usedAmount = r.items.reduce((s, it) => s + it.usedAmount, 0)
    const percent = totalAmount > 0 ? Math.round((usedAmount / totalAmount) * 100) : 0

    // Mapping Selesai: if year < currentYear and status is APPROVED
    let displayStatus = r.status as string
    if (r.status === RkabStatus.APPROVED && r.fiscalYear < currentYear) {
      displayStatus = "SELESAI"
    }

    return {
      id: r.id,
      code: r.code,
      fiscalYear: r.fiscalYear,
      status: displayStatus,
      totalAmount,
      usedAmount,
      realisasiPercent: percent,
      createdAt: r.createdAt,
      createdBy: r.createdBy.name,
    }
  })

  return NextResponse.json({
    metrics: {
      activeAnggaran,
      activeRealisasi,
      realisasiPercent,
    },
    items,
  })
}
