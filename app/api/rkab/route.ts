import { NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/pages/api/auth/[...nextauth]"
import { prisma } from "@/lib/prisma"
import { Role, RkabStatus } from "@prisma/client"
import { z } from "zod"

function forbidden() {
  return NextResponse.json({ error: "Forbidden" }, { status: 403 })
}
function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 })
}

const CreateSchema = z.object({
  fiscalYear: z.number().int().min(2000).max(2100),
})

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return forbidden()
  if (session.user.role !== Role.BENDAHARA) return forbidden()

  const createdById = Number(session.user.id)
  if (!Number.isInteger(createdById) || createdById <= 0) {
    return NextResponse.json({ error: "Invalid session user id" }, { status: 401 })
  }

  const json = await req.json().catch(() => null)
  const parsed = CreateSchema.safeParse(json)
  if (!parsed.success) return badRequest("Invalid body")

  const countYear = await prisma.rkab.count({ where: { fiscalYear: parsed.data.fiscalYear } })
  const code = `RKAB-${parsed.data.fiscalYear}-${String(countYear + 1).padStart(4, "0")}`

  const rkab = await prisma.rkab.create({
    data: {
      code,
      fiscalYear: parsed.data.fiscalYear,
      status: RkabStatus.DRAFT,
      createdById,
    },
    select: { id: true, code: true, fiscalYear: true, status: true, createdAt: true },
  })

  return NextResponse.json(rkab, { status: 201 })
}