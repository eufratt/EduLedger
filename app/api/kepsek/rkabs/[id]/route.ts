import { NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/pages/api/auth/[...nextauth]"
import { prisma } from "@/lib/prisma"
import { Role } from "@prisma/client"
import { z } from "zod"

function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
}
function forbidden() {
  return NextResponse.json({ error: "Forbidden" }, { status: 403 })
}
function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 })
}
function notFound() {
  return NextResponse.json({ error: "Not found" }, { status: 404 })
}

const ParamsSchema = z.object({ id: z.coerce.number().int().positive() })
type Ctx = { params: Promise<{ id: string }> }

export async function GET(_req: Request, ctx: Ctx) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return unauthorized()

  const role = (session.user as any).role as Role | undefined
  if (role !== Role.KEPSEK) return forbidden()

  const rawParams = await ctx.params
  const parsedParams = ParamsSchema.safeParse(rawParams)
  if (!parsedParams.success) return badRequest("Invalid id")
  const id = parsedParams.data.id

  const rkab = await prisma.rkab.findUnique({
    where: { id },
    select: {
      id: true,
      code: true,
      fiscalYear: true,
      status: true,
      createdAt: true,
      submittedAt: true,
      approvalNote: true,
      createdBy: { select: { id: true, name: true } },
      items: {
        orderBy: { id: "asc" },
        select: {
          id: true,
          amountAllocated: true,
          note: true,
          budgetRequest: {
            select: {
              id: true,
              title: true,
              description: true,
            },
          },
        },
      },
    },
  })
  if (!rkab) return notFound()

  const totalAnggaran = rkab.items.reduce((a, b) => a + b.amountAllocated, 0)

  return NextResponse.json({
    data: {
      id: rkab.id,
      label: "RKAS",
      title: `RKAS Tahun ${rkab.fiscalYear}/${rkab.fiscalYear + 1}`,
      pengaju: rkab.createdBy.name,
      diajukanAt: rkab.submittedAt ?? rkab.createdAt,
      status: rkab.status,
      description: "Rencana kegiatan dan anggaran sekolah", // kalau mau dinamis: taruh di model Rkab (field description) dulu
      totalAnggaran,
      rincian: rkab.items.map((it) => ({
        id: it.id,
        nama: it.budgetRequest.title,
        amountAllocated: it.amountAllocated,
        note: it.note ?? null,
        requestId: it.budgetRequest.id,
      })),
    },
  })
}