import { NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/pages/api/auth/[...nextauth]"
import { prisma } from "@/lib/prisma"
import { BudgetRequestStatus, Role, RkabStatus } from "@prisma/client"
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

const BodySchema = z.object({
  items: z.array(
    z.object({
      budgetRequestId: z.number().int().positive(),
      amountAllocated: z.number().int().positive(),
      note: z.string().trim().max(200).optional(),
    })
  ).min(1),
})

export async function POST(req: Request, ctx: Ctx) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return forbidden()
  if (session.user.role !== Role.BENDAHARA) return forbidden()

  const { id: idStr } = await ctx.params
  const parsedId = IdSchema.safeParse(idStr)
  if (!parsedId.success) return badRequest("Invalid id")
  const rkabId = parsedId.data

  const json = await req.json().catch(() => null)
  const parsedBody = BodySchema.safeParse(json)
  if (!parsedBody.success) return badRequest("Invalid body")

  const rkab = await prisma.rkab.findUnique({
    where: { id: rkabId },
    select: { id: true, status: true },
  })
  if (!rkab) return notFound()
  if (rkab.status !== RkabStatus.DRAFT) return badRequest("RKAB is not DRAFT")

  // Validasi: request harus APPROVED dan belum punya rkabItem
  const reqIds = parsedBody.data.items.map((x) => x.budgetRequestId)
  const requests = await prisma.budgetRequest.findMany({
    where: { id: { in: reqIds } },
    select: { id: true, status: true, amountRequested: true, rkabItem: { select: { id: true } } },
  })

  const map = new Map(requests.map((r) => [r.id, r]))
  for (const it of parsedBody.data.items) {
    const br = map.get(it.budgetRequestId)
    if (!br) return badRequest(`BudgetRequest ${it.budgetRequestId} not found`)
    if (br.status !== BudgetRequestStatus.APPROVED) return badRequest(`Request ${it.budgetRequestId} not APPROVED`)
    if (br.rkabItem) return badRequest(`Request ${it.budgetRequestId} already in RKAB`)
    // optional: jangan alokasikan lebih kecil dari requested (tergantung aturanmu)
    if (it.amountAllocated < br.amountRequested) {
      return badRequest(`Allocated for ${it.budgetRequestId} below requested amount`)
    }
  }

  const created = await prisma.rkabItem.createMany({
    data: parsedBody.data.items.map((x) => ({
      rkabId,
      budgetRequestId: x.budgetRequestId,
      amountAllocated: x.amountAllocated,
      note: x.note,
    })),
  })

  return NextResponse.json({ created: created.count }, { status: 201 })
}