"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { 
    ChevronLeft, 
    Filter, 
    FileText, 
    Eye, 
    Download, 
    Plus,
    Calendar,
    Search,
    Loader2
} from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"

type FinancialReport = {
    id: number
    type: "INCOME" | "EXPENSE" | "BALANCE"
    period: string
    title: string
    createdAt: string
    size: number
}

function formatIDR(n: number) {
    return "Rp " + n.toLocaleString("id-ID")
}

function formatPeriode(p: string) {
    const [y, m] = p.split("-")
    const months = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Ags", "Sep", "Okt", "Nov", "Des"]
    return `${months[parseInt(m) - 1]} ${y}`
}

function formatSize(bytes: number) {
    if (bytes === 0) return "0 KB"
    const k = 1024
    const sizes = ["Bytes", "KB", "MB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
}

export default function KepsekReportsPage() {
    const router = useRouter()
    const [reports, setReports] = useState<FinancialReport[]>([])
    const [loading, setLoading] = useState(true)
    const [generating, setGenerating] = useState(false)
    
    // Filters
    const [period, setPeriod] = useState(() => {
        const now = new Date()
        return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`
    })
    const [selectedType, setSelectedType] = useState<string>("ALL")

    async function loadReports() {
        setLoading(true)
        try {
            const res = await fetch(`/api/kepsek/reports?period=${period}${selectedType !== "ALL" ? `&type=${selectedType}` : ""}`)
            if (!res.ok) throw new Error("Gagal memuat laporan")
            const data = await res.json()
            setReports(data)
        } catch (err) {
            toast.error("Gagal memuat daftar laporan")
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        loadReports()
    }, [period, selectedType])

    async function handleGenerate(type: "INCOME" | "EXPENSE" | "BALANCE") {
        setGenerating(true)
        try {
            const res = await fetch("/api/kepsek/reports", {
                method: "POST",
                body: JSON.stringify({ type, period }),
                headers: { "Content-Type": "application/json" }
            })
            if (!res.ok) throw new Error("Gagal membuat laporan")
            toast.success("Laporan berhasil diperbarui!")
            loadReports()
        } catch (err) {
            toast.error("Gagal membuat laporan")
        } finally {
            setGenerating(false)
        }
    }

    return (
        <div className="min-h-screen bg-slate-50">
            {/* Header */}
            <header className="sticky top-0 z-50 bg-blue-600 text-white shadow">
                <div className="mx-auto flex h-14 max-w-md items-center px-4 gap-4">
                    <button onClick={() => router.back()} className="p-1 hover:bg-white/10 rounded-full">
                        <ChevronLeft className="h-6 w-6" />
                    </button>
                    <h1 className="text-lg font-semibold">Laporan Keuangan</h1>
                </div>
            </header>

            <main className="mx-auto max-w-md px-4 pb-20 pt-4">
                {/* Info Box */}
                <div className="mb-6 p-4 rounded-2xl bg-blue-50 border border-blue-100 flex items-center gap-3">
                    <div className="h-10 w-10 flex-shrink-0 rounded-full bg-blue-100 text-blue-600 grid place-items-center">
                        <FileText className="h-5 w-5" />
                    </div>
                    <div className="text-sm text-blue-800 leading-tight">
                        Download dan preview laporan keuangan sekolah secara periodik
                    </div>
                </div>

                {/* Filters */}
                <div className="mb-6 space-y-4">
                    <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-500 flex items-center gap-1.5">
                            <Calendar className="h-3.5 w-3.5" />
                            FILTER PERIODE
                        </label>
                        <Input 
                            type="month" 
                            className="h-12 rounded-xl bg-white border-slate-200"
                            value={period}
                            onChange={(e) => setPeriod(e.target.value)}
                        />
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-500 flex items-center gap-1.5">
                            <Filter className="h-3.5 w-3.5" />
                            JENIS LAPORAN
                        </label>
                        <div className="grid grid-cols-4 gap-2">
                            {["ALL", "INCOME", "EXPENSE", "BALANCE"].map((t) => (
                                <button
                                    key={t}
                                    onClick={() => setSelectedType(t)}
                                    className={`h-9 text-[10px] font-bold rounded-lg border transition-all ${
                                        selectedType === t 
                                        ? "bg-blue-600 border-blue-600 text-white shadow-sm" 
                                        : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                                    }`}
                                >
                                    {t === "ALL" ? "SEMUA" : t === "INCOME" ? "MASUK" : t === "EXPENSE" ? "KELUAR" : "SALDO"}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Quick Actions (Generate) */}
                {!loading && (
                    <div className="mb-8 p-6 rounded-3xl border border-blue-100 bg-white shadow-sm space-y-4">
                        <div className="flex items-center gap-2">
                            <div className="h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
                            <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Update Laporan {formatPeriode(period)}</div>
                        </div>
                        <div className="grid grid-cols-1 gap-2 pt-1">
                            <Button 
                                onClick={() => handleGenerate("INCOME")} 
                                disabled={generating}
                                variant="outline"
                                className="h-11 rounded-xl border-dashed border-emerald-200 text-emerald-700 bg-emerald-50/30 hover:bg-emerald-50 font-bold text-xs justify-start px-4"
                            >
                                {generating ? <Loader2 className="animate-spin mr-2" /> : <Plus className="mr-2 h-4 w-4" />}
                                Buat Laporan Penerimaan (Masuk)
                            </Button>
                            <Button 
                                onClick={() => handleGenerate("EXPENSE")} 
                                disabled={generating}
                                variant="outline"
                                className="h-11 rounded-xl border-dashed border-rose-200 text-rose-700 bg-rose-50/30 hover:bg-rose-50 font-bold text-xs justify-start px-4"
                            >
                                {generating ? <Loader2 className="animate-spin mr-2" /> : <Plus className="mr-2 h-4 w-4" />}
                                Buat Laporan Pengeluaran (Keluar)
                            </Button>
                            <Button 
                                onClick={() => handleGenerate("BALANCE")} 
                                disabled={generating}
                                variant="outline"
                                className="h-11 rounded-xl border-dashed border-blue-200 text-blue-700 bg-blue-50/30 hover:bg-blue-50 font-bold text-xs justify-start px-4"
                            >
                                {generating ? <Loader2 className="animate-spin mr-2" /> : <Plus className="mr-2 h-4 w-4" />}
                                Buat Laporan Saldo (Kas)
                            </Button>
                        </div>
                        <p className="text-[10px] text-slate-400 italic text-center px-4">
                            *Klik untuk men-generate/update snapshot data terbaru sesuai sistem
                        </p>
                    </div>
                )}

                {/* Report List */}
                <div className="space-y-4">
                    <div className="text-xs font-bold text-slate-500">DAFTAR LAPORAN</div>
                    
                    {loading ? (
                        <div className="flex flex-col items-center py-20 gap-3 text-slate-400">
                            <Loader2 className="h-8 w-8 animate-spin" />
                            <span className="text-sm font-medium">Memuat data...</span>
                        </div>
                    ) : reports.length > 0 ? (
                        reports.map((r) => (
                            <Card key={r.id} className="rounded-2xl border-slate-100 shadow-[0_2px_16px_rgba(0,0,0,0.06)] overflow-hidden">
                                <CardContent className="p-4">
                                    <div className="flex items-start gap-4">
                                        <div className={`h-12 w-12 flex-shrink-0 rounded-xl grid place-items-center ${
                                            r.type === "INCOME" ? "bg-emerald-50 text-emerald-600" : 
                                            r.type === "EXPENSE" ? "bg-rose-50 text-rose-600" : "bg-blue-50 text-blue-600"
                                        }`}>
                                            <FileText className="h-6 w-6" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h3 className="font-bold text-slate-900 truncate tracking-tight">{r.title}</h3>
                                            <p className="text-xs text-slate-500 mt-1">Periode: {formatPeriode(r.period)}</p>
                                            <div className="flex items-center gap-3 mt-2">
                                                <div className="flex items-center gap-1 text-[10px] text-slate-400 font-medium tracking-wide">
                                                    <Calendar className="h-3 w-3" />
                                                    {new Date(r.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                                                </div>
                                                {/* <div className="h-1 w-1 rounded-full bg-slate-300" />
                                                <div className="text-[10px] text-slate-400 font-medium">{formatSize(r.size || 250000)}</div> */}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="mt-4 grid grid-cols-2 gap-3">
                                        <Link href={`/kepsek/laporan/preview/${r.id}`} className="flex-1">
                                            <Button variant="outline" className="w-full h-10 rounded-xl text-blue-600 border-blue-50 bg-blue-50 hover:bg-blue-100 font-bold text-xs">
                                                <Eye className="mr-2 h-4 w-4" />
                                                Preview
                                            </Button>
                                        </Link>
                                        <Link href={`/kepsek/laporan/preview/${r.id}?autoDownload=true`} className="flex-1">
                                            <Button className="w-full h-10 rounded-xl bg-blue-600 hover:bg-blue-700 font-bold text-xs">
                                                <Download className="mr-2 h-4 w-4" />
                                                Download
                                            </Button>
                                        </Link>
                                    </div>
                                </CardContent>
                            </Card>
                        ))
                    ) : (
                        <div className="py-20 text-center space-y-2">
                            <Search className="h-10 w-10 text-slate-200 mx-auto" />
                            <div className="text-sm font-medium text-slate-400">Tidak ada laporan ditemukan</div>
                        </div>
                    )}
                </div>
                
            </main>
        </div>
    )
}
