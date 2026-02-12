import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireRole } from "@/lib/authz"
import { CreateRequestSchema } from "@/schemas/requests.schema"
import { AllowedStatus } from "@/schemas/requests.schema"

export async function POST(req: Request) {
  try {
    const session = await requireRole(["CIVITAS"])
    const userId = Number((session.user as any).id)

    const parsed = CreateRequestSchema.safeParse(await req.json())
    if (!parsed.success) {
      return NextResponse.json(
        { error: "VALIDATION_ERROR", details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const { title, description, amountRequested, categoryId, neededBy } = parsed.data

    // 1) category harus EXPENSE
    const category = await prisma.category.findUnique({
      where: { id: categoryId },
      select: { id: true, type: true, name: true },
    })
    if (!category) {
      return NextResponse.json({ error: "CATEGORY_NOT_FOUND" }, { status: 404 })
    }
    if (category.type !== "EXPENSE") {
      return NextResponse.json(
        { error: "INVALID_CATEGORY_TYPE", message: "Budget request harus pakai kategori EXPENSE" },
        { status: 400 }
      )
    }

    // 2) neededBy optional: kalau kamu mau ketat, jangan boleh di masa lalu
    const neededByDate = neededBy ? new Date(neededBy) : null
    if (neededByDate && Number.isNaN(neededByDate.getTime())) {
      return NextResponse.json({ error: "neededBy invalid" }, { status: 400 })
    }
    if (neededByDate) {
      const today = new Date()
      // strip jam biar gak ribet
      today.setHours(0, 0, 0, 0)
      const nb = new Date(neededByDate)
      nb.setHours(0, 0, 0, 0)
      if (nb < today) {
        return NextResponse.json(
          { error: "NEEDED_BY_PAST", message: "neededBy tidak boleh tanggal lampau" },
          { status: 400 }
        )
      }
    }

    const data = await prisma.budgetRequest.create({
      data: {
        title,
        description: description?.trim() || null,
        amountRequested,
        neededBy: neededByDate,
        categoryId,
        status: "SUBMITTED",
        submittedById: userId,
        submittedAt: new Date(),
      },
      include: {
        category: { select: { id: true, name: true, type: true } },
        submittedBy: { select: { id: true, name: true, email: true, role: true } },
      },
    })

    return NextResponse.json(data, { status: 201 })
  } catch (e: any) {
    if (e.message === "UNAUTHORIZED") return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    if (e.message === "FORBIDDEN") return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}

export async function GET(req: Request) {
  try {
    const session = await requireRole(["CIVITAS", "BENDAHARA", "KEPSEK"])
    const role = (session.user as any).role as string
    const userId = Number((session.user as any).id)

    const { searchParams } = new URL(req.url)
    const statusRaw = searchParams.get("status")

    const status = statusRaw ? AllowedStatus.safeParse(statusRaw).data : undefined
    if (statusRaw && !status) {
      return NextResponse.json(
        { error: "INVALID_STATUS", allowed: AllowedStatus.options },
        { status: 400 }
      )
    }

    const where: any = {}

    // Civitas hanya boleh lihat request milik sendiri
    if (role === "CIVITAS") {
      where.submittedById = userId
    }

    if (status) where.status = status

    const data = await prisma.budgetRequest.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        category: { select: { id: true, name: true, type: true } },
        submittedBy: { select: { id: true, name: true, email: true, role: true } },
        approvedBy: { select: { id: true, name: true, email: true, role: true } },
        rkabItem: { select: { id: true, rkabId: true, amountAllocated: true, usedAmount: true } },
      },
    })

    return NextResponse.json(data)
  } catch (e: any) {
    if (e.message === "UNAUTHORIZED") return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}
