import { NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/pages/api/auth/[...nextauth]"
import { prisma } from "@/lib/prisma"
import { RkabStatus, Role } from "@prisma/client"
import { z } from "zod"

const CreateRkabItemSchema = z.object({
  budgetRequestId: z.number().optional(),
  name: z.string().trim().min(1).optional(),
  amountAllocated: z.number().min(0),
  note: z.string().optional(),
}).refine(data => data.budgetRequestId || data.name, {
  message: "Pilih kegiatan atau masukkan nama kegiatan manual",
  path: ["name"],
})

const UpdateRkabSchema = z.object({
  fiscalYear: z.number().int().min(2000).max(2100).optional(),
  items: z.array(CreateRkabItemSchema).min(1).optional(),
})

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: idStr } = await params
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const user = session.user as any
  if (user.role !== Role.BENDAHARA) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const id = Number(idStr)
  if (isNaN(id)) return NextResponse.json({ error: "Invalid ID" }, { status: 400 })

  const rkab = await prisma.rkab.findUnique({
    where: { id, createdById: Number(user.id) },
    include: { items: true },
  })

  if (!rkab) return NextResponse.json({ error: "Not Found" }, { status: 404 })

  return NextResponse.json({ data: rkab })
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: idStr } = await params
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const user = session.user as any
  if (user.role !== Role.BENDAHARA) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const id = Number(idStr)
  if (isNaN(id)) return NextResponse.json({ error: "Invalid ID" }, { status: 400 })

  const json = await req.json().catch(() => null)
  const result = UpdateRkabSchema.safeParse(json)
  if (!result.success) {
    return NextResponse.json({ error: result.error.issues[0].message }, { status: 400 })
  }

  const { fiscalYear, items } = result.data

  try {
    const updated = await prisma.$transaction(async (tx) => {
      // 1. Check existence and status
      const existing = await tx.rkab.findUnique({
        where: { id, createdById: Number(user.id) },
      })
      if (!existing) throw new Error("RKAS tidak ditemukan")
      if (existing.status !== RkabStatus.SUBMITTED && existing.status !== RkabStatus.DRAFT) {
        throw new Error("Hanya RKAS dengan status DRAFT atau SUBMITTED yang dapat diubah")
      }

      // 2. Update RKAB fields
      const rkab = await tx.rkab.update({
        where: { id },
        data: {
          fiscalYear: fiscalYear ?? existing.fiscalYear,
          updatedAt: new Date(),
        },
      })

      // 3. Sync Items if provided
      if (items) {
        // Delete all existing items first (simplest way to sync)
        await tx.rkabItem.deleteMany({ where: { rkabId: id } })

        // Re-create items
        for (const it of items) {
          const itemData: any = {
            rkab: { connect: { id } },
            name: it.name || null,
            amountAllocated: it.amountAllocated,
            note: it.note || "",
          }
          if (it.budgetRequestId) {
            itemData.budgetRequest = { connect: { id: it.budgetRequestId } }
          }
          await tx.rkabItem.create({ data: itemData })
        }
      }

      return rkab
    })

    return NextResponse.json({ data: updated })
  } catch (error: any) {
    console.error("RKAS Update Error:", error)
    return NextResponse.json({ error: error.message || "Gagal memperbarui RKAS" }, { status: 500 })
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: idStr } = await params
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const user = session.user as any
  if (user.role !== Role.BENDAHARA) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const id = Number(idStr)
  if (isNaN(id)) return NextResponse.json({ error: "Invalid ID" }, { status: 400 })

  try {
    await prisma.$transaction(async (tx) => {
      const existing = await tx.rkab.findUnique({
        where: { id, createdById: Number(user.id) },
      })
      if (!existing) throw new Error("RKAS tidak ditemukan")
      if (existing.status !== RkabStatus.SUBMITTED && existing.status !== RkabStatus.DRAFT) {
        throw new Error("Hanya RKAS dengan status DRAFT atau SUBMITTED yang dapat dihapus")
      }

      // Delete items first
      await tx.rkabItem.deleteMany({ where: { rkabId: id } })

      // Delete RKAB
      await tx.rkab.delete({ where: { id } })
    })

    return NextResponse.json({ message: "RKAS berhasil dihapus" })
  } catch (error: any) {
    console.error("RKAS Delete Error:", error)
    return NextResponse.json({ error: error.message || "Gagal menghapus RKAS" }, { status: 500 })
  }
}
