import { NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/pages/api/auth/[...nextauth]"
import { prisma } from "@/lib/prisma"
import { BudgetRequestStatus, Role, NotificationType } from "@prisma/client"
import { z } from "zod"
import { notifyUser, notifyBendahara } from "@/lib/notifications"

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
    if (data.action === "reject") {
      if (!data.note || data.note.trim().length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Alasan penolakan wajib diisi",
          path: ["note"],
        })
      }
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

  const existing = await prisma.budgetRequest.findUnique({
    where: { id },
    select: { id: true, status: true, submittedById: true, title: true },
  })
  if (!existing) return notFound()

  // penting: kepsek cuma boleh mutusin kalau masih SUBMITTED
  if (existing.status !== BudgetRequestStatus.SUBMITTED) {
    return badRequest("Request is not in SUBMITTED status")
  }

  const userId = Number((session.user as any).id)
  const now = new Date()

  const nextStatus =
    parsedBody.data.action === "approve"
      ? BudgetRequestStatus.APPROVED
      : BudgetRequestStatus.REJECTED

  const updated = await prisma.budgetRequest.update({
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


  // Notify requester
  await notifyUser(existing.submittedById, {
    title: updated.status === BudgetRequestStatus.APPROVED ? "Pengajuan Disetujui" : "Pengajuan Ditolak",
    message: `Pengajuan dana "${existing.title}" Anda telah ${updated.status === BudgetRequestStatus.APPROVED ? "disetujui" : "ditolak"}${updated.approvalNote ? `: ${updated.approvalNote}` : ""}`,
    type: updated.status === BudgetRequestStatus.APPROVED ? NotificationType.SUCCESS : NotificationType.ERROR,
    link: `/civitas/dashboard`
  }).catch(err => console.error("Failed to notify requester:", err))

  if (updated.status === BudgetRequestStatus.APPROVED) {
    await notifyBendahara({
      title: "Persetujuan Baru",
      message: `Pengajuan dana "${existing.title}" telah disetujui Kepala Sekolah dan siap dicairkan`,
      type: NotificationType.INFO,
      link: `/bendahara/pencairan/${updated.id}`
    }).catch(err => console.error("Failed to notify bendahara:", err))
  }

  return NextResponse.json({ ok: true, data: updated })
}