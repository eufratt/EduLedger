import { NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/pages/api/auth/[...nextauth]"
import { prisma } from "@/lib/prisma"
import { RkabStatus, Role, NotificationType } from "@prisma/client"
import { z } from "zod"
import { notifyKepsek } from "@/lib/notifications"

const CreateRkabItemSchema = z.object({
  budgetRequestId: z.number().optional(),
  name: z.string().trim().min(1).optional(),
  amountAllocated: z.number().min(0),
  note: z.string().optional(),
}).refine(data => data.budgetRequestId || data.name, {
  message: "Pilih kegiatan atau masukkan nama kegiatan manual",
  path: ["name"],
})

const CreateRkabSchema = z.object({
  fiscalYear: z.number().int().min(2000).max(2100),
  items: z.array(CreateRkabItemSchema).min(1),
})

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const user = session.user as any
  if (user.role !== Role.BENDAHARA) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const rkabList = await prisma.rkab.findMany({
    where: { createdById: Number(user.id) },
    include: {
      _count: { select: { items: true } },
    },
    orderBy: { createdAt: "desc" },
  })

  return NextResponse.json({ data: rkabList })
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const user = session.user as any
  if (user.role !== Role.BENDAHARA) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const json = await req.json().catch(() => null)
  const result = CreateRkabSchema.safeParse(json)
  if (!result.success) {
    return NextResponse.json({ error: result.error.issues[0].message }, { status: 400 })
  }

  const { fiscalYear, items } = result.data

  try {
    const rkab = await prisma.$transaction(async (tx) => {
      // 1. Generate code RKAB-YYYY-XXXX
      const countYear = await tx.rkab.count({ where: { fiscalYear } })
      const code = `RKAB-${fiscalYear}-${String(countYear + 1).padStart(4, "0")}`

      // 2. Create RKAB with SUBMITTED status
      const newRkab = await tx.rkab.create({
        data: {
          code,
          fiscalYear,
          status: RkabStatus.SUBMITTED,
          createdById: Number(user.id),
          submittedAt: new Date(),
        }
      })

      // 3. Create RKAB Items
      for (const it of items) {
        const itemData: any = {
          rkab: { connect: { id: newRkab.id } },
          name: it.name || null,
          amountAllocated: it.amountAllocated,
          note: it.note || "",
        }

        if (it.budgetRequestId) {
          itemData.budgetRequest = { connect: { id: it.budgetRequestId } }
        }

        await tx.rkabItem.create({
          data: itemData
        })
      }

      return newRkab
    })


    // Notify Kepsek
    await notifyKepsek({
      title: "RKAS Baru",
      message: `${user.name} mengajukan RKAS Tahun ${rkab.fiscalYear}/${rkab.fiscalYear + 1} untuk ditinjau`,
      type: NotificationType.INFO,
      link: `/kepsek/persetujuan/${rkab.id}?type=rkab`
    }).catch(err => console.error("Failed to notify Kepsek:", err))

    return NextResponse.json({ data: rkab }, { status: 201 })
  } catch (error: any) {
    console.error("RKAS Creation Error Details:", error)
    return NextResponse.json({ error: error.message || "Gagal menyimpan RKAS." }, { status: 500 })
  }
}
