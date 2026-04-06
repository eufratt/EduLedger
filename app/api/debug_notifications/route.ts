import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET() {
  try {
    const notifs = await prisma.notification.findMany({
      include: { user: { select: { id: true, email: true, role: true } } }
    })
    return NextResponse.json({ success: true, count: notifs.length, notifs })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message, stack: error.stack })
  }
}
