import { NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/pages/api/auth/[...nextauth]"
import { prisma } from "@/lib/prisma"
import { Role } from "@prisma/client"
import { z } from "zod"

function forbidden() {
  return NextResponse.json({ error: "Forbidden" }, { status: 403 })
}
function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 })
}
function notFound() {
  return NextResponse.json({ error: "Not found" }, { status: 404 })
}

const IdSchema = z.coerce.number().int().positive()
type Ctx = { params: Promise<{ id: string }> }

export async function GET(_req: Request, ctx: Ctx) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return forbidden()
  if (session.user.role !== Role.BENDAHARA && session.user.role !== Role.KEPSEK) return forbidden()

  const { id: idStr } = await ctx.params
  const parsed = IdSchema.safeParse(idStr)
  if (!parsed.success) return badRequest("Invalid id")
  const id = parsed.data

  const rkab = await prisma.rkab.findUnique({
    where: { id },
    include: {
      items: {
        include: {
          budgetRequest: {
            select: { id: true, title: true, amountRequested: true, submittedBy: { select: { name: true } } },
          },
        },
        orderBy: { id: "asc" },
      },
      createdBy: { select: { id: true, name: true } },
      approvedBy: { select: { id: true, name: true } },
    },
  })
  if (!rkab) return notFound()

  const totalAllocated = rkab.items.reduce((a, x) => a + x.amountAllocated, 0)

  return NextResponse.json({
    id: rkab.id,
    code: rkab.code,
    fiscalYear: rkab.fiscalYear,
    status: rkab.status,
    createdBy: rkab.createdBy,
    submittedAt: rkab.submittedAt,
    approvedAt: rkab.approvedAt,
    approvalNote: rkab.approvalNote,
    totalAllocated,
    items: rkab.items.map((it) => ({
      id: it.id,
      amountAllocated: it.amountAllocated,
      usedAmount: it.usedAmount,
      note: it.note,
      request: {
        id: it.budgetRequest.id,
        title: it.budgetRequest.title,
        pemohon: it.budgetRequest.submittedBy.name,
        amountRequested: it.budgetRequest.amountRequested,
      },
    })),
  })
}