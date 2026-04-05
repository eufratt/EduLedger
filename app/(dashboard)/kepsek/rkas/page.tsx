"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { ChevronLeft, LayoutDashboard, FileText, ChevronRight, TrendingUp, DollarSign, Loader2, Eye } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

type RkasItem = {
    id: number
    code: string
    fiscalYear: number
    status: string
    totalAmount: number
    usedAmount: number
    realisasiPercent: number
    createdAt: string
    createdBy: string
}

type RkasResponse = {
    metrics: {
        activeAnggaran: number
        activeRealisasi: number
        realisasiPercent: number
    }
    items: RkasItem[]
}

function formatIDR(n: number) {
    return new Intl.NumberFormat("id-ID", {
        style: "currency",
        currency: "IDR",
        minimumFractionDigits: 0,
    }).format(n)
}

function formatCompactIDR(n: number) {
    const abs = Math.abs(n)
    if (abs >= 1_000_000_000) return `Rp ${Math.round(n / 1_000_000_000)} Miliar`
    if (abs >= 1_000_000) return `Rp ${Math.round(n / 1_000_000)} Juta`
    return formatIDR(n)
}

function formatDate(dateStr: string) {
    const d = new Date(dateStr)
    return d.toLocaleDateString("id-ID", {
        day: "numeric",
        month: "short",
        year: "numeric",
    })
}

export default function KepsekRkasStatusPage() {
    const router = useRouter()
    const [data, setData] = useState<RkasResponse | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        async function fetchRkas() {
            setLoading(true)
            setError(null)
            try {
                const res = await fetch("/api/kepsek/rkas", {
                    method: "GET",
                    headers: { "Content-Type": "application/json" },
                })

                if (res.status === 401) {
                    router.replace("/login")
                    return
                }

                if (!res.ok) {
                    throw new Error(`Error: ${res.status}`)
                }

                const json = await res.json()
                setData(json)
            } catch (err: any) {
                setError(err.message || "Gagal memuat data RKAS")
            } finally {
                setLoading(false)
            }
        }

        fetchRkas()
    }, [router])

    return (
        <div className="min-h-screen bg-slate-50 pb-10">
            {/* Topbar */}
            <header className="sticky top-0 z-50 bg-blue-600 text-white shadow">
                <div className="mx-auto flex h-14 max-w-md items-center px-4">
                    <button onClick={() => router.back()} className="mr-3 p-1 rounded-full hover:bg-white/10 transition">
                        <ChevronLeft className="h-6 w-6" />
                    </button>
                    <h1 className="text-lg font-semibold">Status RKAS</h1>
                </div>
            </header>

            <main className="mx-auto max-w-md px-4 py-4 space-y-6">
                {/* Banner */}
                <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center text-blue-600 shrink-0">
                        <LayoutDashboard className="h-5 w-5" />
                    </div>
                    <p className="text-sm text-blue-800 font-medium leading-relaxed">
                        Pantau status dan realisasi RKAS sekolah secara real-time
                    </p>
                </div>

                {/* Metrics */}
                <div className="grid grid-cols-2 gap-4">
                    <Card className="rounded-2xl border-none shadow-[0_2px_12px_rgba(0,0,0,0.04)] overflow-hidden">
                        <CardContent className="p-4 bg-white border-t-4 border-violet-500">
                            <TrendingUp className="h-5 w-5 text-violet-500 mb-3" />
                            <div className="text-2xl font-bold text-slate-900">{loading ? "..." : `${data?.metrics.realisasiPercent}%`}</div>
                            <div className="text-xs text-slate-500 font-semibold mt-1 uppercase tracking-wider">Realisasi Aktif</div>
                        </CardContent>
                    </Card>

                    <Card className="rounded-2xl border-none shadow-[0_2px_12px_rgba(0,0,0,0.04)] overflow-hidden">
                        <CardContent className="p-4 bg-white border-t-4 border-emerald-500">
                            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 mb-3 grid place-items-center">
                                <DollarSign className="h-5 w-5" />
                            </div>
                            <div className="text-2xl font-bold text-slate-900">{loading ? "..." : formatCompactIDR(data?.metrics.activeAnggaran || 0)}</div>
                            <div className="text-xs text-slate-500 font-semibold mt-1 uppercase tracking-wider">Anggaran Aktif</div>
                        </CardContent>
                    </Card>
                </div>

                {/* List Section Header */}
                <div className="flex items-center justify-between pb-1">
                    <h2 className="text-slate-800 font-bold text-base">Daftar RKAS</h2>
                </div>

                {error && (
                    <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-sm font-medium">
                        {error}
                    </div>
                )}

                {loading ? (
                    <div className="space-y-4">
                        {[1, 2, 3].map((i) => (
                            <div key={i} className="h-40 bg-slate-100 rounded-2xl animate-pulse" />
                        ))}
                    </div>
                ) : (
                    <div className="space-y-4">
                        {data?.items.map((item) => (
                            <Card key={item.id} className="rounded-2xl border-none shadow-[0_2px_16px_rgba(0,0,0,0.05)] overflow-hidden relative">
                                <CardContent className="p-5">
                                    <div className="flex items-start gap-4">
                                        <div className="w-12 h-12 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center shrink-0">
                                            <FileText className="h-6 w-6" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex justify-between items-start mb-1">
                                                <div>
                                                    <h3 className="text-slate-900 font-bold">RKAS {item.fiscalYear}/{item.fiscalYear + 1}</h3>
                                                    <p className="text-sm text-slate-500 font-medium">Total: {formatIDR(item.totalAmount)}</p>
                                                </div>
                                                <Badge className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase border-none ${
                                                    item.status === "APPROVED" ? "bg-emerald-100 text-emerald-700" :
                                                    item.status === "SELESAI" ? "bg-slate-100 text-slate-600" :
                                                    item.status === "SUBMITTED" ? "bg-amber-100 text-amber-700" :
                                                    "bg-rose-100 text-rose-700"
                                                }`}>
                                                    {item.status === "APPROVED" ? "Disetujui" :
                                                     item.status === "SELESAI" ? "Selesai" :
                                                     item.status === "SUBMITTED" ? "Menunggu" : "Ditolak"}
                                                </Badge>
                                            </div>

                                            {/* Progress Bar for Approved/Done */}
                                            {(item.status === "APPROVED" || item.status === "SELESAI") && (
                                                <div className="mt-4">
                                                    <div className="flex justify-between items-center text-[11px] mb-1.5">
                                                        <span className="text-slate-500 font-bold uppercase tracking-wide">Realisasi</span>
                                                        <span className="text-blue-600 font-black">{item.realisasiPercent}%</span>
                                                    </div>
                                                    <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                                                        <div 
                                                            className={`h-full transition-all duration-500 ${item.status === "SELESAI" ? "bg-slate-400" : "bg-blue-600"}`}
                                                            style={{ width: `${item.realisasiPercent}%` }}
                                                        />
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    
                                    <div className="mt-4 pt-4 border-t border-slate-50 flex items-center justify-between">
                                        <div className="text-[11px] text-slate-400 font-medium">
                                            Dibuat: {formatDate(item.createdAt)}
                                        </div>
                                        <button 
                                            onClick={() => router.push(`/kepsek/persetujuan/${item.id}?type=rkab`)}
                                            className="w-8 h-8 rounded-lg hover:bg-slate-50 flex items-center justify-center text-slate-400 transition"
                                        >
                                            <Eye className="h-4 w-4" />
                                        </button>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}
            </main>
        </div>
    )
}
