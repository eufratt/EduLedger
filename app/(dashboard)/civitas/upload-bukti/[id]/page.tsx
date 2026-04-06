"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { ArrowLeft, Upload, AlertTriangle, CheckCircle2, Trash2, Loader2 } from "lucide-react"
import { toast } from "sonner"

import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogTitle,
} from "@/components/ui/dialog"
import { VisuallyHidden } from "@radix-ui/react-visually-hidden"


type DetailRes = {
    data: {
        id: number
        judul: string
        jumlah: number
        status: string
        statusLabel: string
        diajukanAt: string
        disetujuiAt: string | null
    }
}
type Proof = {
    id: number
    fileUrl: string
    fileName: string
    size: number
    mimeType: string
    uploadedAt: string
}

type ProofsRes = {
    data: {
        request: {
            id: number
            judul: string
            jumlah: number
            status: string
            statusLabel: string
        }
        proofs: Proof[]
    }
}


function formatIDR(n: number) {
    return "Rp " + n.toLocaleString("id-ID")
}

function formatDateID(dateIso: string) {
    const d = new Date(dateIso)
    return d.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })
}

async function readApiError(res: Response) {
    const j = await res.json().catch(() => null)
    return j?.error ?? j?.message ?? `HTTP ${res.status}`
}

function isAllowedType(file: File) {
    const okMime = ["image/jpeg", "image/png", "application/pdf"]
    if (okMime.includes(file.type)) return true
    // fallback kalau browser kadang kosongin mime
    const name = file.name.toLowerCase()
    return name.endsWith(".jpg") || name.endsWith(".jpeg") || name.endsWith(".png") || name.endsWith(".pdf")
}



