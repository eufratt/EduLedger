"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ChevronLeft, Check, X, FileText, Info, Library, ReceiptText } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

type ApprovalItem = {
    id: number
    title: string
    pengaju?: string
    createdBy?: string
    amountRequested?: number
    code?: string
    statusLabel: string
    createdAt: string
}

type ApprovalsResponse = {
    counts: { requests: number; rkabs: number }
    tab: "requests" | "rkabs"
    page: number
    take: number
    total: number
    items: ApprovalItem[]
}

function formatIDR(n: number) {
    return new Intl.NumberFormat("id-ID", {
        style: "currency",
        currency: "IDR",
        minimumFractionDigits: 0,
    }).format(n)
}

export default function KepsekApprovalsPage() {
    const router = useRouter()
    const [tab, setTab] = useState<"requests" | "rkabs">("requests")
    const [data, setData] = useState<ApprovalsResponse | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        async function fetchApprovals() {
            setLoading(true)
            setError(null)
            try {
                const res = await fetch(`/api/kepsek/approvals?tab=${tab}`, {
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
                setError(err.message || "Gagal memuat data")
            } finally {
                setLoading(false)
            }
        }

        fetchApprovals()
    }, [tab, router])

    return (
        <div className="min-h-screen bg-slate-50">
            {/* Topbar */}
            <header className="sticky top-0 z-50 bg-blue-600 text-white shadow">
                <div className="mx-auto flex h-14 max-w-md items-center px-4">
                    <button onClick={() => router.back()} className="mr-3">
                        <ChevronLeft className="h-6 w-6" />
                    </button>
                    <h1 className="text-lg font-semibold">Persetujuan Pengeluaran</h1>
                </div>
            </header>

            <main className="mx-auto max-w-md px-4 py-4">
                {/* Tabs */}
                <div className="flex bg-slate-100 p-1 rounded-xl mb-6">
                    <button
                        onClick={() => setTab("requests")}
                        className={`flex-1 py-2.5 text-sm font-semibold rounded-lg transition-all ${
                            tab === "requests"
                                ? "bg-blue-600 text-white shadow-sm"
                                : "text-slate-600 hover:bg-slate-200"
                        }`}
                    >
                        Permintaan Dana ({data?.counts.requests ?? 0})
                    </button>
                    <button
                        onClick={() => setTab("rkabs")}
                        className={`flex-1 py-2.5 text-sm font-semibold rounded-lg transition-all ${
                            tab === "rkabs"
                                ? "bg-blue-600 text-white shadow-sm"
                                : "text-slate-600 hover:bg-slate-200"
                        }`}
                    >
                        RKAS ({data?.counts.rkabs ?? 0})
                    </button>
                </div>

                {error && (
                    <div className="mb-4 p-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-sm">
                        {error}
                    </div>
                )}

                {loading ? (
                    <div className="space-y-4">
                        {[1, 2, 3].map((i) => (
                            <div key={i} className="h-40 bg-slate-200 rounded-2xl animate-pulse" />
                        ))}
                    </div>
                ) : (
                    <div className="space-y-4">
                        {data?.items.length === 0 ? (
                            <div className="text-center py-20">
                                <FileText className="h-12 w-12 text-slate-300 mx-auto mb-3" />
                                <p className="text-slate-500 font-medium">Tidak ada permintaan menunggu</p>
                            </div>
                        ) : (
                                data?.items.map((item) => (
                                    <Card
                                        key={item.id}
                                        className={`rounded-2xl border-l-[6px] shadow-sm overflow-hidden ${
                                            tab === "rkabs" ? "border-purple-500" : "border-amber-400"
                                        }`}
                                    >
                                        <CardContent className="p-4 flex gap-4">
                                            <div className={`mt-1 flex-shrink-0 w-12 h-12 rounded-2xl grid place-items-center ${
                                                tab === "rkabs" ? "bg-purple-50 text-purple-600" : "bg-amber-50 text-amber-600"
                                            }`}>
                                                {tab === "rkabs" ? <Library className="h-6 w-6" /> : <ReceiptText className="h-6 w-6" />}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex justify-between items-start mb-2">
                                                    <div className="min-w-0">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        {tab === "rkabs" && (
                                                            <Badge className="bg-purple-100 text-purple-700 hover:bg-purple-100 border-none rounded-sm px-1 py-0 text-[9px] uppercase font-black">
                                                                RKAS
                                                            </Badge>
                                                        )}
                                                        <h3 className="font-bold text-slate-900 truncate leading-tight">{item.title}</h3>
                                                    </div>
                                                    <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-1">
                                                        <span className="font-medium">{item.pengaju || item.createdBy}</span>
                                                        <span>•</span>
                                                        <span>{new Date(item.createdAt).toLocaleDateString("id-ID", { day: 'numeric', month: 'short' })}</span>
                                                    </div>
                                                </div>
                                                <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100 border-none rounded-lg px-2 text-[10px] uppercase font-bold tracking-wider">
                                                    {item.statusLabel}
                                                </Badge>
                                            </div>

                                            {item.amountRequested !== undefined && (
                                                <div className="mt-3">
                                                    <p className="text-lg font-bold text-slate-800">
                                                        {formatIDR(item.amountRequested)}
                                                    </p>
                                                </div>
                                            )}

                                            {item.code && (
                                                <div className="mt-1">
                                                    <p className="text-sm font-medium text-blue-600">
                                                        {item.code}
                                                    </p>
                                                </div>
                                            )}

                                            <div className="mt-5 grid grid-cols-3 gap-2">
                                                <Link
                                                    href={`/kepsek/persetujuan/${item.id}?type=${tab === "rkabs" ? "rkab" : "request"}`}
                                                    className="block"
                                                >
                                                    <Button
                                                        variant="secondary"
                                                        className="w-full bg-blue-50 text-blue-600 hover:bg-blue-100 border-none rounded-xl h-11 text-sm font-bold"
                                                    >
                                                        Tinjau
                                                    </Button>
                                                </Link>
                                                <Button
                                                    className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl h-11 text-sm font-bold"
                                                    onClick={() =>
                                                        router.push(
                                                            `/kepsek/persetujuan/${item.id}?type=${
                                                                tab === "rkabs" ? "rkab" : "request"
                                                            }&action=approve`
                                                        )
                                                    }
                                                >
                                                    Setujui
                                                </Button>
                                                <Button
                                                    className="bg-rose-600 hover:bg-rose-700 text-white rounded-xl h-11 text-sm font-bold"
                                                    onClick={() =>
                                                        router.push(
                                                            `/kepsek/persetujuan/${item.id}?type=${
                                                                tab === "rkabs" ? "rkab" : "request"
                                                            }&action=reject`
                                                        )
                                                    }
                                                >
                                                    Tolak
                                                </Button>
                                            </div>
                                        </div>
                                    </CardContent>
                                    </Card>
                                ))
                        )}
                    </div>
                )}
            </main>
        </div>
    )
}
