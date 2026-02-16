// app/api/funding-sources/route.ts
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

const CreateFundingSourceSchema = z.object({
  name: z.string().trim().min(2).max(80),
  agency: z.string().trim().min(2).max(80).optional(),
})

export async function GET(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return forbidden()
  if (session.user.role !== Role.BENDAHARA) return forbidden()

  const url = new URL(req.url)
  const q = (url.searchParams.get("q") ?? "").trim()

  const items = await prisma.fundingSource.findMany({
    where: q
      ? { name: { contains: q, mode: "insensitive" } }
      : undefined,
    orderBy: { name: "asc" },
    take: q ? 20 : 200, // biar ga kebanyakan
    select: { id: true, name: true, agency: true, createdAt: true },
  })

  return NextResponse.json({ items })
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return forbidden()
  if (session.user.role !== Role.BENDAHARA) return forbidden()

  const json = await req.json().catch(() => null)
  const parsed = CreateFundingSourceSchema.safeParse(json)
  if (!parsed.success) return badRequest("Invalid body")

  const name = parsed.data.name.replace(/\s+/g, " ")
  const agency = parsed.data.agency?.replace(/\s+/g, " ")

  const exists = await prisma.fundingSource.findFirst({
    where: { name: { equals: name, mode: "insensitive" } },
    select: { id: true, name: true, agency: true, createdAt: true },
  })
  if (exists) return NextResponse.json(exists, { status: 200 })

  const created = await prisma.fundingSource.create({
    data: { name, agency },
    select: { id: true, name: true, agency: true, createdAt: true },
  })

  return NextResponse.json(created, { status: 201 })
}