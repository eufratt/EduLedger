import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/pages/api/auth/[...nextauth]"
import { prisma } from "@/lib/prisma"
import { Role } from "@prisma/client"

export async function GET(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await getServerSession(authOptions)
    if (!session?.user || session.user.role !== Role.KEPSEK) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    // Unwrap params for Next.js 15+
    const { id } = await params
    
    if (!id || id === "undefined") {
        return NextResponse.json({ error: "Invalid ID" }, { status: 400 })
    }

    const report = await prisma.financialReport.findUnique({
        where: { id: Number(id) },
        include: { createdBy: { select: { name: true } } }
    })

    if (!report) {
        return NextResponse.json({ error: "Report not found" }, { status: 404 })
    }

    return NextResponse.json(report)
}
