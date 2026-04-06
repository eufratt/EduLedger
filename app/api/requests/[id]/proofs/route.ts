import { NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/pages/api/auth/[...nextauth]"
import { prisma } from "@/lib/prisma"
import { BudgetRequestStatus, NotificationType } from "@prisma/client"
import { uploadToCloudinary, deleteFromCloudinary } from "@/lib/cloudinary"
import { notifyBendahara } from "@/lib/notifications"

export const runtime = "nodejs"

const MAX_SIZE = 5 * 1024 * 1024 // 5MB
const ALLOWED_MIME_TYPES = new Set(["image/jpeg", "image/png", "application/pdf"])

export async function POST(req: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id: rawId } = await context.params
    const id = Number(rawId)
    
    if (!Number.isInteger(id) || id <= 0) {
      return NextResponse.json({ error: "ID_TIDAK_VALID", message: "ID pengajuan tidak valid." }, { status: 400 })
    }

    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "UNAUTHORIZED", message: "Sesi berakhir, silakan login kembali." }, { status: 401 })
    }

    const user = session.user as any
    if (user.role !== "CIVITAS") {
      return NextResponse.json({ error: "FORBIDDEN", message: "Akses ditolak." }, { status: 403 })
    }
    const userId = Number(user.id)

    // Check ownership and status
    const request = await prisma.budgetRequest.findFirst({
      where: { id, submittedById: userId },
      select: { id: true, status: true, title: true, submittedBy: { select: { name: true } } },
    })

    if (!request) {
      return NextResponse.json({ error: "NOT_FOUND", message: "Pengajuan tidak ditemukan." }, { status: 404 })
    }

    if (request.status !== BudgetRequestStatus.DISBURSED && request.status !== BudgetRequestStatus.COMPLETED) {
      return NextResponse.json({ error: "INVALID_STATUS", message: "Bukti hanya bisa diunggah untuk pengajuan yang sudah dicairkan." }, { status: 400 })
    }

    const formData = await req.formData()
    const file = formData.get("file")

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: "FILE_REQUIRED", message: "File bukti transaksi wajib dilampirkan." }, { status: 400 })
    }

    if (!ALLOWED_MIME_TYPES.has(file.type)) {
      return NextResponse.json({ error: "INVALID_FILE_TYPE", message: "Format file tidak didukung. Gunakan JPG, PNG, atau PDF." }, { status: 400 })
    }

    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: "FILE_TOO_LARGE", message: "Ukuran file terlalu besar. Maksimal 5MB." }, { status: 400 })
    }

    // Upload to Cloudinary
    const buffer = Buffer.from(await file.arrayBuffer())
    const uploadResult = await uploadToCloudinary(buffer, 'eduledger/proofs')

    if (!uploadResult.secure_url) {
      throw new Error('Cloudinary upload returned no secure URL')
    }

    const proof = await prisma.requestProof.create({
      data: {
        requestId: id,
        fileUrl: uploadResult.secure_url,
        publicId: uploadResult.public_id, // Save publicId for deletion
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

    // Notify Bendahara
    await notifyBendahara({
      title: "Upload Bukti Baru",
      message: `${request.submittedBy.name} telah mengunggah bukti pengeluaran untuk ${request.title}`,
      type: NotificationType.INFO,
      link: `/bendahara/pencairan/${id}`
    }).catch(e => console.error("Failed to notify bendahara", e))

    return NextResponse.json({ 
      success: true, 
      message: "Bukti transaksi berhasil diunggah.",
      data: proof 
    }, { status: 201 })

  } catch (error) {
    console.error("[PROOFS_POST_ERROR]", error)
    const message = error instanceof Error ? error.message : "Terjadi kesalahan internal saat memproses unggahan."
    return NextResponse.json({ 
      error: "INTERNAL_SERVER_ERROR", 
      message
    }, { status: 500 })
  }
}

export async function DELETE(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: rawId } = await context.params
    const id = Number(rawId)
    
    // Parse proofId from query
    const { searchParams } = new URL(req.url)
    const proofId = Number(searchParams.get("proofId"))

    if (!Number.isInteger(id) || !Number.isInteger(proofId)) {
      return NextResponse.json({ error: "INVALID_ID", message: "ID tidak valid." }, { status: 400 })
    }

    const session = await getServerSession(authOptions)
    if (!session?.user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    
    const user = session.user as any
    if (user.role !== "CIVITAS") return NextResponse.json({ message: "Forbidden" }, { status: 403 })
    const userId = Number(user.id)

    // Check ownership and status
    const request = await prisma.budgetRequest.findFirst({
      where: { id, submittedById: userId },
      select: { id: true, status: true },
    })

    if (!request) return NextResponse.json({ message: "Not found" }, { status: 404 })

    // Only allow deletion if status is DISBURSED (not COMPLETED/validated)
    if (request.status !== BudgetRequestStatus.DISBURSED) {
      return NextResponse.json({ 
        error: "LOCKED", 
        message: "Bukti tidak dapat dihapus karena pengajuan sudah divalidasi/selesai." 
      }, { status: 400 })
    }

    // Find the proof
    const proof = await prisma.requestProof.findFirst({
      where: { id: proofId, requestId: id },
    })

    if (!proof) return NextResponse.json({ message: "Proof not found" }, { status: 404 })

    // 1. Delete from Cloudinary if publicId exists
    if (proof.publicId) {
      await deleteFromCloudinary(proof.publicId)
    }

    // 2. Delete from Database
    await prisma.requestProof.delete({
      where: { id: proofId },
    })

    return NextResponse.json({ success: true, message: "Bukti berhasil dihapus." })

  } catch (error) {
    console.error("[PROOFS_DELETE_ERROR]", error)
    return NextResponse.json({ error: "INTERNAL_SERVER_ERROR" }, { status: 500 })
  }
}

export async function GET(
  _req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: rawId } = await context.params
    const id = Number(rawId)
    
    if (!Number.isInteger(id) || id <= 0) {
      return NextResponse.json({ error: "ID_TIDAK_VALID" }, { status: 400 })
    }

    const session = await getServerSession(authOptions)
    if (!session?.user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    
    const user = session.user as any
    const isAdmin = user.role === "BENDAHARA" || user.role === "KEPSEK"
    const userId = Number(user.id)

    const request = await prisma.budgetRequest.findFirst({
      where: { 
        id, 
        // If not admin, must be the owner
        ...(isAdmin ? {} : { submittedById: userId }) 
      },
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

    if (!request) return NextResponse.json({ message: "Not found" }, { status: 404 })

    return NextResponse.json({
      data: {
        request: {
          id: request.id,
          judul: request.title,
          jumlah: request.amountRequested,
          status: request.status,
          statusLabel: formatStatusLabel(request.status),
        },
        proofs: request.proofs,
      },
    })
  } catch (error) {
    console.error("[PROOFS_GET_ERROR]", error)
    return NextResponse.json({ error: "INTERNAL_SERVER_ERROR" }, { status: 500 })
  }
}

function formatStatusLabel(status: BudgetRequestStatus) {
  switch (status) {
    case BudgetRequestStatus.DISBURSED: return "Dicairkan"
    case BudgetRequestStatus.COMPLETED: return "Selesai"
    case BudgetRequestStatus.APPROVED: return "Disetujui"
    case BudgetRequestStatus.REJECTED: return "Ditolak"
    case BudgetRequestStatus.SUBMITTED: return "Menunggu"
    default: return status
  }
}