export default function UploadBuktiDetailPage() {
    const router = useRouter()
    const params = useParams<{ id: string }>()
    const id = Number(params?.id)

    const [detail, setDetail] = useState<DetailRes["data"] | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    const inputRef = useRef<HTMLInputElement | null>(null)
    const [file, setFile] = useState<File | null>(null)
    const [dragOver, setDragOver] = useState(false)
    const [uploading, setUploading] = useState(false)
    const [openSuccess, setOpenSuccess] = useState(false)
    const [proofs, setProofs] = useState<Proof[]>([])
    const [deletingId, setDeletingId] = useState<number | null>(null)
    const [isInvalid, setIsInvalid] = useState(false)



    const fileLabel = useMemo(() => {
        if (!file) return null
        const sizeMb = (file.size / (1024 * 1024)).toFixed(2)
        return `${file.name} • ${sizeMb} MB`
    }, [file])

    useEffect(() => {
        let cancelled = false

        async function load() {
            if (!Number.isFinite(id) || id <= 0) {
                setError("ID tidak valid.")
                setLoading(false)
                return
            }

            setLoading(true)
            setError(null)

            try {
                const res = await fetch(`/api/requests/${id}`, { credentials: "include" })

                if (res.status === 401) {
                    router.replace("/login")
                    return
                }
                if (res.status === 403) {
                    throw new Error("Akses ditolak (bukan CIVITAS).")
                }
                if (!res.ok) throw new Error(await readApiError(res))

                const json = (await res.json()) as DetailRes
                if (!cancelled) setDetail(json.data)

                const res2 = await fetch(`/api/requests/${id}/proofs`, { credentials: "include" })
                if (!res2.ok) throw new Error(await readApiError(res2))

                const json2 = (await res2.json()) as ProofsRes
                if (!cancelled) setProofs(json2.data.proofs ?? [])

            } catch (e: any) {
                if (!cancelled) setError(e?.message ?? "Gagal memuat detail.")
            } finally {
                if (!cancelled) setLoading(false)
            }
        }

        load()
        return () => {
            cancelled = true
        }
    }, [id, router])

    function pickFile() {
        inputRef.current?.click()
    }

    function handleFile(f: File) {
        // validasi
        if (!isAllowedType(f)) {
            const msg = "Format file harus JPG, PNG, atau PDF."
            setError(msg)
            toast.error(msg)
            triggerInvalid()
            return
        }
        const max = 5 * 1024 * 1024
        if (f.size > max) {
            const msg = "Ukuran file terlalu besar. Maksimal 5MB."
            setError(msg)
            toast.error(msg)
            triggerInvalid()
            return
        }
        setError(null)
        setFile(f)
    }

    function triggerInvalid() {
        setIsInvalid(true)
        setTimeout(() => setIsInvalid(false), 1000)
    }

    async function onUpload() {
        if (!file) return
        if (!detail) return

        // harus dicairkan/selesai (sesuai API kamu)
        if (detail.status !== "DISBURSED" && detail.status !== "COMPLETED") {
            setError("Bukti hanya bisa diupload jika status sudah Dicairkan.")
            return
        }

        setUploading(true)
        setError(null)

        try {
            const fd = new FormData()
            fd.append("file", file)

            const res = await fetch(`/api/requests/${detail.id}/proofs`, {
                method: "POST",
                credentials: "include",
                body: fd,
            })


            if (res.status === 401) {
                router.replace("/login")
                return
            }
            if (res.status === 403) {
                throw new Error("Akses ditolak.")
            }
            if (!res.ok) {
                throw new Error(await readApiError(res))
            }
            const after = await fetch(`/api/requests/${detail.id}/proofs`, { credentials: "include" })
            if (after.ok) {
                const j = (await after.json()) as ProofsRes
                setProofs(j.data.proofs ?? [])
            }

            // sukses -> balik dashboard (sesuai flow kamu)
            setOpenSuccess(true)

            setTimeout(() => {
                router.replace("/civitas/upload-bukti")
            }, 1200)
        } catch (e: any) {
            setError(e?.message ?? "Upload gagal.")
        } finally {
            setUploading(false)
        }
    }

    async function handleDelete(proofId: number) {
        if (!confirm("Hapus bukti ini?")) return
        
        setDeletingId(proofId)
        try {
            const res = await fetch(`/api/requests/${id}/proofs?proofId=${proofId}`, {
                method: "DELETE",
                credentials: "include",
            })
            if (!res.ok) throw new Error(await readApiError(res))
            
            // Refresh
            setProofs(prev => prev.filter(p => p.id !== proofId))
            // Clear local file if any
            setFile(null)
        } catch (e: any) {
            setError(e?.message ?? "Gagal menghapus bukti.")
        } finally {
            setDeletingId(null)
        }
    }

    return (
        <div className="min-h-screen bg-slate-50/50 pb-32">
            {/* Topbar */}
            <header className="sticky top-0 z-50 h-16 bg-blue-600 text-white shadow-md">
                <div className="mx-auto flex h-16 max-w-md items-center gap-4 px-4">
                    <Link 
                        href="/civitas/upload-bukti" 
                        className="rounded-full p-2 transition-colors hover:bg-white/20 active:scale-95" 
                        aria-label="Kembali"
                    >
                        <ArrowLeft className="h-6 w-6" />
                    </Link>
                    <h1 className="text-xl font-bold tracking-tight">Upload Bukti</h1>
                </div>
            </header>

            <main className="mx-auto max-w-md px-4 pt-6 space-y-6">
                {error && (
                    <div className="rounded-2xl border border-rose-100 bg-rose-50 p-4 text-sm font-medium text-rose-600 animate-in zoom-in-95">
                        {error}
                    </div>
                )}

                {/* Detail Permintaan */}
                <Card className="overflow-hidden rounded-[2.5rem] border-none bg-white shadow-sm transition-all hover:shadow-md">
                    <CardContent className="p-8">
                        <h3 className="mb-6 text-xs font-black uppercase tracking-widest text-slate-400">
                            Detail Permintaan
                        </h3>

                        {loading ? (
                            <div className="space-y-4 animate-pulse">
                                <div className="h-4 w-full rounded bg-slate-50" />
                                <div className="h-4 w-2/3 rounded bg-slate-50" />
                                <div className="h-4 w-3/4 rounded bg-slate-50" />
                            </div>
                        ) : detail && (
                            <div className="space-y-4">
                                <div className="flex items-start justify-between gap-4">
                                    <span className="text-sm font-bold text-slate-400 uppercase tracking-tight">Judul:</span>
                                    <span className="text-sm font-black text-slate-900 text-right">{detail.judul}</span>
                                </div>

                                <div className="flex items-center justify-between gap-4 py-3 border-y border-slate-50">
                                    <span className="text-sm font-bold text-slate-400 uppercase tracking-tight">Jumlah:</span>
                                    <span className="text-lg font-black text-blue-600">{formatIDR(detail.jumlah)}</span>
                                </div>

                                <div className="flex items-center justify-between gap-4">
                                    <span className="text-sm font-bold text-slate-400 uppercase tracking-tight">Status:</span>
                                    <Badge className="rounded-full bg-blue-50 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-blue-700 hover:bg-blue-100 border-none">
                                        {detail.statusLabel}
                                    </Badge>
                                </div>

                                {detail.disetujuiAt && (
                                    <div className="pt-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                        Dicairkan: {formatDateID(detail.disetujuiAt)}
                                    </div>
                                )}
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Upload area */}
                <Card className="overflow-hidden rounded-[2.5rem] border-none bg-white shadow-sm">
                    <CardContent className="p-8">
                        <h3 className="mb-6 text-xs font-black uppercase tracking-widest text-slate-400">
                            Upload Bukti Pengeluaran
                        </h3>

                        <input
                            ref={inputRef}
                            type="file"
                            accept=".jpg,.jpeg,.png,.pdf"
                            className="hidden"
                            onChange={(e) => {
                                const f = e.target.files?.[0]
                                if (f) handleFile(f)
                                e.currentTarget.value = ""
                            }}
                        />

                        <div
                            onClick={pickFile}
                            onDragEnter={(e) => { e.preventDefault(); setDragOver(true); }}
                            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                            onDragLeave={(e) => { e.preventDefault(); setDragOver(false); }}
                            onDrop={(e) => {
                                e.preventDefault()
                                setDragOver(false)
                                const f = e.dataTransfer.files?.[0]
                                if (f) handleFile(f)
                            }}
                            className={[
                                "group relative cursor-pointer overflow-hidden rounded-[2rem] border-2 border-dashed p-10 text-center transition-all duration-300",
                                isInvalid ? "border-rose-500 bg-rose-50/50 shake-subtle" : 
                                dragOver ? "border-blue-500 bg-blue-50/50 scale-[0.98]" : 
                                "border-slate-100 bg-slate-50/50 hover:border-blue-200 hover:bg-slate-50",
                                file ? "border-emerald-200 bg-emerald-50/30" : ""
                            ].join(" ")}
                        >
                            <div className={[
                                "mx-auto mb-6 grid h-20 w-20 place-items-center rounded-3xl transition-transform duration-300 group-hover:scale-110 shadow-sm",
                                file ? "bg-emerald-100 text-emerald-600" : "bg-white text-blue-600"
                            ].join(" ")}>
                                <Upload className="h-10 w-10" />
                            </div>

                            <div className="space-y-1">
                                <p className="text-lg font-black text-slate-900 leading-none">Tap untuk pilih file</p>
                                <p className="text-sm font-bold text-slate-400">atau drag & drop</p>
                                <p className="pt-3 text-[10px] font-black uppercase tracking-widest text-slate-300">JPG, PNG, PDF (Max 5MB)</p>
                            </div>

                            {fileLabel && (
                                <div className="mt-6 rounded-2xl bg-white border border-emerald-100 px-4 py-3 text-xs font-bold text-emerald-700 animate-in zoom-in-95 shadow-sm">
                                    {fileLabel}
                                </div>
                            )}

                            {dragOver && (
                                <div className="absolute inset-0 bg-blue-600/5 backdrop-blur-[2px] flex items-center justify-center">
                                    <p className="text-blue-600 font-black text-xl">Lepas untuk Upload</p>
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {proofs.length > 0 && (
                    <Card className="rounded-[2rem] border-none bg-white shadow-sm overflow-hidden">
                        <CardContent className="p-8">
                            <h3 className="mb-4 text-xs font-black uppercase tracking-widest text-slate-400">Bukti Terupload</h3>

                            <div className="space-y-3">
                                {proofs.map((p) => (
                                    <div key={p.id} className="flex items-center gap-2 group">
                                        <a
                                            href={p.fileUrl}
                                            target="_blank"
                                            className="flex items-center gap-3 rounded-2xl border border-slate-50 bg-slate-50/50 p-4 text-sm font-bold text-slate-700 transition-colors hover:bg-slate-50 hover:text-blue-600 flex-1 overflow-hidden"
                                        >
                                            <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-slate-400 group-hover:text-blue-500 shadow-sm transition-colors">
                                                <CheckCircle2 className="h-5 w-5" />
                                            </div>
                                            <span className="truncate">{p.fileName}</span>
                                        </a>
                                        {detail?.status === "DISBURSED" && (
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-14 w-14 rounded-2xl text-rose-400 hover:text-rose-600 hover:bg-rose-50"
                                                onClick={() => handleDelete(p.id)}
                                                disabled={deletingId !== null}
                                            >
                                                {deletingId === p.id ? (
                                                    <Loader2 className="h-5 w-5 animate-spin" />
                                                ) : (
                                                    <Trash2 className="h-5 w-5" />
                                                )}
                                            </Button>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Buttons in a sticky-like container or bottom area */}
                <div className="mt-8 space-y-4">
                    <Button
                        className={[
                            "w-full h-16 rounded-[1.5rem] font-black text-lg transition-all hover:-translate-y-1 active:scale-95 shadow-lg",
                            file ? "bg-blue-600 hover:bg-blue-700 shadow-blue-200" : "bg-slate-200 text-slate-400 pointer-events-none"
                        ].join(" ")}
                        disabled={!file || uploading || !(detail?.status === "DISBURSED" || detail?.status === "COMPLETED")}
                        onClick={onUpload}
                    >
                        {uploading ? (
                            <><div className="mr-3 h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" /> Mengupload...</>
                        ) : (
                            <><Upload className="mr-3 h-6 w-6" /> Upload Bukti</>
                        )}
                    </Button>

                    <Button
                        variant="ghost"
                        className="w-full h-14 rounded-[1.5rem] font-black text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                        onClick={() => router.back()}
                        disabled={uploading}
                    >
                        Batal
                    </Button>
                </div>

                {/* Warning box */}
                <div className="rounded-[2rem] border border-amber-100 bg-amber-50/50 p-6 shadow-sm">
                    <div className="mb-4 flex items-center gap-2 text-amber-600">
                        <AlertTriangle className="h-5 w-5" />
                        <span className="font-black text-xs uppercase tracking-widest">Penting:</span>
                    </div>
                    <ul className="space-y-2 text-sm font-medium text-amber-800/80">
                        <li className="flex items-start gap-2">
                            <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-amber-400 shrink-0" />
                            Upload foto bukti struk/kwitansi yang jelas
                        </li>
                        <li className="flex items-start gap-2">
                            <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-amber-400 shrink-0" />
                            Pastikan nominal sesuai dengan jumlah dana
                        </li>
                        <li className="flex items-start gap-2">
                            <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-amber-400 shrink-0" />
                            Bukti akan divalidasi oleh Bendahara
                        </li>
                    </ul>
                </div>
            </main>

            <Dialog open={openSuccess} onOpenChange={setOpenSuccess}>
                <DialogContent className="max-w-[340px] rounded-[3rem] p-10 border-none shadow-2xl flex flex-col items-center text-center gap-6" showCloseButton={false}>
                    <VisuallyHidden>
                        <DialogTitle>Upload berhasil</DialogTitle>
                    </VisuallyHidden>

                    <div className="relative">
                        <div className="absolute inset-0 scale-150 bg-emerald-100 blur-2xl rounded-full opacity-50" />
                        <div className="relative grid h-24 w-24 place-items-center rounded-all bg-emerald-50 text-emerald-500 shadow-inner scale-110">
                            <CheckCircle2 className="h-12 w-12" />
                            <div className="absolute inset-0 bg-emerald-400/20 animate-ping rounded-full" />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <div className="text-2xl font-black text-slate-900 leading-tight">
                            Upload Berhasil!
                        </div>
                        <p className="text-sm font-bold text-slate-400 leading-relaxed">
                            Bukti pengeluaran telah diupload dan menunggu validasi dari Bendahara.
                        </p>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    )
}

