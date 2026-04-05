"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { ChevronLeft, ReceiptText, Search, LayoutDashboard } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"

type RequestItem = {
    id: number
    title: string
    amount: number
    requester: string
    date: string
    status: string
}

type Counts = {
    ready: number
    done: number
}

function formatIDR(n: number) {
    return new Intl.NumberFormat("id-ID", {
        style: "currency",
        currency: "IDR",
        minimumFractionDigits: 0,
    }).format(n)
}

export default function BendaharaPencairanPage() {
    const router = useRouter()
    const [tab, setTab] = useState<"ready" | "done">("ready")
    const [items, setItems] = useState<RequestItem[]>([])
    const [counts, setCounts] = useState<Counts>({ ready: 0, done: 0 })
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [searchQuery, setSearchQuery] = useState("")

    useEffect(() => {
        async function fetchData() {
            setLoading(true)
            setError(null)
            try {
                const res = await fetch(`/api/bendahara/pencairan?tab=${tab}`)
                if (!res.ok) throw new Error("Gagal mengambil data")
                const data = await res.json()
                setItems(data.items)
                setCounts(data.counts)
            } catch (err: any) {
                setError(err.message)
            } finally {
                setLoading(false)
            }
        }
        fetchData()
    }, [tab])

    const filteredItems = items.filter((i) =>
        i.title.toLowerCase().includes(searchQuery.toLowerCase())
    )

    return (
        <div className="min-h-screen bg-slate-50">
            {/* Topbar */}
            <header className="sticky top-0 z-50 bg-blue-600 text-white shadow-lg">
                <div className="mx-auto flex h-16 max-w-md items-center px-4">
                    <button onClick={() => router.back()} className="mr-3 p-2 hover:bg-blue-500 rounded-full transition-colors">
                        <ChevronLeft className="h-6 w-6" />
                    </button>
                    <h1 className="text-xl font-bold tracking-tight">Pencairan Dana</h1>
                </div>
            </header>

            <main className="mx-auto max-w-md px-4 py-6 space-y-6">
                {/* Search Bar */}
                <div className="relative group">
                    <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-slate-400 group-focus-within:text-blue-500 transition-colors">
                        <Search className="h-4 w-4" />
                    </div>
                    <Input
                        type="text"
                        placeholder="Cari pengajuan..."
                        className="pl-10 pr-4 h-12 bg-white border-slate-200 rounded-2xl focus-visible:ring-blue-500 shadow-sm transition-all"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>

                {/* Tabs */}
                <div className="flex bg-slate-100 p-1.5 rounded-2xl shadow-inner border border-slate-200">
                    <button
                        onClick={() => setTab("ready")}
                        className={`flex-1 py-3 text-sm font-bold rounded-xl transition-all ${
                            tab === "ready"
                                ? "bg-blue-600 text-white shadow-md transform scale-[1.02]"
                                : "text-slate-500 hover:bg-slate-200"
                        }`}
                    >
                        Siap Dicairkan ({counts.ready})
                    </button>
                    <button
                        onClick={() => setTab("done")}
                        className={`flex-1 py-3 text-sm font-bold rounded-xl transition-all ${
                            tab === "done"
                                ? "bg-blue-600 text-white shadow-md transform scale-[1.02]"
                                : "text-slate-500 hover:bg-slate-200"
                        }`}
                    >
                        Sudah Dicairkan ({counts.done})
                    </button>
                </div>

                {error && (
                    <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-2xl text-sm font-medium animate-in fade-in slide-in-from-top-1">
                        {error}
                    </div>
                )}

                {loading ? (
                    <div className="space-y-4">
                        {[1, 2, 3].map((i) => (
                            <div key={i} className="h-40 bg-white rounded-3xl animate-pulse shadow-sm border border-slate-100" />
                        ))}
                    </div>
                ) : (
                    <div className="space-y-4">
                        {filteredItems.length === 0 ? (
                            <div className="text-center py-24 bg-white rounded-3xl border border-dashed border-slate-200">
                                <ReceiptText className="h-16 w-16 text-slate-200 mx-auto mb-4" />
                                <p className="text-slate-400 font-medium">Tidak ada data ditemukan</p>
                            </div>
                        ) : (
                            filteredItems.map((item) => (
                                <Card
                                    key={item.id}
                                    className="rounded-3xl border-none shadow-sm hover:shadow-md transition-shadow cursor-pointer overflow-hidden group"
                                    onClick={() => router.push(`/bendahara/pencairan-dana/${item.id}`)}
                                >
                                    <CardContent className="p-5 flex gap-4">
                                        <div className={`flex-shrink-0 w-14 h-14 rounded-2xl grid place-items-center transition-colors ${
                                            tab === "ready" ? "bg-amber-50 text-amber-600 group-hover:bg-amber-100" : "bg-emerald-50 text-emerald-600 group-hover:bg-emerald-100"
                                        }`}>
                                            <ReceiptText className="h-7 w-7" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex justify-between items-start mb-2">
                                                <div className="min-w-0 max-w-[70%]">
                                                    <h3 className="font-bold text-slate-900 group-hover:text-blue-600 transition-colors truncate">
                                                        {item.title}
                                                    </h3>
                                                    <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-1">
                                                        <span className="font-semibold text-slate-600">{item.requester}</span>
                                                        <span>•</span>
                                                        <span>{new Date(item.date).toLocaleDateString("id-ID", { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                                                    </div>
                                                </div>
                                                <Badge className={`rounded-xl px-2.5 py-1 text-[10px] uppercase font-black tracking-wider border-none shadow-sm ${
                                                    tab === "ready" 
                                                        ? "bg-amber-100 text-amber-700" 
                                                        : "bg-emerald-100 text-emerald-700"
                                                }`}>
                                                    {tab === "ready" ? "Disetujui" : "Dicairkan"}
                                                </Badge>
                                            </div>

                                            <div className="mt-4 flex items-center justify-between">
                                                <p className="text-xl font-black text-slate-900">
                                                    {formatIDR(item.amount)}
                                                </p>
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
