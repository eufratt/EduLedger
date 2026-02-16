import { NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/pages/api/auth/[...nextauth]"
import { prisma } from "@/lib/prisma"
import { Role, BudgetRequestStatus, CategoryType } from "@prisma/client"
import { z } from "zod"

function forbidden() {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
}
function badRequest(message: string) {
    return NextResponse.json({ error: message }, { status: 400 })
}
function notFound() {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
}

const IdSchema = z.coerce.number().int().positive()

type Ctx = { params: Promise<{ id: string }> }

export async function GET(_req: Request, ctx: Ctx) {
    const session = await getServerSession(authOptions)
    if (!session?.user) return forbidden()
    if (session.user.role !== Role.BENDAHARA) return forbidden()

    const { id: idStr } = await ctx.params
    const parsed = IdSchema.safeParse(idStr)
    if (!parsed.success) return badRequest("Invalid id")
    const id = parsed.data

    const data = await prisma.budgetRequest.findUnique({
        where: { id },
        select: {
            id: true,
            title: true,
            description: true,
            amountRequested: true,
            status: true,
            submittedAt: true,
            approvedAt: true,
            disbursedAt: true,
            submittedBy: { select: { id: true, name: true } },
            proofs: {
                select: {
                    id: true,
                    fileUrl: true,
                    fileName: true,
                    mimeType: true,
                    size: true,
                    uploadedAt: true,
                },
                orderBy: { uploadedAt: "desc" },
                take: 5,
            },
        },
    })
    if (!data) return notFound()

    return NextResponse.json({
        id: data.id,
        title: data.title,
        description: data.description,
        amount: data.amountRequested,
        status: data.status,
        pemohon: data.submittedBy.name,
        submittedAt: data.submittedAt,
        approvedAt: data.approvedAt,
        disbursedAt: data.disbursedAt,
        proofs: data.proofs,
        hasProof: data.proofs.length > 0,
    })
}

export async function PATCH(_req: Request, ctx: Ctx) {
    const session = await getServerSession(authOptions)
    if (!session?.user) return forbidden()
    if (session.user.role !== Role.BENDAHARA) return forbidden()

    const recordedById = Number(session.user.id)
    if (!Number.isInteger(recordedById) || recordedById <= 0) {
        return NextResponse.json({ error: "Invalid session user id" }, { status: 401 })
    }

    const { id: idStr } = await ctx.params
    const parsed = IdSchema.safeParse(idStr)
    if (!parsed.success) return badRequest("Invalid id")
    const id = parsed.data

    const now = new Date()

    const result = await prisma.$transaction(async (tx) => {
        const req = await tx.budgetRequest.findUnique({
            where: { id },
            select: {
                id: true,
                title: true,
                amountRequested: true,
                status: true,
                rkabItem: { select: { id: true, usedAmount: true, amountAllocated: true } },
            },
        })
        if (!req) return { kind: "not_found" as const }
        if (req.status !== BudgetRequestStatus.APPROVED)
            return { kind: "invalid_status" as const }

        // kalau takut double-click: blok kalau sudah pernah dicairkan
        // (ini redundant karena status dicek, tapi aman)

        await tx.budgetRequest.update({
            where: { id },
            data: {
                status: BudgetRequestStatus.DISBURSED,
                disbursedAt: now,
                disbursedById: recordedById,
            },
        })

        // Ledger EXPENSE supaya saldo turun
        await tx.ledgerEntry.create({
            data: {
                type: CategoryType.EXPENSE,
                amount: req.amountRequested,
                date: now,
                description: `Pencairan: ${req.title}`,
                rkabItemId: req.rkabItem?.id ?? null,
                recordedById,
            },
        })

        if (req.rkabItem?.id) {
            const newUsed = req.rkabItem.usedAmount + req.amountRequested
            if (newUsed > req.rkabItem.amountAllocated) return { kind: "over_budget" as const }

            await tx.rkabItem.update({
                where: { id: req.rkabItem.id },
                data: { usedAmount: newUsed },
            })
        }

        return { kind: "ok" as const }
    })

    if (result.kind === "not_found") return notFound()
    if (result.kind === "invalid_status")
        return NextResponse.json({ error: "Request not APPROVED" }, { status: 400 })
    if (result.kind === "over_budget")
        return NextResponse.json({ error: "Over budget" }, { status: 400 })

    return NextResponse.json({ success: true })
}