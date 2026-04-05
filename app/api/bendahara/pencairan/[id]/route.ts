import { NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/pages/api/auth/[...nextauth]"
import { prisma } from "@/lib/prisma"
import { Role } from "@prisma/client"

export async function GET(
  _req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id: rawId } = await context.params
  const id = Number(rawId)

  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if ((session.user as any).role !== Role.BENDAHARA) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  try {
    const request = await prisma.budgetRequest.findUnique({
      where: { id },
      include: {
        submittedBy: { select: { name: true } },
        rkabItem: true,
        proofs: {
          orderBy: { uploadedAt: "desc" },
          select: { id: true, fileUrl: true, fileName: true, size: true, mimeType: true, uploadedAt: true },
        },
      },
    })

    if (!request) {
      return NextResponse.json({ error: "Request not found" }, { status: 404 })
    }

    return NextResponse.json({
      data: {
        id: request.id,
        title: request.title,
        description: request.description,
        amountRequested: request.amountRequested,
        requester: request.submittedBy.name,
        status: request.status,
        diajukanAt: request.createdAt.toISOString(),
        disbursedAt: request.disbursedAt?.toISOString(),
        rkabItemName: request.rkabItem?.name,
        proofs: request.proofs,
      },
    })
  } catch (error) {
    console.error("Fetch detail pencairan error:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
