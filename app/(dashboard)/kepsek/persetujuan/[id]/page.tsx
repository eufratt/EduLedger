"use client"

import { useEffect, useState, use } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { ChevronLeft, CheckCircle2, XCircle, Loader2, Library, ReceiptText, Calendar } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { RkasDetailSpecific } from "@/components/dashboard/RkasDetailSpecific"
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
    label?: string
    fiscalYear?: number
    submittedAt?: string | null
    approvedAt?: string | null
    totalAnggaran?: number
    totalRealisasi?: number
    rincian?: {
        id: number
        nama: string
        amountAllocated: number
        usedAmount: number
        note: string | null
    }[]
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
    const type = searchParams?.get("type") || "request"

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
                const endpoint = type === "rkab" ? `/api/kepsek/rkabs/${id}` : `/api/kepsek/requests/${id}`
                const res = await fetch(endpoint)
                if (!res.ok) throw new Error("Gagal memuat detail pengajuan")
                const json = await res.json()
                
                const item = json.data
                setData(item)

                // Handle action from query param if any
                const action = searchParams?.get("action")
                if (action === "approve") {
                    // Just focus or stay on page
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
    }, [id, searchParams, type])

    const handleApprove = async () => {
        setSubmitting(true)
        try {
            const endpoint = (type === "rkab" 
                ? `/api/kepsek/rkabs/${id}/decision` 
                : `/api/kepsek/requests/${id}/decision`)
            
            const res = await fetch(endpoint, {
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
            const endpoint = (type === "rkab" 
                ? `/api/kepsek/rkabs/${id}/decision` 
                : `/api/kepsek/requests/${id}/decision`)

            const res = await fetch(endpoint, {
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
        <div className="min-h-screen bg-slate-50 pb-28">
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
                {type === "rkab" ? (
                    <RkasDetailSpecific data={data as any} />
                ) : (
                    <>
                        {/* Main Info Card */}
                        <Card className="rounded-2xl shadow-sm border-none overflow-hidden relative">
                            <CardContent className="p-6">
                                <div className="flex items-start gap-4 mb-4">
                                    <div className={`w-14 h-14 rounded-2xl grid place-items-center flex-shrink-0 ${
                                        type === "rkab" ? "bg-purple-100 text-purple-600" : "bg-amber-100 text-amber-600"
                                    }`}>
                                        {type === "rkab" ? <Library className="h-8 w-8" /> : <ReceiptText className="h-8 w-8" />}
                                    </div>
                                    <div className="min-w-0">
                                        {type === "rkab" && (
                                            <Badge className="bg-purple-100 text-purple-700 hover:bg-purple-100 border-none rounded-md px-2 py-0.5 text-[10px] uppercase font-black mb-1">
                                                RKAS
                                            </Badge>
                                        )}
                                        <h2 className="text-xl font-bold text-slate-900 leading-tight">{data.title}</h2>
                                        <p className="text-sm text-slate-500 mt-1 font-medium">Pengaju: {data.pengaju}</p>
                                    </div>
                                </div>
                                <div className="mt-4">
                                    <p className="text-2xl font-bold text-slate-800">{formatIDR(data.amountRequested)}</p>
                                    <p className="text-sm text-slate-400 mt-1">Diajukan: {formatDate(data.diajukanAt)}</p>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Description Card */}
                        <Card className="rounded-2xl shadow-sm border-none">
                            <CardContent className="p-6">
                                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Deskripsi</h3>
                                <p className="text-slate-700 leading-relaxed font-medium">
                                    {data.description || "Tidak ada deskripsi"}
                                </p>
                            </CardContent>
                        </Card>

                        {/* Standard Specific: Details list */}
                        {data.rincian && (
                            <Card className="rounded-2xl shadow-sm border-none">
                                <CardContent className="p-6">
                                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Rincian Kegiatan</h3>
                                    <div className="space-y-3">
                                        {data.rincian.map((it) => (
                                            <div key={it.id} className="flex justify-between items-center bg-slate-50 p-4 rounded-xl">
                                                <div className="min-w-0 pr-4">
                                                    <p className="text-sm font-semibold text-slate-800 truncate">{it.nama}</p>
                                                    {it.note && <p className="text-[11px] text-slate-400 mt-0.5 truncate">{it.note}</p>}
                                                </div>
                                                <p className="text-sm font-bold text-slate-700 whitespace-nowrap">
                                                    {formatIDR(it.amountAllocated)}
                                                </p>
                                            </div>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>
                        )}
                    </>
                )}

                {/* Sticky Footer Actions - Only show if pending */}
                {data.status === "SUBMITTED" && (
                    <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/80 backdrop-blur-lg border-t border-slate-100 z-40">
                        <div className="mx-auto max-w-md grid grid-cols-2 gap-3">
                            <Button
                                className="h-12 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-md"
                                onClick={handleApprove}
                                disabled={submitting}
                            >
                                {submitting ? <Loader2 className="animate-spin mr-2" /> : <CheckCircle2 className="mr-2 h-5 w-5" />}
                                Setujui
                            </Button>
                            <Button
                                variant="destructive"
                                className="h-12 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold shadow-md"
                                onClick={() => setShowRejection(true)}
                                disabled={submitting}
                            >
                                <XCircle className="mr-2 h-5 w-5" />
                                Tolak
                            </Button>
                        </div>
                    </div>
                )}
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
