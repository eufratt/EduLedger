import { NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { requireRole } from "@/lib/authz"

const CivitasPatchSchema = z.object({
    title: z.string().trim().min(3).max(120).optional(),
    description: z.string().trim().max(2000).optional().nullable(),
    amountRequested: z.coerce.number().int().positive().optional(),
    categoryId: z.coerce.number().int().positive().optional(),
    neededBy: z.string().datetime().optional().nullable(),
    // civitas TIDAK boleh ubah status lewat endpoint ini
})

const ApprovalSchema = z.object({
    status: z.enum(["APPROVED", "REJECTED"]),
    approvalNote: z.string().trim().max(1000).optional().nullable(),
})


export async function PATCH(
    req: Request,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const { id: idRaw } = await context.params
        const id = Number(idRaw)
        if (!Number.isInteger(id) || id <= 0) {
            return NextResponse.json({ error: "INVALID_ID", got: idRaw }, { status: 400 })
        }

        // siapa pun yang boleh akses PATCH ini (akan dibatasi di bawah)
        const session = await requireRole(["CIVITAS", "BENDAHARA", "KEPSEK"])
        const role = (session.user as any).role as string
        const userId = Number((session.user as any).id)

        const existing = await prisma.budgetRequest.findUnique({
            where: { id },
            select: {
                id: true,
                status: true,
                submittedById: true,
            },
        })
        if (!existing) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 })

        const body = await req.json().catch(() => null)

        // ===== CIVITAS: edit konten request =====
        if (role === "CIVITAS") {
            if (existing.submittedById !== userId) {
                return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 })
            }

            // batas edit: cuma saat DRAFT/SUBMITTED
            if (!["DRAFT", "SUBMITTED"].includes(existing.status)) {
                return NextResponse.json(
                    { error: "INVALID_STATE", message: "Request tidak bisa diedit setelah diproses" },
                    { status: 400 }
                )
            }

            const parsed = CivitasPatchSchema.safeParse(body)
            if (!parsed.success) {
                return NextResponse.json({ error: "VALIDATION_ERROR", details: parsed.error.flatten() }, { status: 400 })
            }

            // kalau categoryId diubah, tetap harus EXPENSE
            if (parsed.data.categoryId) {
                const cat = await prisma.category.findUnique({
                    where: { id: parsed.data.categoryId },
                    select: { type: true },
                })
                if (!cat) return NextResponse.json({ error: "CATEGORY_NOT_FOUND" }, { status: 404 })
                if (cat.type !== "EXPENSE") {
                    return NextResponse.json(
                        { error: "INVALID_CATEGORY_TYPE", message: "Budget request harus pakai kategori EXPENSE" },
                        { status: 400 }
                    )
                }
            }

            const neededByDate =
                parsed.data.neededBy === undefined
                    ? undefined
                    : parsed.data.neededBy === null
                        ? null
                        : new Date(parsed.data.neededBy)

            if (neededByDate instanceof Date && Number.isNaN(neededByDate.getTime())) {
                return NextResponse.json({ error: "neededBy invalid" }, { status: 400 })
            }

            // optional: block tanggal lampau
            if (neededByDate) {
                const today = new Date()
                today.setHours(0, 0, 0, 0)
                const nb = new Date(neededByDate)
                nb.setHours(0, 0, 0, 0)
                if (nb < today) {
                    return NextResponse.json(
                        { error: "NEEDED_BY_PAST", message: "neededBy tidak boleh tanggal lampau" },
                        { status: 400 }
                    )
                }
            }

            const updated = await prisma.budgetRequest.update({
                where: { id },
                data: {
                    title: parsed.data.title,
                    description: parsed.data.description === undefined ? undefined : (parsed.data.description?.trim() || null),
                    amountRequested: parsed.data.amountRequested,
                    categoryId: parsed.data.categoryId,
                    neededBy: neededByDate,
                    // status tidak diubah oleh civitas
                },
                include: {
                    category: { select: { id: true, name: true, type: true } },
                    submittedBy: { select: { id: true, name: true, email: true, role: true } },
                    approvedBy: { select: { id: true, name: true, email: true, role: true } },
                    rkabItem: { select: { id: true, rkabId: true, amountAllocated: true, usedAmount: true } },
                },
            })

            return NextResponse.json(updated)
        }

        // ===== BENDAHARA/KEPSEK: approve/reject =====
        // untuk role lain, kita anggap PATCH ini khusus approval status
        const parsedApproval = ApprovalSchema.safeParse(body)
        if (!parsedApproval.success) {
            return NextResponse.json({ error: "VALIDATION_ERROR", details: parsedApproval.error.flatten() }, { status: 400 })
        }

        // hanya bisa approve/reject kalau status masih SUBMITTED
        if (existing.status !== "SUBMITTED") {
            return NextResponse.json(
                { error: "INVALID_STATE", message: "Hanya request SUBMITTED yang bisa diproses" },
                { status: 400 }
            )
        }

        const updated = await prisma.budgetRequest.update({
            where: { id },
            data: {
                status: parsedApproval.data.status,
                approvedById: userId,
                approvedAt: new Date(),
                approvalNote:
                    parsedApproval.data.approvalNote === undefined
                        ? undefined
                        : (parsedApproval.data.approvalNote?.trim() || null),
            },
            include: {
                category: { select: { id: true, name: true, type: true } },
                submittedBy: { select: { id: true, name: true, email: true, role: true } },
                approvedBy: { select: { id: true, name: true, email: true, role: true } },
                rkabItem: { select: { id: true, rkabId: true, amountAllocated: true, usedAmount: true } },
            },
        })

        return NextResponse.json(updated)
    } catch (e: any) {
        if (e.message === "UNAUTHORIZED") return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        if (e.message === "FORBIDDEN") return NextResponse.json({ error: "Forbidden" }, { status: 403 })
        return NextResponse.json({ error: "Server error" }, { status: 500 })
    }
}

export async function DELETE(
    _req: Request,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const { id: idRaw } = await context.params
        const id = Number(idRaw)
        if (!Number.isInteger(id) || id <= 0) {
            return NextResponse.json({ error: "INVALID_ID", got: idRaw }, { status: 400 })
        }

        const session = await requireRole(["CIVITAS", "BENDAHARA", "KEPSEK"])
        const role = (session.user as any).role as string
        const userId = Number((session.user as any).id)

        const existing = await prisma.budgetRequest.findUnique({
            where: { id },
            select: { id: true, status: true, submittedById: true },
        })
        if (!existing) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 })

        // aturan delete
        if (role === "CIVITAS") {
            if (existing.submittedById !== userId) return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 })
            if (existing.status !== "DRAFT") {
                return NextResponse.json(
                    { error: "INVALID_STATE", message: "Hanya request DRAFT yang bisa dihapus" },
                    { status: 400 }
                )
            }
        } else {
            // bendahara/kepsek: opsional, kamu bisa larang delete total
            // default: jangan boleh hapus yang sudah diproses
            if (["APPROVED", "REJECTED"].includes(existing.status)) {
                return NextResponse.json(
                    { error: "INVALID_STATE", message: "Request yang sudah diproses tidak boleh dihapus" },
                    { status: 400 }
                )
            }
        }

        await prisma.budgetRequest.delete({ where: { id } })
        return NextResponse.json({ ok: true })
    } catch (e: any) {
        if (e.message === "UNAUTHORIZED") return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        if (e.message === "FORBIDDEN") return NextResponse.json({ error: "Forbidden" }, { status: 403 })
        return NextResponse.json({ error: "Server error" }, { status: 500 })
    }
}
