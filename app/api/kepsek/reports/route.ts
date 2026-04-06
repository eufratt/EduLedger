import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/pages/api/auth/[...nextauth]"
import { prisma } from "@/lib/prisma"
import { Role, ReportType, CategoryType } from "@prisma/client"
import { z } from "zod"

const CreateReportSchema = z.object({
    type: z.nativeEnum(ReportType),
    period: z.string().regex(/^\d{4}-\d{2}$/), // YYYY-MM
})

function monthRangeUTC(period: string) {
    const [y, m] = period.split("-").map((v) => Number(v))
    const start = new Date(Date.UTC(y, m - 1, 1, 0, 0, 0))
    const end = new Date(Date.UTC(y, m, 1, 0, 0, 0))
    return { start, end }
}

export async function GET(req: Request) {
    const session = await getServerSession(authOptions)
    if (!session?.user || session.user.role !== Role.KEPSEK) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { searchParams } = new URL(req.url)
    const period = searchParams.get("period")
    const type = searchParams.get("type") as ReportType | null

    const reports = await prisma.financialReport.findMany({
        where: {
            ...(period ? { period } : {}),
            ...(type ? { type } : {}),
        },
        orderBy: { createdAt: "desc" },
        include: {
            createdBy: { select: { name: true } }
        }
    })

    return NextResponse.json(reports)
}

export async function POST(req: Request) {
    const session = await getServerSession(authOptions)
    if (!session?.user || session.user.role !== Role.KEPSEK) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const body = await req.json().catch(() => ({}))
    const parsed = CreateReportSchema.safeParse(body)
    if (!parsed.success) {
        return NextResponse.json({ error: "Invalid body" }, { status: 400 })
    }

    const { type, period } = parsed.data
    const { start, end } = monthRangeUTC(period)

    // Generate summary based on type
    let summary: any = {}
    let items: any[] = []

    if (type === ReportType.INCOME) {
        const data = await prisma.ledgerEntry.findMany({
            where: {
                type: CategoryType.INCOME,
                date: { gte: start, lt: end }
            },
            include: { fundingSource: true }
        })
        
        // Group by funding source
        const groups: Record<string, number> = {}
        data.forEach(x => {
            const name = x.fundingSource?.name || "Lainnya"
            groups[name] = (groups[name] || 0) + x.amount
        })
        
        summary = {
            total: data.reduce((acc, x) => acc + x.amount, 0),
            breakdown: Object.entries(groups).map(([name, amount]) => ({ name, amount }))
        }
    } else if (type === ReportType.EXPENSE) {
        const data = await prisma.ledgerEntry.findMany({
            where: {
                type: CategoryType.EXPENSE,
                date: { gte: start, lt: end }
            },
            include: { rkabItem: { include: { budgetRequest: true } } }
        })
        
        const groups: Record<string, number> = {}
        data.forEach(x => {
            const name = x.rkabItem?.budgetRequest?.title || "Lainnya"
            groups[name] = (groups[name] || 0) + x.amount
        })
        
        summary = {
            total: data.reduce((acc, x) => acc + x.amount, 0),
            breakdown: Object.entries(groups).map(([name, amount]) => ({ name, amount }))
        }
    } else if (type === ReportType.BALANCE) {
        const [income, expense] = await Promise.all([
            prisma.ledgerEntry.aggregate({
                where: { type: CategoryType.INCOME, date: { gte: start, lt: end } },
                _sum: { amount: true }
            }),
            prisma.ledgerEntry.aggregate({
                where: { type: CategoryType.EXPENSE, date: { gte: start, lt: end } },
                _sum: { amount: true }
            })
        ])
        
        const totalIncome = income._sum.amount || 0
        const totalExpense = expense._sum.amount || 0
        
        summary = {
            income: totalIncome,
            expense: totalExpense,
            balance: totalIncome - totalExpense
        }
    }

    const reportTitle = `${type === ReportType.INCOME ? "Laporan Penerimaan Dana" : type === ReportType.EXPENSE ? "Laporan Pengeluaran Dana" : "Laporan Saldo Kas"}`
    
    // Create or update report snapshot
    const report = await prisma.financialReport.upsert({
        where: {
            type_period: { type, period }
        },
        update: {
            summary,
            createdById: Number(session.user.id),
        },
        create: {
            type,
            period,
            title: reportTitle,
            summary,
            fileUrl: "", // Placeholder if not uploading to Cloudinary
            fileName: `${type}_${period}.pdf`,
            size: 0,
            createdById: Number(session.user.id),
        }
    })

    return NextResponse.json(report)
}
