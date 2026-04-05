"use client"

import { useEffect, useState, use } from "react"
import { useRouter } from "next/navigation"
import { ChevronLeft, ReceiptText, Calendar, User, Info, CheckCircle2, Loader2, AlertCircle } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
    DialogDescription,
} from "@/components/ui/dialog"

type RequestDetail = {
    id: number
    title: string
    description: string
    amountRequested: number
    requester: string
    status: string
    diajukanAt: string
    disbursedAt?: string
    rkabItemName?: string
    proofs?: Array<{
        id: number
        fileUrl: string
        fileName: string
        uploadedAt: string
    }>
}

function formatIDR(n: number) {
    return new Intl.NumberFormat("id-ID", {
        style: "currency",
        currency: "IDR",
        minimumFractionDigits: 0,
    }).format(n)
}

function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString("id-ID", {
        day: "numeric",
        month: "long",
        year: "numeric",
    })
}

export default function BendaharaPencairanDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params)
    const router = useRouter()
    const [data, setData] = useState<RequestDetail | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [isConfirming, setIsConfirming] = useState(false)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [isSuccess, setIsSuccess] = useState(false)
    const [isValidating, setIsValidating] = useState(false)
    const [successType, setSuccessType] = useState<"disburse" | "validate">("disburse")

    useEffect(() => {
        async function fetchDetail() {
            setLoading(true)
            try {
                const res = await fetch(`/api/bendahara/pencairan/${id}`)
                if (!res.ok) throw new Error("Gagal memuat detail pengajuan")
                const json = await res.json()
                setData(json.data)
            } catch (err: any) {
                setError(err.message)
            } finally {
                setLoading(false)
            }
        }
        fetchDetail()
    }, [id])

    const handleDisburse = async () => {
        setIsSubmitting(true)
        try {
            const res = await fetch(`/api/requests/${id}/disburse`, {
                method: "POST",
            })
            if (!res.ok) {
                const errJson = await res.json()
                throw new Error(errJson.error || "Gagal mencairkan dana")
            }
            setSuccessType("disburse")
            setIsConfirming(false)
            setIsSuccess(true)
        } catch (err: any) {
            alert(err.message)
        } finally {
            setIsSubmitting(false)
        }
    }

    const handleValidate = async () => {
        setIsValidating(true)
        try {
            const res = await fetch(`/api/bendahara/pencairan/${id}/validate`, {
                method: "POST",
            })
            if (!res.ok) {
                const errJson = await res.json()
                throw new Error(errJson.error || "Gagal memvalidasi pencairan")
            }
            setSuccessType("validate")
            setIsSuccess(true)
        } catch (err: any) {
            alert(err.message)
        } finally {
            setIsValidating(false)
        }
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-50 grid place-items-center">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
                    <p className="text-slate-500 font-medium animate-pulse">Memuat data...</p>
                </div>
            </div>
        )
    }

    if (error || !data) {
        return (
            <div className="min-h-screen bg-slate-50 p-4 flex flex-col items-center justify-center">
                <AlertCircle className="h-16 w-16 text-rose-500 mb-4" />
                <p className="text-slate-800 font-bold text-lg mb-2">Waduh, ada masalah!</p>
                <p className="text-slate-500 text-center max-w-xs mb-8">{error || "Data tidak ditemukan"}</p>
                <Button onClick={() => router.back()} className="h-12 px-8 rounded-2xl bg-blue-600 hover:bg-blue-700 font-bold shadow-lg">
                    Kembali
                </Button>
            </div>
        )
    }

    const isPendingDisbursement = data.status === "APPROVED"
    const isDisbursed = data.status === "DISBURSED"
    const hasProofs = data.proofs && data.proofs.length > 0
    const isCompleted = data.status === "COMPLETED"

    return (
        <div className="min-h-screen bg-slate-50 pb-32">
            {/* Topbar */}
            <header className="sticky top-0 z-50 bg-blue-600 text-white shadow-lg">
                <div className="mx-auto flex h-16 max-w-md items-center px-4">
                    <button onClick={() => router.back()} className="mr-3 p-2 hover:bg-blue-500 rounded-full transition-colors">
                        <ChevronLeft className="h-6 w-6" />
                    </button>
                    <h1 className="text-xl font-bold tracking-tight">Detail Pengajuan</h1>
                </div>
            </header>

            <main className="mx-auto max-w-md px-4 py-6 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                {/* Main Card */}
                <Card className="rounded-[2.5rem] bg-white border-none shadow-sm overflow-hidden transform transition-all hover:shadow-md">
                    <CardContent className="p-8">
                        <div className="flex items-start justify-between mb-8">
                            <div className="w-16 h-16 rounded-3xl bg-blue-50 text-blue-600 grid place-items-center shadow-inner">
                                <ReceiptText className="h-8 w-8" />
                            </div>
                            <Badge className={`rounded-xl px-3 py-1.5 text-[10px] uppercase font-black tracking-widest border-none shadow-sm ${
                                isPendingDisbursement 
                                    ? "bg-amber-100 text-amber-700" 
                                    : isDisbursed
                                        ? "bg-blue-100 text-blue-700"
                                        : "bg-emerald-100 text-emerald-700"
                            }`}>
                                {isPendingDisbursement ? "Disetujui" : isDisbursed ? "Dicairkan" : "Selesai"}
                            </Badge>
                        </div>

                        <div className="space-y-1 mb-8">
                            <h2 className="text-2xl font-black text-slate-900 leading-tight">
                                {data.title}
                            </h2>
                            <p className="text-slate-400 font-bold flex items-center gap-1.5 lowercase first-letter:uppercase">
                                <User className="h-3.5 w-3.5" />
                                Pemohon: {data.requester}
                            </p>
                        </div>

                        <div className="p-6 bg-slate-50 rounded-[1.5rem] border border-slate-100 mb-8">
                            <p className="text-3xl font-black text-slate-900 leading-none mb-2">
                                {formatIDR(data.amountRequested)}
                            </p>
                            <p className="text-xs text-slate-400 font-bold flex items-center gap-1.5 uppercase tracking-wider">
                                <Calendar className="h-3 w-3" />
                                Diajukan {formatDate(data.diajukanAt)}
                            </p>
                        </div>

                        {data.rkabItemName && (
                            <div className="flex items-center gap-3 p-4 bg-blue-50 border border-blue-100 rounded-2xl">
                                <Info className="h-5 w-5 text-blue-500 shrink-0" />
                                <div>
                                    <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Item RKAS</p>
                                    <p className="text-sm font-bold text-slate-800">{data.rkabItemName}</p>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Description */}
                <Card className="rounded-[2rem] bg-white border-none shadow-sm">
                    <CardContent className="p-8">
                        <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Deskripsi</h3>
                        <p className="text-slate-700 font-medium leading-relaxed">
                            {data.description || "Perbaikan toilet lantai 2"}
                        </p>
                    </CardContent>
                </Card>

                {/* Expenditure Proof Section */}
                {(isDisbursed || isCompleted) && (
                    <Card className="rounded-[2rem] bg-white border-none shadow-sm overflow-hidden">
                        <CardContent className="p-8">
                            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-6">Bukti Pengeluaran</h3>
                            
                            {!hasProofs ? (
                                <div className="text-center py-10 bg-slate-50 rounded-[1.5rem] border border-dashed border-slate-200">
                                    <AlertCircle className="h-10 w-10 text-slate-300 mx-auto mb-3" />
                                    <p className="text-sm font-bold text-slate-400">Belum ada bukti diupload</p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    <div className="p-6 bg-slate-50 rounded-[1.5rem] border border-slate-100 text-center flex flex-col items-center gap-3 group">
                                        <div className="w-14 h-14 rounded-full bg-blue-50 text-blue-600 grid place-items-center mb-2 group-hover:scale-110 transition-transform">
                                            <ReceiptText className="h-7 w-7" />
                                        </div>
                                        <p className="text-sm font-bold text-slate-600">Bukti telah diupload</p>
                                        <a 
                                            href={data.proofs![0].fileUrl} 
                                            target="_blank" 
                                            className="text-blue-600 text-sm font-black hover:underline underline-offset-4"
                                        >
                                            Lihat Bukti
                                        </a>
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                )}

                {/* Info Text */}
                {isPendingDisbursement && (
                    <div className="flex items-start gap-4 p-5 bg-blue-50/50 border border-blue-100 rounded-3xl">
                        <Info className="h-5 w-5 text-blue-500 mt-1 shrink-0" />
                        <p className="text-sm font-semibold text-blue-800 leading-relaxed">
                            Pastikan anda sudah menyerahkan dana kepada {data.requester} sebelum menekan tombol Cairkan Dana.
                        </p>
                    </div>
                )}

                {isDisbursed && (
                    <div className="flex items-start gap-4 p-5 bg-emerald-50 border border-emerald-100 rounded-3xl animate-in zoom-in-95 duration-300">
                        <CheckCircle2 className="h-5 w-5 text-emerald-500 mt-0.5 shrink-0" />
                        <p className="text-sm font-semibold text-emerald-800 leading-relaxed">
                            Dana telah dicairkan. Menunggu upload bukti dari pemohon.
                        </p>
                    </div>
                )}
            </main>

            {/* Sticky Action Footer */}
            {(isPendingDisbursement || (isDisbursed && hasProofs)) && (
                <div className="fixed bottom-0 left-0 right-0 p-6 bg-white/95 backdrop-blur-xl border-t border-slate-100 z-40">
                    <div className="mx-auto max-w-md">
                        {isPendingDisbursement ? (
                            <Button
                                className="w-full h-16 rounded-3xl bg-blue-600 hover:bg-blue-700 text-white font-black text-lg shadow-[0_8px_30px_rgb(37,99,235,0.4)] transition-all hover:-translate-y-1 active:scale-95 group overflow-hidden relative"
                                onClick={() => setIsConfirming(true)}
                            >
                                <CheckCircle2 className="mr-3 h-6 w-6 group-hover:scale-110 transition-transform" />
                                Cairkan Dana
                            </Button>
                        ) : (
                            <Button
                                className="w-full h-16 rounded-3xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-lg shadow-[0_8px_30px_rgb(5,150,105,0.4)] transition-all hover:-translate-y-1 active:scale-95 group overflow-hidden relative"
                                onClick={handleValidate}
                                disabled={isValidating}
                            >
                                {isValidating ? (
                                    <Loader2 className="h-6 w-6 animate-spin" />
                                ) : (
                                    <>
                                        <CheckCircle2 className="mr-3 h-6 w-6 group-hover:scale-110 transition-transform" />
                                        Validasi Pencairan
                                    </>
                                )}
                            </Button>
                        )}
                    </div>
                </div>
            )}

            {/* Confirmation Dialog */}
            <Dialog open={isConfirming} onOpenChange={setIsConfirming}>
                <DialogContent className="max-w-[340px] rounded-[2.5rem] p-8 border-none shadow-2xl flex flex-col items-center text-center gap-6" showCloseButton={false}>
                    <div className="w-20 h-20 rounded-full bg-blue-50 text-blue-600 grid place-items-center shadow-inner scale-110">
                        <AlertCircle className="h-10 w-10" />
                    </div>
                    <DialogHeader className="space-y-2">
                        <DialogTitle className="text-2xl font-black text-slate-900">Konfirmasi Pencairan</DialogTitle>
                        <DialogDescription className="text-slate-500 font-medium">
                            Ingin mencairkan dana sebesar <span className="font-bold text-slate-900">{formatIDR(data.amountRequested)}</span> untuk pengajuan <span className="font-bold text-slate-900">"{data.title}"</span>?
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid grid-cols-2 gap-4 w-full">
                        <Button
                            variant="secondary"
                            className="h-14 rounded-2xl font-black bg-slate-100 hover:bg-slate-200 text-slate-600"
                            onClick={() => setIsConfirming(false)}
                        >
                            Batal
                        </Button>
                        <Button
                            className="h-14 rounded-2xl font-black bg-blue-600 hover:bg-blue-700 text-white shadow-lg"
                            onClick={handleDisburse}
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? <Loader2 className="animate-spin" /> : "Ya, Cairkan"}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Success Animation Dialog */}
            <Dialog open={isSuccess} onOpenChange={(open) => {
                if (!open) {
                    setIsSuccess(false)
                    router.push("/bendahara/pencairan-dana")
                }
            }}>
                <DialogContent className="max-w-[320px] rounded-[2.5rem] p-10 border-none shadow-2xl flex flex-col items-center text-center gap-6" showCloseButton={false}>
                    <div className="w-24 h-24 rounded-full bg-emerald-50 text-emerald-500 grid place-items-center shadow-inner relative overflow-hidden">
                        <div className="absolute inset-0 bg-emerald-400/20 animate-ping" />
                        <CheckCircle2 className="h-12 w-12 relative z-10" />
                    </div>
                    <div className="space-y-2">
                        <DialogTitle className="text-2xl font-black text-slate-900 leading-tight">Berhasil!</DialogTitle>
                        <p className="text-slate-500 font-medium">Dana telah berhasil dicairkan dan dicatat ke dalam buku kas.</p>
                    </div>
                    <Button
                        className="w-full h-14 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-black shadow-lg shadow-emerald-200"
                        onClick={() => {
                            setIsSuccess(false)
                            router.push("/bendahara/pencairan-dana")
                        }}
                    >
                        Selesai
                    </Button>
                </DialogContent>
            </Dialog>
        </div>
    )
}
