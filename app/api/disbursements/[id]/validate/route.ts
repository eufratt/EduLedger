import { NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/pages/api/auth/[...nextauth]"
import { prisma } from "@/lib/prisma"
import { BudgetRequestStatus, Role } from "@prisma/client"
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

export async function PATCH(_req: Request, ctx: Ctx) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return forbidden()
  if (session.user.role !== Role.BENDAHARA) return forbidden()

  const { id: idStr } = await ctx.params
  const parsed = IdSchema.safeParse(idStr)
  if (!parsed.success) return badRequest("Invalid id")
  const id = parsed.data

  const reqData = await prisma.budgetRequest.findUnique({
    where: { id },
    select: { id: true, status: true, proofs: { select: { id: true } } },
  })
  if (!reqData) return notFound()

  if (reqData.status !== BudgetRequestStatus.DISBURSED) {
    return badRequest("Request is not DISBURSED")
  }

  if (reqData.proofs.length === 0) {
    return badRequest("No proof uploaded yet")
  }

  const updated = await prisma.budgetRequest.update({
    where: { id },
    data: { status: BudgetRequestStatus.COMPLETED },
    select: { id: true, status: true, updatedAt: true },
  })

  return NextResponse.json(updated)
}