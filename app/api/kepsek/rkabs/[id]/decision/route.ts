import { NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/pages/api/auth/[...nextauth]"
import { prisma } from "@/lib/prisma"
import { RkabStatus, Role } from "@prisma/client"
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

const BodySchema = z
  .object({
    action: z.enum(["approve", "reject"]),
    note: z.string().trim().max(500).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.action === "reject" && (!data.note || data.note.trim().length === 0)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Alasan penolakan wajib diisi",
        path: ["note"],
      })
    }
  })

type Ctx = { params: Promise<{ id: string }> }

export async function PATCH(req: Request, ctx: Ctx) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return unauthorized()

  const role = (session.user as any).role as Role | undefined
  if (role !== Role.KEPSEK) return forbidden()

  const rawParams = await ctx.params
  const parsedParams = ParamsSchema.safeParse(rawParams)
  if (!parsedParams.success) return badRequest("Invalid id")
  const id = parsedParams.data.id

  const bodyJson = await req.json().catch(() => null)
  const parsedBody = BodySchema.safeParse(bodyJson)
  if (!parsedBody.success) return badRequest("Invalid body")

  const existing = await prisma.rkab.findUnique({
    where: { id },
    select: { id: true, status: true },
  })
  if (!existing) return notFound()

  if (existing.status !== RkabStatus.SUBMITTED) {
    return badRequest("RKAS is not in SUBMITTED status")
  }

  const userId = (session.user as any).id as number
  const now = new Date()

  const nextStatus =
    parsedBody.data.action === "approve" ? RkabStatus.APPROVED : RkabStatus.REJECTED

  const updated = await prisma.rkab.update({
    where: { id },
    data: {
      status: nextStatus,
      approvedById: userId,
      approvedAt: now,
      approvalNote: parsedBody.data.note ?? null,
    },
    select: {
      id: true,
      status: true,
      approvedAt: true,
      approvalNote: true,
    },
  })

  return NextResponse.json({ ok: true, data: updated })
}