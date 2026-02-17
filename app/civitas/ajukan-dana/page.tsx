"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, FileText, DollarSign, CalendarDays, Send, CheckCircle2 } from "lucide-react"
import {
    Dialog,
    DialogContent,
    DialogTitle,
} from "@/components/ui/dialog"
import { VisuallyHidden } from "@radix-ui/react-visually-hidden"

import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"

type CreateResponse = {
    data: {
        id: number
        title: string
        description: string | null
        amountRequested: number
        neededBy: string | null
        status: string
        submittedAt: string | null
        createdAt: string
    }
}

function formatIDRInput(value: string) {
    const digits = value.replace(/[^\d]/g, "")
    if (!digits) return { raw: 0, display: "" }
    const raw = Number(digits)
    const display = digits.replace(/\B(?=(\d{3})+(?!\d))/g, ".")
    return { raw, display }
}

async function readApiError(res: Response) {
    const j = await res.json().catch(() => null)
    // endpoint kamu kadang pakai "message", kadang "error"
    return j?.error ?? j?.message ?? `HTTP ${res.status}`
}

export default function AjukanDanaPage() {
    const router = useRouter()

    const [title, setTitle] = useState("")
    const [description, setDescription] = useState("")
    const [amountDisplay, setAmountDisplay] = useState("")
    const [amountRaw, setAmountRaw] = useState(0)
    const [neededBy, setNeededBy] = useState("") // YYYY-MM-DD

    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [openSuccess, setOpenSuccess] = useState(false)

    useEffect(() => {
        if (!openSuccess) return
        const t = setTimeout(() => router.replace("/civitas"), 1200)
        return () => clearTimeout(t)
    }, [openSuccess, router])

    async function onSubmit(e: React.FormEvent) {
        e.preventDefault()
        setError(null)

        // Validasi sesuai endpoint kamu
        if (title.trim().length < 3) return setError("Judul minimal 3 karakter.")
        if (description.trim().length < 10) return setError("Deskripsi minimal 10 karakter.")
        if (!amountRaw || amountRaw <= 0) return setError("Jumlah dana harus > 0.")
        if (!neededBy) return setError("Tanggal dibutuhkan wajib diisi.")

        setLoading(true)
        try {
            const res = await fetch("/api/requests", {
                method: "POST",
                credentials: "include",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    title: title.trim(),
                    description: description.trim(),
                    amountRequested: amountRaw,
                    neededBy, // backend kamu sudah validasi YYYY-MM-DD + ga boleh masa lalu
                }),
            })

            if (res.status === 401) {
                router.replace("/login")
                return
            }
            if (res.status === 403) {
                throw new Error("Akses ditolak (bukan CIVITAS).")
            }
            if (!res.ok) {
                throw new Error(await readApiError(res))
            }

            await res.json()

            setOpenSuccess(true)

            // reset form optional
            setTitle("")
            setDescription("")
            setAmountDisplay("")
            setAmountRaw(0)
            setNeededBy("")

            setTimeout(() => {
                router.replace("/civitas")
            }, 1200)
        } catch (e: any) {
            setError(e?.message ?? "Gagal mengirim pengajuan.")
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen bg-background">
            {/* Topbar */}
            <header className="sticky top-0 z-50 h-14 bg-primary text-primary-foreground shadow">
                <div className="mx-auto flex h-14 max-w-md items-center gap-3 px-4">
                    <Link href="/civitas" className="rounded-md p-1 hover:bg-white/10 transition" aria-label="Kembali">
                        <ArrowLeft className="h-6 w-6" />
                    </Link>
                    <h1 className="text-lg font-semibold">Ajukan Dana</h1>
                </div>
            </header>

            <main className="mx-auto max-w-md px-4 pb-10 pt-4">
                {/* Info box */}
                <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-700">
                    Isi formulir dengan lengkap untuk mengajukan dana dari anggaran BOS
                </div>

                {error && (
                    <div className="mt-4 rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                        {error}
                    </div>
                )}

                <form onSubmit={onSubmit} className="mt-5 space-y-4">
                    {/* Judul */}
                    <Card className="rounded-2xl">
                        <CardContent className="p-4">
                            <div className="mb-3 flex items-center gap-2 font-medium">
                                <FileText className="h-5 w-5 text-blue-600" />
                                <span>Judul Pengajuan</span>
                            </div>
                            <Input
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                placeholder="Contoh: Pembelian ATK Kelas"
                                className="h-12 rounded-xl"
                            />
                        </CardContent>
                    </Card>

                    {/* Deskripsi */}
                    <Card className="rounded-2xl">
                        <CardContent className="p-4">
                            <div className="mb-3 font-medium">Deskripsi Kebutuhan</div>
                            <Textarea
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="Jelaskan kebutuhan dan alasan pengajuan dana..."
                                className="min-h-28 rounded-xl"
                            />
                        </CardContent>
                    </Card>

                    {/* Jumlah */}
                    <Card className="rounded-2xl">
                        <CardContent className="p-4">
                            <div className="mb-3 flex items-center gap-2 font-medium">
                                <DollarSign className="h-5 w-5 text-green-600" />
                                <span>Jumlah Dana</span>
                            </div>
                            <div className="relative">
                                <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                                    Rp
                                </div>
                                <Input
                                    value={amountDisplay}
                                    onChange={(e) => {
                                        const { raw, display } = formatIDRInput(e.target.value)
                                        setAmountRaw(raw)
                                        setAmountDisplay(display)
                                    }}
                                    inputMode="numeric"
                                    placeholder="0"
                                    className="h-12 rounded-xl pl-10"
                                />
                            </div>
                        </CardContent>
                    </Card>

                    {/* Tanggal */}
                    <Card className="rounded-2xl">
                        <CardContent className="p-4">
                            <div className="mb-3 flex items-center gap-2 font-medium">
                                <CalendarDays className="h-5 w-5 text-purple-600" />
                                <span>Tanggal Dibutuhkan</span>
                            </div>
                            <Input
                                type="date"
                                value={neededBy}
                                onChange={(e) => setNeededBy(e.target.value)}
                                className="h-12 rounded-xl"
                            />
                        </CardContent>
                    </Card>

                    {/* Submit */}
                    <Button
                        type="submit"
                        disabled={loading || openSuccess}
                        className="h-12 w-full rounded-xl bg-primary text-primary-foreground hover:bg-primary/90"
                    >
                        <Send className="mr-2 h-5 w-5" />
                        {loading ? "Mengirim..." : "Kirim Pengajuan"}
                    </Button>
                </form>

                {/* Catatan */}
                <div className="mt-6 rounded-2xl bg-muted/50 p-4 text-sm text-muted-foreground">
                    <div className="mb-2 font-medium text-foreground">📌 Catatan:</div>
                    <ul className="list-inside list-disc space-y-1">
                        <li>Pengajuan akan ditinjau oleh Kepala Sekolah</li>
                        <li>Pastikan data yang diisi lengkap dan akurat</li>
                        <li>Anda akan menerima notifikasi status pengajuan</li>
                    </ul>
                </div>
            </main>
            <Dialog open={openSuccess} onOpenChange={setOpenSuccess}>
                <DialogContent className="max-w-[320px] rounded-2xl p-6">
                    <VisuallyHidden>
                        <DialogTitle>Pengajuan berhasil</DialogTitle>
                    </VisuallyHidden>

                    <div className="flex flex-col items-center text-center">
                        <div className="grid h-14 w-14 place-items-center rounded-full bg-green-100">
                            <CheckCircle2 className="h-8 w-8 text-green-600" />
                        </div>

                        <div className="mt-4 text-lg font-semibold">Pengajuan Berhasil!</div>
                        <p className="mt-2 text-sm text-muted-foreground">
                            Pengajuan dana Anda telah dikirim dan menunggu persetujuan
                        </p>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    )
}