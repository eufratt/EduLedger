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
  if (role !== Role.KEPSEK && role !== Role.BENDAHARA) return forbidden()

  const rawParams = await ctx.params
  const parsedParams = ParamsSchema.safeParse(rawParams)
  if (!parsedParams.success) return badRequest("Invalid id")
  const id = parsedParams.data.id

  const report = await prisma.financialReport.findUnique({
    where: { id },
    select: { fileUrl: true },
  })
  if (!report) return notFound()

  return NextResponse.redirect(report.fileUrl)
}