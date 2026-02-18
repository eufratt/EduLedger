"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { ArrowLeft, Upload, AlertTriangle, CheckCircle2 } from "lucide-react"

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
            setError("Format file harus JPG, PNG, atau PDF.")
            return
        }
        const max = 5 * 1024 * 1024
        if (f.size > max) {
            setError("Ukuran file maksimal 5MB.")
            return
        }
        setError(null)
        setFile(f)
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
                router.replace("/civitas")
            }, 1200)
        } catch (e: any) {
            setError(e?.message ?? "Upload gagal.")
        } finally {
            setUploading(false)
        }
    }


    return (
        <div className="min-h-screen bg-background">
            {/* Topbar */}
            <header className="sticky top-0 z-50 h-14 bg-primary text-primary-foreground shadow">
                <div className="mx-auto flex h-14 max-w-md items-center gap-3 px-4">
                    <Link href="/civitas/upload-bukti" className="rounded-md p-1 hover:bg-white/10 transition" aria-label="Kembali">
                        <ArrowLeft className="h-6 w-6" />
                    </Link>
                    <h1 className="text-lg font-semibold">Upload Bukti</h1>
                </div>
            </header>

            <main className="mx-auto max-w-md px-4 pb-10 pt-4">
                {error && (
                    <div className="mb-4 rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                        {error}
                    </div>
                )}

                {/* Detail Permintaan */}
                <Card className="rounded-2xl">
                    <CardContent className="p-4">
                        <div className="mb-4 font-semibold">Detail Permintaan</div>

                        {loading && <div className="text-sm text-muted-foreground">Memuat...</div>}

                        {!loading && detail && (
                            <div className="space-y-3 text-sm">
                                <div className="flex items-center justify-between gap-3">
                                    <div className="text-muted-foreground">Judul:</div>
                                    <div className="font-medium text-right">{detail.judul}</div>
                                </div>

                                <div className="flex items-center justify-between gap-3">
                                    <div className="text-muted-foreground">Jumlah:</div>
                                    <div className="font-medium text-right">{formatIDR(detail.jumlah)}</div>
                                </div>

                                <div className="flex items-center justify-between gap-3">
                                    <div className="text-muted-foreground">Status:</div>
                                    <Badge className="rounded-full bg-blue-100 text-blue-700 hover:bg-blue-100">
                                        {detail.statusLabel}
                                    </Badge>
                                </div>

                                {/* tanggal dicairkan/ditampilkan: pakai disetujuiAt sementara */}
                                {detail.disetujuiAt && (
                                    <div className="pt-1 text-xs text-muted-foreground">
                                        Dicairkan: {formatDateID(detail.disetujuiAt)}
                                    </div>
                                )}
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Upload area */}
                <Card className="mt-4 rounded-2xl">
                    <CardContent className="p-4">
                        <div className="mb-3 font-semibold">Upload Bukti Pengeluaran</div>

                        <input
                            ref={inputRef}
                            type="file"
                            accept=".jpg,.jpeg,.png,.pdf"
                            className="hidden"
                            onChange={(e) => {
                                const f = e.target.files?.[0]
                                if (f) handleFile(f)
                                e.currentTarget.value = "" // biar bisa pilih file sama lagi
                            }}
                        />

                        <div
                            onClick={pickFile}
                            onDragEnter={(e) => {
                                e.preventDefault()
                                setDragOver(true)
                            }}
                            onDragOver={(e) => {
                                e.preventDefault()
                                setDragOver(true)
                            }}
                            onDragLeave={(e) => {
                                e.preventDefault()
                                setDragOver(false)
                            }}
                            onDrop={(e) => {
                                e.preventDefault()
                                setDragOver(false)
                                const f = e.dataTransfer.files?.[0]
                                if (f) handleFile(f)
                            }}
                            className={[
                                "cursor-pointer rounded-2xl border bg-background p-6 text-center",
                                dragOver ? "border-primary" : "border-muted-foreground/20",
                            ].join(" ")}
                        >
                            <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-full bg-blue-100">
                                <Upload className="h-7 w-7 text-blue-600" />
                            </div>

                            <div className="font-medium">Tap untuk pilih file</div>
                            <div className="mt-1 text-sm text-muted-foreground">atau drag & drop</div>
                            <div className="mt-3 text-xs text-muted-foreground">JPG, PNG, PDF (Max 5MB)</div>

                            {fileLabel && (
                                <div className="mt-4 rounded-xl bg-muted/50 px-3 py-2 text-xs text-foreground">
                                    {fileLabel}
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {proofs.length > 0 && (
                    <Card className="rounded-2xl">
                        <CardContent className="p-4 space-y-2">
                            <div className="font-medium">Bukti Terupload</div>

                            {proofs.map((p) => (
                                <a
                                    key={p.id}
                                    href={p.fileUrl}
                                    target="_blank"
                                    className="block rounded-xl border p-3 text-sm hover:bg-muted"
                                >
                                    {p.fileName}
                                </a>
                            ))}
                        </CardContent>
                    </Card>
                )}


                {/* Buttons */}
                <div className="mt-4 space-y-3">
                    <Button
                        className="h-12 w-full rounded-xl"
                        disabled={!file || uploading || !(detail?.status === "DISBURSED" || detail?.status === "COMPLETED")}
                        onClick={onUpload}
                    >
                        <Upload className="mr-2 h-5 w-5" />
                        {uploading ? "Mengupload..." : "Upload Bukti"}
                    </Button>

                    <Button
                        variant="secondary"
                        className="h-12 w-full rounded-xl"
                        onClick={() => router.back()}
                        disabled={uploading}
                    >
                        Batal
                    </Button>
                </div>

                {/* Warning box */}
                <div className="mt-6 rounded-2xl border border-yellow-200 bg-yellow-50 p-4 text-sm text-yellow-800">
                    <div className="mb-2 flex items-center gap-2 font-medium">
                        <AlertTriangle className="h-4 w-4" />
                        Penting:
                    </div>
                    <ul className="list-inside list-disc space-y-1">
                        <li>Upload foto bukti struk/kwitansi yang jelas</li>
                        <li>Pastikan nominal sesuai dengan jumlah dana</li>
                        <li>Bukti akan divalidasi oleh Bendahara</li>
                    </ul>
                </div>
            </main>
            <Dialog open={openSuccess} onOpenChange={setOpenSuccess}>
                <DialogContent className="max-w-[320px] rounded-2xl p-6">
                    <VisuallyHidden>
                        <DialogTitle>Upload berhasil</DialogTitle>
                    </VisuallyHidden>

                    <div className="flex flex-col items-center text-center">
                        <div className="grid h-14 w-14 place-items-center rounded-full bg-green-100">
                            <CheckCircle2 className="h-8 w-8 text-green-600" />
                        </div>

                        <div className="mt-4 text-lg font-semibold">
                            Upload Berhasil!
                        </div>

                        <p className="mt-2 text-sm text-muted-foreground">
                            Bukti pengeluaran telah diupload dan menunggu validasi
                        </p>
                    </div>
                </DialogContent>
            </Dialog>

        </div>
    )
}
