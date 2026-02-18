import { NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/pages/api/auth/[...nextauth]"
import { prisma } from "@/lib/prisma"
import { BudgetRequestStatus } from "@prisma/client"
import { randomUUID } from "crypto"
import path from "path"
import fs from "fs/promises"

export const runtime = "nodejs"

const MAX_SIZE = 5 * 1024 * 1024
const ALLOWED = new Set(["image/jpeg", "image/png", "application/pdf"])

export async function POST(req: Request, context: { params: Promise<{ id: string }> }) {
  const { id: rawId } = await context.params
  const id = Number(rawId)
  if (!Number.isInteger(id) || id <= 0) {
    return NextResponse.json({ error: "INVALID_ID" }, { status: 400 })
  }

  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  if ((session.user as any).role !== "CIVITAS") {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 })
  }
  const userId = Number((session.user as any).id)

  const r = await prisma.budgetRequest.findFirst({
    where: { id, submittedById: userId },
    select: { id: true, status: true },
  })
  if (!r) return NextResponse.json({ message: "Not found" }, { status: 404 })

  if (r.status !== BudgetRequestStatus.DISBURSED && r.status !== BudgetRequestStatus.COMPLETED) {
  return NextResponse.json({ message: "Request belum dicairkan" }, { status: 400 })
}

  const form = await req.formData()
  const file = form.get("file")

  if (!(file instanceof File)) return NextResponse.json({ error: "FILE_REQUIRED" }, { status: 400 })
  if (!ALLOWED.has(file.type)) return NextResponse.json({ error: "INVALID_FILE_TYPE" }, { status: 400 })
  if (file.size > MAX_SIZE) return NextResponse.json({ error: "FILE_TOO_LARGE" }, { status: 400 })

  const ext = file.type === "image/jpeg" ? "jpg" : file.type === "image/png" ? "png" : "pdf"
  const storedName = `${randomUUID()}.${ext}`
  const uploadDir = path.join(process.cwd(), "public", "uploads", "proofs")
  await fs.mkdir(uploadDir, { recursive: true })

  const bytes = Buffer.from(await file.arrayBuffer())
  await fs.writeFile(path.join(uploadDir, storedName), bytes)

  const fileUrl = `/uploads/proofs/${storedName}`

  try {
    const created = await prisma.$transaction(async (tx) => {
      const proof = await tx.requestProof.create({
        data: {
          requestId: id,
          fileUrl,
          fileName: file.name,
          mimeType: file.type,
          size: file.size,
        },
        select: {
          id: true,
          requestId: true,
          fileUrl: true,
          fileName: true,
          mimeType: true,
          size: true,
          uploadedAt: true,
        },
      })

      if (r.status === BudgetRequestStatus.DISBURSED) {
        await tx.budgetRequest.update({
          where: { id },
          data: { status: BudgetRequestStatus.COMPLETED },
        })
      }

      return proof
    })

    return NextResponse.json({ data: created }, { status: 201 })
  } catch (e) {
    await fs.unlink(path.join(uploadDir, storedName)).catch(() => { })
    throw e
  }
}

export async function GET(
  _req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id: rawId } = await context.params
  const id = Number(rawId)
  if (!Number.isInteger(id) || id <= 0) {
    return NextResponse.json({ error: "INVALID_ID" }, { status: 400 })
  }

  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  if ((session.user as any).role !== "CIVITAS") {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 })
  }
  const userId = Number((session.user as any).id)

  const r = await prisma.budgetRequest.findFirst({
    where: { id, submittedById: userId },
    select: {
      id: true,
      title: true,
      amountRequested: true,
      status: true,
      proofs: {
        orderBy: { uploadedAt: "desc" },
        select: { id: true, fileUrl: true, fileName: true, size: true, mimeType: true, uploadedAt: true },
      },
    },
  })
  if (!r) return NextResponse.json({ message: "Not found" }, { status: 404 })

  return NextResponse.json({
    data: {
      request: {
        id: r.id,
        judul: r.title,
        jumlah: r.amountRequested,
        status: r.status,
        statusLabel:
          r.status === BudgetRequestStatus.DISBURSED
            ? "Dicairkan"
            : r.status === BudgetRequestStatus.COMPLETED
              ? "Selesai"
              : r.status,
      },
      proofs: r.proofs,
    },
  })
}