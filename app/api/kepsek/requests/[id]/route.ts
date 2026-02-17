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

  const data = await prisma.budgetRequest.findUnique({
    where: { id },
    select: {
      id: true,
      title: true,
      description: true,
      amountRequested: true,
      createdAt: true,
      submittedAt: true,
      status: true,
      submittedBy: { select: { id: true, name: true } },
    },
  })
  if (!data) return notFound()

  return NextResponse.json({
    data: {
      id: data.id,
      title: data.title,
      pengaju: data.submittedBy.name,
      amountRequested: data.amountRequested,
      // UI kamu pakai "Diajukan: ..." -> paling bener submittedAt, fallback createdAt
      diajukanAt: data.submittedAt ?? data.createdAt,
      description: data.description ?? "",
      status: data.status,
    },
  })
}