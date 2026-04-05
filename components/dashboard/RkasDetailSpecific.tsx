"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Calendar, CheckCircle2, Circle } from "lucide-react"

type ActivityDetail = {
    id: number
    nama: string
    amountAllocated: number
    usedAmount: number
    note: string | null
}

type RkasDetailProps = {
    data: {
        id: number
        title: string
        pengaju: string
        totalAnggaran: number
        totalRealisasi: number
        status: string
        fiscalYear: number
        submittedAt: string | null
        approvedAt: string | null
        rincian: ActivityDetail[]
    }
}

function formatIDR(n: number) {
    return new Intl.NumberFormat("id-ID", {
        style: "currency",
        currency: "IDR",
        minimumFractionDigits: 0,
    }).format(n)
}

function formatDate(dateStr: string | null) {
    if (!dateStr) return "-"
    const d = new Date(dateStr)
    return d.toLocaleDateString("id-ID", {
        day: "numeric",
        month: "short",
        year: "numeric",
    })
}

export function RkasDetailSpecific({ data }: RkasDetailProps) {
    const totalPercent = data.totalAnggaran > 0 
        ? Math.round((data.totalRealisasi / data.totalAnggaran) * 100) 
        : 0

    return (
        <div className="space-y-6">
            {/* Header Summary Card */}
            <Card className="rounded-2xl shadow-sm border-none overflow-hidden">
                <CardContent className="p-6">
                    <div className="flex justify-between items-start mb-4">
                        <div>
                            <h3 className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">RKAS Tahun Ajaran</h3>
                            <p className="text-lg font-bold text-slate-900">
                                {data.fiscalYear ? `${data.fiscalYear}/${data.fiscalYear + 1}` : "Detail RKAS"}
                            </p>
                        </div>
                        <Badge className={`rounded-full px-3 py-0.5 text-[10px] font-bold uppercase border-none ${
                            data.status === "APPROVED" ? "bg-emerald-100 text-emerald-700 font-black" : "bg-amber-100 text-amber-700 font-black"
                        }`}>
                            {data.status === "APPROVED" ? "Disetujui" : "Menunggu"}
                        </Badge>
                    </div>

                    <div className="space-y-3">
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-slate-500 font-medium">Total Anggaran:</span>
                            <span className="text-slate-900 font-bold">{formatIDR(data.totalAnggaran)}</span>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-slate-500 font-medium">Realisasi:</span>
                            <span className="text-emerald-600 font-bold">{formatIDR(data.totalRealisasi)}</span>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-slate-500 font-medium">Persentase:</span>
                            <span className="text-blue-600 font-black">{totalPercent}%</span>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Overall Progress Banner */}
            <Card className="rounded-2xl shadow-sm border-none overflow-hidden">
                <CardContent className="p-6">
                    <h3 className="text-slate-900 font-bold text-sm mb-4">Progress Realisasi</h3>
                    <div className="h-4 w-full bg-slate-100 rounded-full overflow-hidden mb-3">
                        <div 
                            className="h-full bg-blue-600 transition-all duration-700" 
                            style={{ width: `${totalPercent}%` }}
                        />
                    </div>
                    <div className="text-center text-sm font-bold text-slate-500">
                        {totalPercent}% Terealisasi
                    </div>
                </CardContent>
            </Card>

            {/* Timeline Section */}
            <Card className="rounded-2xl shadow-sm border-none overflow-hidden">
                <CardContent className="p-6">
                    <h3 className="text-slate-900 font-bold text-sm mb-4">Timeline</h3>
                    <div className="space-y-6">
                        <div className="flex gap-4">
                            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 border border-blue-100">
                                <Calendar className="h-5 w-5" />
                            </div>
                            <div>
                                <p className="text-sm font-bold text-slate-900">Dibuat</p>
                                <p className="text-xs text-slate-500 font-medium">{formatDate(data.submittedAt)}</p>
                            </div>
                        </div>
                        {data.status === "APPROVED" && (
                            <div className="flex gap-4">
                                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-100">
                                    <CheckCircle2 className="h-5 w-5" />
                                </div>
                                <div>
                                    <p className="text-sm font-bold text-slate-900">Disetujui</p>
                                    <p className="text-xs text-slate-500 font-medium">{formatDate(data.approvedAt)}</p>
                                </div>
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* Activity Listing */}
            <div>
                <h3 className="text-slate-900 font-bold text-base mb-4 px-1">Rincian Kegiatan</h3>
                <div className="space-y-4">
                    {data.rincian.map((it) => {
                        const itPercent = it.amountAllocated > 0 
                            ? Math.round((it.usedAmount / it.amountAllocated) * 100) 
                            : 0
                        return (
                            <Card key={it.id} className="rounded-2xl shadow-sm border border-slate-100 overflow-hidden bg-white">
                                <CardContent className="p-5">
                                    <div className="flex justify-between items-start mb-3">
                                        <h4 className="text-slate-900 font-bold pr-2">{it.nama}</h4>
                                        <Badge className={`rounded-full px-2 py-0 h-5 text-[9px] uppercase font-bold border-none shrink-0 ${
                                            it.usedAmount > 0 
                                                ? "bg-emerald-100 text-emerald-700" 
                                                : "bg-slate-100 text-slate-400"
                                        }`}>
                                            {it.usedAmount > 0 ? "Dicairkan" : "Belum Cair"}
                                        </Badge>
                                    </div>
                                    <div className="flex justify-between items-center text-xs mb-3">
                                        <span className="text-slate-400 font-medium">Anggaran:</span>
                                        <span className="text-slate-900 font-bold">{formatIDR(it.amountAllocated)}</span>
                                    </div>
                                    <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden mb-1">
                                        <div 
                                            className={`h-full transition-all duration-700 ${it.usedAmount > 0 ? "bg-emerald-500" : "bg-slate-300"}`} 
                                            style={{ width: `${it.usedAmount > 0 ? 100 : 0}%` }}
                                        />
                                    </div>
                                    <div className="text-right text-[9px] font-black text-slate-400">
                                        {it.usedAmount > 0 ? "100%" : "0%"}
                                    </div>
                                </CardContent>
                            </Card>
                        )
                    })}
                </div>
            </div>
        </div>
    )
}
