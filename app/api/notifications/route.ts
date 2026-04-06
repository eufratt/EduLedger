import { NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/pages/api/auth/[...nextauth]"
import { prisma } from "@/lib/prisma"

export async function GET(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const userId = Number((session.user as any).id)
  const { searchParams } = new URL(req.url)
  const filter = searchParams.get("filter") || "all" // all | unread
  const page = Math.max(1, Number(searchParams.get("page") || 1))
  const limit = Math.min(50, Math.max(1, Number(searchParams.get("limit") || 10)))

  const where: any = { userId }
  if (filter === "unread") {
    where.isRead = false
  }

  const [total, notifications, unreadCount] = await Promise.all([
    prisma.notification.count({ where: { userId } }),
    prisma.notification.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.notification.count({ where: { userId, isRead: false } }),
  ])

  return NextResponse.json({
    data: notifications,
    meta: {
      total,
      page,
      limit,
      unreadCount,
    }
  })
}

// Mark all as read
export async function PATCH(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const userId = Number((session.user as any).id)

  await prisma.notification.updateMany({
    where: { userId, isRead: false },
    data: { isRead: true },
  })

  return NextResponse.json({ message: "Semua notifikasi ditandai sebagai dibaca" })
}
