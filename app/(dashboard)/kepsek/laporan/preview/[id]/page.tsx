"use client"

import { useEffect, useState, useMemo, use } from "react"
import { useRouter } from "next/navigation"
import dynamic from "next/dynamic"
import { 
    ChevronLeft, 
    Download, 
    FileText, 
    Calendar,
    ArrowRight,
    Loader2
} from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import { ReportDocument } from "@/components/reports/report-document"
import { SuccessModal } from "@/components/reports/success-modal"

// Dynamically import PDF components for browser-only use
const PDFDownloadLink = dynamic(
    () => import("@react-pdf/renderer").then((mod) => mod.PDFDownloadLink),
    { ssr: false, loading: () => <Loader2 className="animate-spin h-5 w-5" /> }
)

type ReportDetail = {
    id: number
    title: string
    type: string
    period: string
    createdAt: string
    summary: any
    fileName?: string
}

function formatIDR(n: number) {
    return "Rp " + n.toLocaleString("id-ID")
}

function formatPeriode(p: string) {
    if (!p) return ""
    const [y, m] = p.split("-")
    const months = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"]
    return `${months[parseInt(m) - 1]} ${y}`
}

export default function KepsekReportPreviewPage({ 
    params,
    searchParams: searchParamsPromise 
}: { 
    params: Promise<{ id: string }>,
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
    const router = useRouter()
    
    // Unwrap Promises in Next.js 15+
    const resolvedParams = use(params)
    const resolvedSearchParams = use(searchParamsPromise)
    
    const id = resolvedParams.id
    const isAutoDownload = resolvedSearchParams?.autoDownload === "true"

    const [report, setReport] = useState<ReportDetail | null>(null)
    const [loading, setLoading] = useState(true)
    const [showSuccess, setShowSuccess] = useState(false)
    const [downloading, setDownloading] = useState(false)

    useEffect(() => {
        async function load() {
            try {
                const res = await fetch(`/api/kepsek/reports/${id}`)
                if (!res.ok) throw new Error("Gagal memuat detail laporan")
                const data = await res.json()
                setReport(data)
            } catch (err) {
                toast.error("Gagal memuat laporan")
                router.back()
            } finally {
                setLoading(false)
            }
        }
        if (id) load()
    }, [id, router])

    useEffect(() => {
        if (!loading && report && isAutoDownload && !downloading) {
            // Give a small delay for react-pdf to prepare the blob
            const timer = setTimeout(() => {
                const btn = document.querySelector("#pdf-download-trigger") as HTMLButtonElement
                if (btn) {
                    btn.click()
                    setDownloading(true)
                }
            }, 1500)
            return () => clearTimeout(timer)
        }
    }, [loading, report, isAutoDownload, downloading])

    const breakdown = useMemo(() => {
        if (!report?.summary?.breakdown) return []
        return report.summary.breakdown
    }, [report])

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50">
                <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
            </div>
        )
    }

    if (!report) return null

    const isBalance = report.type === "BALANCE"
    const isIncome = report.type === "INCOME"

    return (
        <div className="min-h-screen bg-slate-50">
            {/* Header */}
            <header className="sticky top-0 z-50 bg-blue-600 text-white shadow">
                <div className="mx-auto flex h-14 max-w-md items-center px-4 gap-4">
                    <button onClick={() => router.back()} className="p-1 hover:bg-white/10 rounded-full">
                        <ChevronLeft className="h-6 w-6" />
                    </button>
                    <h1 className="text-lg font-semibold">Preview Laporan</h1>
                </div>
            </header>

            <main className="mx-auto max-w-md px-4 pb-20 pt-4">
                {/* Info Card */}
                <Card className="rounded-2xl border-slate-100 shadow-[0_2px_16px_rgba(0,0,0,0.06)] mb-6">
                    <CardContent className="p-5">
                        <h2 className="text-lg font-bold text-slate-900 leading-tight mb-2">{report.title}</h2>
                        <div className="space-y-1.5 pt-2">
                            <div className="flex items-center gap-2 text-sm text-slate-500">
                                <Calendar className="h-4 w-4" />
                                <span>Periode: {formatPeriode(report.period)}</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-slate-500">
                                <Calendar className="h-4 w-4" />
                                <span>Dibuat: {new Date(report.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* PDF Live View Placeholder (Mockup 2 style) */}
                <div className="bg-white rounded-3xl border border-slate-200 p-8 flex flex-col items-center text-center gap-4 mb-6 shadow-sm border-dashed">
                    <div className="h-20 w-16 bg-slate-50 border-2 border-slate-100 rounded-lg relative overflow-hidden flex flex-col p-2 gap-1">
                        <div className="h-1.5 w-full bg-slate-200 rounded" />
                        <div className="h-1 w-3/4 bg-slate-100 rounded" />
                        <div className="h-3 w-full bg-blue-50 mt-2 rounded" />
                        <div className="h-1 w-full bg-slate-100 rounded" />
                        <div className="h-1 w-5/6 bg-slate-100 rounded" />
                    </div>
                    <div>
                        <h3 className="font-bold text-slate-800">Preview Laporan PDF</h3>
                        <p className="text-xs text-slate-500 leading-relaxed max-w-[200px] mt-1">
                            {report.title} untuk periode {formatPeriode(report.period)}
                        </p>
                    </div>
                </div>

                {/* Summary Section (Mockup 2) */}
                <div className="space-y-4">
                    <h3 className="text-sm font-bold text-slate-700">Ringkasan</h3>
                    <div className="space-y-3">
                        {!isBalance ? (
                            breakdown.map((item: any, i: number) => (
                                <div key={i} className="bg-white p-4 rounded-xl shadow-sm flex items-center justify-between border border-slate-100">
                                    <span className="text-sm font-medium text-slate-700">{item.name}</span>
                                    <span className="text-sm font-bold text-slate-900">{formatIDR(item.amount)}</span>
                                </div>
                            ))
                        ) : (
                            <>
                                <div className="bg-white p-4 rounded-xl shadow-sm flex items-center justify-between border border-slate-100">
                                    <span className="text-sm font-medium text-slate-700">Total Penerimaan</span>
                                    <span className="text-sm font-bold text-emerald-600">{formatIDR(report.summary.income)}</span>
                                </div>
                                <div className="bg-white p-4 rounded-xl shadow-sm flex items-center justify-between border border-slate-100">
                                    <span className="text-sm font-medium text-slate-700">Total Pengeluaran</span>
                                    <span className="text-sm font-bold text-rose-600">{formatIDR(report.summary.expense)}</span>
                                </div>
                            </>
                        )}
                        <div className="bg-blue-50 p-4 rounded-xl shadow-sm flex items-center justify-between border border-blue-100">
                            <span className="text-sm font-bold text-blue-800">
                                {isBalance ? "Total Saldo" : isIncome ? "Total Penerimaan" : "Total Pengeluaran"}
                            </span>
                            <span className="text-lg font-black text-blue-700">
                                {formatIDR(isBalance ? report.summary.balance : report.summary.total)}
                            </span>
                        </div>
                    </div>
                </div>

                {/* PDF Link (Floating Button) */}
                <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/80 backdrop-blur-md border-t border-slate-100 z-40">
                    <div className="mx-auto max-w-md">
                        <PDFDownloadLink
                            document={<ReportDocument report={report} />}
                            fileName={report.fileName || `${report.type}_${report.period}.pdf`}
                            style={{ textDecoration: 'none', width: '100%' }}
                        >
                            {({ blob, url, loading, error }) => (
                                <Button 
                                    id="pdf-download-trigger"
                                    className="w-full h-12 rounded-2xl bg-blue-600 hover:bg-blue-700 font-bold text-sm shadow-lg shadow-blue-200 transition-all border-none"
                                    disabled={loading}
                                    onClick={() => {
                                        if (!loading) {
                                            setTimeout(() => setShowSuccess(true), 500)
                                        }
                                    }}
                                >
                                    {loading ? (
                                        <Loader2 className="animate-spin h-5 w-5 mr-2" />
                                    ) : (
                                        <Download className="mr-2 h-5 w-5" />
                                    )}
                                    {loading ? "Menyiapkan PDF..." : "Download PDF"}
                                </Button>
                            )}
                        </PDFDownloadLink>
                    </div>
                </div>
            </main>

            {/* Success Modal */}
            <SuccessModal 
                open={showSuccess} 
                onOpenChange={setShowSuccess} 
                message="Laporan berhasil didownload" 
            />
        </div>
    )
}
