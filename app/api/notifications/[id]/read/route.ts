import { NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/pages/api/auth/[...nextauth]"
import { prisma } from "@/lib/prisma"

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: idStr } = await params
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const id = Number(idStr)
  const userId = Number((session.user as any).id)

  const updated = await prisma.notification.update({
    where: { id, userId },
    data: { isRead: true },
  })

  return NextResponse.json({ data: updated })
}
