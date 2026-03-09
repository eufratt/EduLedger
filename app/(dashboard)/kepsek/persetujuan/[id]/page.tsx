"use client"

import { useEffect, useState, use } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { ChevronLeft, CheckCircle2, XCircle, Loader2 } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"

type RequestDetail = {
    id: number
    title: string
    pengaju: string
    amountRequested: number
    diajukanAt: string
    description: string
    status: string
}

function formatIDR(n: number) {
    return new Intl.NumberFormat("id-ID", {
        style: "currency",
        currency: "IDR",
        minimumFractionDigits: 0,
    }).format(n)
}

function formatDate(dateStr: string) {
    const d = new Date(dateStr)
    return d.toLocaleDateString("id-ID", {
        day: "numeric",
        month: "short",
        year: "numeric",
    })
}

export default function KepsekApprovalDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params)
    const router = useRouter()
    const searchParams = useSearchParams()

    const [data, setData] = useState<RequestDetail | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    // Modal states
    const [showSuccess, setShowSuccess] = useState(false)
    const [showRejection, setShowRejection] = useState(false)
    const [rejectionNote, setRejectionNote] = useState("")
    const [submitting, setSubmitting] = useState(false)

    useEffect(() => {
        async function fetchDetail() {
            setLoading(true)
            setError(null)
            try {
                const res = await fetch(`/api/kepsek/requests/${id}`)
                if (!res.ok) throw new Error("Gagal memuat detail pengajuan")
                const json = await res.json()
                setData(json.data)

                // Handle action from query param if any
                const action = searchParams?.get("action")
                if (action === "approve") {
                    // We don't want to auto-approve, maybe just focus or something?
                    // Image shows direct buttons on detail page.
                } else if (action === "reject") {
                    setShowRejection(true)
                }
            } catch (err: any) {
                setError(err.message)
            } finally {
                setLoading(false)
            }
        }
        fetchDetail()
    }, [id, searchParams])

    const handleApprove = async () => {
        setSubmitting(true)
        try {
            const res = await fetch(`/api/kepsek/requests/${id}/decision`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action: "approve" }),
            })
            if (!res.ok) throw new Error("Gagal menyetujui pengajuan")
            setShowSuccess(true)
        } catch (err: any) {
            alert(err.message)
        } finally {
            setSubmitting(false)
        }
    }

    const handleReject = async () => {
        if (!rejectionNote.trim()) return
        setSubmitting(true)
        try {
            const res = await fetch(`/api/kepsek/requests/${id}/decision`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action: "reject", note: rejectionNote }),
            })
            if (!res.ok) throw new Error("Gagal menolak pengajuan")
            setShowRejection(false)
            router.push("/kepsek/persetujuan")
        } catch (err: any) {
            alert(err.message)
        } finally {
            setSubmitting(false)
        }
    }

    if (loading) {
        return (
            <div className="min-h-screen grid place-items-center">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            </div>
        )
    }

    if (error || !data) {
        return (
            <div className="min-h-screen p-4 flex flex-col items-center justify-center">
                <p className="text-rose-600 font-medium mb-4">{error || "Data tidak ditemukan"}</p>
                <Button onClick={() => router.back()}>Kembali</Button>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-slate-50">
            {/* Topbar */}
            <header className="sticky top-0 z-50 bg-blue-600 text-white shadow">
                <div className="mx-auto flex h-14 max-w-md items-center px-4">
                    <button onClick={() => router.back()} className="mr-3">
                        <ChevronLeft className="h-6 w-6" />
                    </button>
                    <h1 className="text-lg font-semibold">Detail Persetujuan</h1>
                </div>
            </header>

            <main className="mx-auto max-w-md px-4 py-6 space-y-4">
                {/* Main Info Card */}
                <Card className="rounded-2xl shadow-sm border-none">
                    <CardContent className="p-6">
                        <h2 className="text-xl font-bold text-slate-900">{data.title}</h2>
                        <p className="text-slate-500 mt-1">Pengaju: {data.pengaju}</p>
                        <div className="mt-4">
                            <p className="text-2xl font-bold text-slate-800">{formatIDR(data.amountRequested)}</p>
                            <p className="text-sm text-slate-400 mt-1">Diajukan: {formatDate(data.diajukanAt)}</p>
                        </div>
                    </CardContent>
                </Card>

                {/* Description Card */}
                <Card className="rounded-2xl shadow-sm border-none">
                    <CardContent className="p-6">
                        <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Deskripsi</h3>
                        <p className="mt-2 text-slate-700 leading-relaxed font-medium">
                            {data.description || "Tidak ada deskripsi"}
                        </p>
                    </CardContent>
                </Card>

                {/* Actions */}
                <div className="pt-4 space-y-3">
                    <Button
                        className="w-full h-14 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-lg shadow-[0_8px_20px_-6px_rgba(5,150,105,0.4)]"
                        onClick={handleApprove}
                        disabled={submitting}
                    >
                        {submitting ? <Loader2 className="animate-spin mr-2" /> : <CheckCircle2 className="mr-2 h-5 w-5" />}
                        Setujui
                    </Button>
                    <Button
                        variant="destructive"
                        className="w-full h-14 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-lg shadow-[0_8px_20px_-6px_rgba(225,29,72,0.4)]"
                        onClick={() => setShowRejection(true)}
                        disabled={submitting}
                    >
                        <XCircle className="mr-2 h-5 w-5" />
                        Tolak
                    </Button>
                </div>
            </main>

            {/* Success Modal */}
            <Dialog open={showSuccess} onOpenChange={(open) => {
                if (!open) {
                    setShowSuccess(false)
                    router.push("/kepsek/persetujuan")
                }
            }}>
                <DialogContent className="max-w-[320px] rounded-3xl p-8 text-center flex flex-col items-center gap-4 border-none shadow-2xl" showCloseButton={false}>
                    <div className="w-20 h-20 rounded-full bg-emerald-50 text-emerald-500 grid place-items-center mb-2">
                        <CheckCircle2 className="h-12 w-12" />
                    </div>
                    <DialogHeader>
                        <DialogTitle className="text-2xl font-bold text-slate-800">Disetujui!</DialogTitle>
                    </DialogHeader>
                    <p className="text-slate-500 font-medium">Pengajuan telah disetujui</p>
                    <Button
                        className="mt-4 w-full h-11 bg-blue-600 hover:bg-blue-700 rounded-xl font-bold shadow-lg"
                        onClick={() => {
                            setShowSuccess(false)
                            router.push("/kepsek/persetujuan")
                        }}
                    >
                        Selesai
                    </Button>
                </DialogContent>
            </Dialog>

            {/* Rejection Modal */}
            <Dialog open={showRejection} onOpenChange={setShowRejection}>
                <DialogContent className="max-w-[340px] rounded-3xl p-6 border-none shadow-2xl">
                    <DialogHeader>
                        <DialogTitle className="text-xl font-bold text-slate-800">Alasan Penolakan</DialogTitle>
                    </DialogHeader>
                    <div className="py-4">
                        <Textarea
                            placeholder="Berikan alasan penolakan..."
                            className="min-h-[120px] rounded-2xl bg-slate-50 border-slate-200 focus-visible:ring-blue-500 p-4 font-medium"
                            value={rejectionNote}
                            onChange={(e) => setRejectionNote(e.target.value)}
                        />
                    </div>
                    <DialogFooter className="grid grid-cols-2 gap-3 mt-2 sm:justify-center">
                        <Button
                            variant="secondary"
                            className="rounded-2xl h-12 font-bold bg-slate-100 hover:bg-slate-200 text-slate-600"
                            onClick={() => setShowRejection(false)}
                        >
                            Batal
                        </Button>
                        <Button
                            variant="destructive"
                            className="rounded-2xl h-12 font-bold bg-rose-600 hover:bg-rose-700 shadow-md"
                            disabled={!rejectionNote.trim() || submitting}
                            onClick={handleReject}
                        >
                            {submitting ? <Loader2 className="animate-spin" /> : "Tolak"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
