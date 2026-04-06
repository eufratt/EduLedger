"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { signOut } from "next-auth/react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
    Bell,
    LogOut,
    Clock3,
    CircleCheck,
    DollarSign,
    TrendingUp,
    CheckCircle2,
    FileText,
    BarChart3,
    BellRing,
} from "lucide-react"

type KepsekDashboardResponse = {
    user: { id: number; name: string; role: string }
    cards: {
        menungguPersetujuan: number
        disetujuiBulanIni: number
        totalAnggaran: number
        realisasiPercent: number
        fiscalYear: number
        unreadNotifications: number
    }
    persetujuanTertunda: {
        requests: Array<{
            id: number
            title: string
            amountRequested: number
            submittedBy: string | null
            createdAt: string
        }>
        rkabs: Array<{
            id: number
            code: string
            fiscalYear: number
            createdBy: string | null
            createdAt: string
        }>
    }
    highlight: null | {
        id: number
        title: string
        createdBy: string | null
        total: number
        status: "REVIEW"
    }
}

function formatIDR(n: number) {
    return "Rp " + n.toLocaleString("id-ID")
}

function formatCompactIDR(n: number) {
    const abs = Math.abs(n)
    if (abs >= 1_000_000_000) return `Rp ${Math.round(n / 1_000_000_000)} M`
    if (abs >= 1_000_000) return `Rp ${Math.round(n / 1_000_000)} Jt`
    if (abs >= 1_000) return `Rp ${Math.round(n / 1_000)} Rb`
    return formatIDR(n)
}

export default function KepsekDashboardPage() {
    const router = useRouter()
    const [data, setData] = useState<KepsekDashboardResponse | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        let cancelled = false

        async function load() {
            setLoading(true)
            setError(null)
            try {
                const res = await fetch("/api/kepsek/dashboard?requestsTake=5&rkabsTake=3", {
                    method: "GET",
                    credentials: "include",
                    headers: { "Content-Type": "application/json" },

                })

                if (res.status === 401) {
                    router.replace("/login")
                    return
                }
                if (res.status === 403) {
                    setError("Akses ditolak (bukan KEPSEK).")
                    return
                }
                if (!res.ok) {
                    const t = await res.text().catch(() => "")
                    throw new Error(t || `HTTP ${res.status}`)
                }

                const json = (await res.json()) as KepsekDashboardResponse
                if (!cancelled) setData(json)
            } catch (e: any) {
                if (!cancelled) setError(e?.message ?? "Gagal memuat dashboard")
            } finally {
                if (!cancelled) setLoading(false)
            }
        }

        load()
        return () => {
            cancelled = true
        }
    }, [router])

    const ui = useMemo(() => {
        const c = data?.cards
        return {
            name: data?.user.name ?? "Kepala Sekolah",
            notif: data?.cards.menungguPersetujuan ?? 0, // badge notif bisa dari pending
            menunggu: c?.menungguPersetujuan ?? 0,
            disetujui: c?.disetujuiBulanIni ?? 0,
            totalAnggaran: c?.totalAnggaran ?? 0,
            realisasi: c?.realisasiPercent ?? 0,
            fiscalYear: c?.fiscalYear ?? new Date().getFullYear(),
            unreadNotif: c?.unreadNotifications ?? 0,
            requests: data?.persetujuanTertunda.requests ?? [],
            rkabs: data?.persetujuanTertunda.rkabs ?? [],
            highlight: data?.highlight ?? null,
        }
    }, [data])

    return (
        <div className="min-h-screen bg-slate-50">
            {/* Topbar */}
            <header className="sticky top-0 z-50 bg-blue-600 text-white shadow">
                <div className="mx-auto flex h-14 max-w-md items-center justify-between px-4">
                    <h1 className="text-lg font-semibold">Dashboard Kepala Sekolah</h1>
                    <div className="flex items-center gap-3">
                        <Link href="/kepsek/notifikasi" className="relative grid h-9 w-9 place-items-center rounded-xl bg-white/15 hover:bg-white/20 transition">
                            <Bell className="h-5 w-5" />
                            {ui.unreadNotif > 0 && (
                                <span className="absolute -right-2 -top-2 grid h-5 min-w-5 place-items-center rounded-full bg-rose-500 px-1 text-xs font-semibold">
                                    {ui.unreadNotif}
                                </span>
                            )}
                        </Link>
                        <button
                            onClick={() => signOut({ callbackUrl: "/login" })}
                            className="grid h-9 w-9 place-items-center rounded-xl bg-white/15 hover:bg-white/20 transition"
                        >
                            <LogOut className="h-5 w-5" />
                        </button>
                    </div>
                </div>
            </header>

            <main className="mx-auto max-w-md px-4 pb-10 pt-4">
                {error && (
                    <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
                        {error}
                    </div>
                )}

                {/* Welcome (ungu) */}
                <div className="rounded-2xl bg-gradient-to-br from-violet-700 to-fuchsia-600 p-5 text-white shadow-[0_10px_28px_rgba(124,58,237,0.25)]">
                    <div className="text-sm/5 opacity-90">Selamat Datang,</div>
                    <div className="mt-1 text-2xl font-semibold">{loading ? "..." : ui.name}</div>
                    <div className="mt-2 text-sm/5 opacity-90">Pantau dan kelola keuangan sekolah</div>
                </div>

                {/* 4 cards */}
                <div className="mt-5 grid grid-cols-2 gap-4">
                    <Card className="rounded-2xl border-slate-100 shadow-[0_2px_16px_rgba(0,0,0,0.06)]">
                        <CardContent className="p-4">
                            <Clock3 className="h-6 w-6 text-amber-600" />
                            <div className="mt-3 text-2xl font-semibold">{loading ? "…" : ui.menunggu}</div>
                            <div className="mt-1 text-sm text-slate-700">Menunggu Persetujuan</div>
                        </CardContent>
                    </Card>

                    <Card className="rounded-2xl border-slate-100 shadow-[0_2px_16px_rgba(0,0,0,0.06)]">
                        <CardContent className="p-4">
                            <CircleCheck className="h-6 w-6 text-emerald-600" />
                            <div className="mt-3 text-2xl font-semibold">{loading ? "…" : ui.disetujui}</div>
                            <div className="mt-1 text-sm text-slate-700">Disetujui Bulan Ini</div>
                        </CardContent>
                    </Card>

                    <Card className="rounded-2xl border-slate-100 shadow-[0_2px_16px_rgba(0,0,0,0.06)]">
                        <CardContent className="p-4">
                            <DollarSign className="h-6 w-6 text-blue-600" />
                            <div className="mt-3 text-base font-semibold text-blue-700">
                                {loading ? "…" : formatCompactIDR(ui.totalAnggaran)}
                            </div>
                            <div className="mt-1 text-sm text-slate-700">Total Anggaran</div>
                        </CardContent>
                    </Card>

                    <Card className="rounded-2xl border-slate-100 shadow-[0_2px_16px_rgba(0,0,0,0.06)]">
                        <CardContent className="p-4">
                            <TrendingUp className="h-6 w-6 text-violet-600" />
                            <div className="mt-3 text-2xl font-semibold text-violet-700">
                                {loading ? "…" : `${ui.realisasi}%`}
                            </div>
                            <div className="mt-1 text-sm text-slate-700">Realisasi</div>
                        </CardContent>
                    </Card>
                </div>

                {/* Menu utama */}
                <div className="mt-6">
                    <div className="mb-3 text-slate-700 font-semibold">Menu Utama</div>
                    <div className="grid grid-cols-2 gap-4">
                        <Link href="/kepsek/persetujuan" className="block">
                            <Card className="rounded-2xl border-slate-100 shadow-[0_2px_16px_rgba(0,0,0,0.06)]">
                                <CardContent className="p-6 flex flex-col items-center gap-3">
                                    <div className="grid h-14 w-14 place-items-center rounded-2xl bg-blue-600 text-white">
                                        <CheckCircle2 className="h-7 w-7" />
                                    </div>
                                    <div className="text-sm font-medium text-center">Persetujuan Pengeluaran</div>
                                </CardContent>
                            </Card>
                        </Link>

                        <Link href="/kepsek/laporan" className="block">
                            <Card className="rounded-2xl border-slate-100 shadow-[0_2px_16px_rgba(0,0,0,0.06)]">
                                <CardContent className="p-6 flex flex-col items-center gap-3">
                                    <div className="grid h-14 w-14 place-items-center rounded-2xl bg-emerald-600 text-white">
                                        <FileText className="h-7 w-7" />
                                    </div>
                                    <div className="text-sm font-medium text-center">Laporan Keuangan</div>
                                </CardContent>
                            </Card>
                        </Link>

                        <Link href="/kepsek/rkas" className="block">
                            <Card className="rounded-2xl border-slate-100 shadow-[0_2px_16px_rgba(0,0,0,0.06)]">
                                <CardContent className="p-6 flex flex-col items-center gap-3">
                                    <div className="grid h-14 w-14 place-items-center rounded-2xl bg-violet-600 text-white">
                                        <BarChart3 className="h-7 w-7" />
                                    </div>
                                    <div className="text-sm font-medium text-center">Status RKAS</div>
                                </CardContent>
                            </Card>
                        </Link>

                        <Link href="/kepsek/notifikasi" className="block">
                            <Card className="rounded-2xl border-slate-100 shadow-[0_2px_16px_rgba(0,0,0,0.06)]">
                                <CardContent className="p-6 flex flex-col items-center gap-3">
                                    <div className="grid h-14 w-14 place-items-center rounded-2xl bg-orange-500 text-white">
                                        <BellRing className="h-7 w-7" />
                                    </div>
                                    <div className="text-sm font-medium text-center">Notifikasi</div>
                                </CardContent>
                            </Card>
                        </Link>
                    </div>
                </div>

                {/* Persetujuan tertunda */}
                <div className="mt-6 flex items-center justify-between">
                    <div className="text-slate-700 font-semibold">Persetujuan Tertunda</div>
                    <Link href="/kepsek/persetujuan" className="text-blue-600 text-sm font-medium">Lihat Semua</Link>
                </div>

                <div className="mt-3 space-y-3">
                    {/* Pending Requests */}
                    {ui.requests.map((r) => (
                        <Card key={`req-${r.id}`} className="rounded-2xl border-l-4 border-amber-400 border-slate-100 shadow-[0_2px_16px_rgba(0,0,0,0.06)]">
                            <CardContent className="p-4">
                                <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0">
                                        <div className="font-medium text-slate-900 truncate">{r.title}</div>
                                        <div className="mt-1 text-sm text-slate-600">{r.submittedBy ?? "-"}</div>
                                        <div className="mt-2 text-sm text-slate-700">{formatIDR(r.amountRequested)}</div>
                                    </div>
                                    <Badge className="rounded-full bg-amber-100 text-amber-700 hover:bg-amber-100 border-none px-2 py-0.5 text-[10px] font-bold">Pending</Badge>
                                </div>

                                <div className="mt-4 grid grid-cols-2 gap-3">
                                    <Button 
                                        className="h-10 rounded-xl bg-blue-50 text-blue-600 hover:bg-blue-100 border-none font-bold text-sm"
                                        onClick={() => router.push(`/kepsek/persetujuan/${r.id}?type=request`)}
                                    >
                                        Tinjau
                                    </Button>
                                    <Button 
                                        className="h-10 rounded-xl bg-emerald-600 text-white font-bold text-sm hover:bg-emerald-700"
                                        onClick={() => router.push(`/kepsek/persetujuan/${r.id}?type=request&action=approve`)}
                                    >
                                        Setujui
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    ))}

                    {/* Pending RKAS */}
                    {ui.rkabs.map((x) => (
                        <Card key={`rkab-${x.id}`} className="rounded-2xl border-l-4 border-purple-500 border-slate-100 shadow-[0_2px_16px_rgba(0,0,0,0.06)]">
                            <CardContent className="p-4">
                                <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                            <Badge className="bg-purple-100 text-purple-700 hover:bg-purple-100 border-none rounded-md px-1.5 py-0 text-[9px] uppercase font-bold">RKAS</Badge>
                                            <div className="font-medium text-slate-900 truncate">RKAS {x.fiscalYear}</div>
                                        </div>
                                        <div className="text-sm text-slate-600">{x.createdBy ?? "-"}</div>
                                        <div className="mt-1 text-xs text-blue-600 font-medium">{x.code}</div>
                                    </div>
                                    <Badge className="rounded-full bg-blue-100 text-blue-700 hover:bg-blue-100 border-none px-2 py-0.5 text-[10px] font-bold uppercase">Review</Badge>
                                </div>

                                <div className="mt-4 grid grid-cols-2 gap-3">
                                    <Button 
                                        className="h-10 rounded-xl bg-blue-50 text-blue-600 hover:bg-blue-100 border-none font-bold text-sm"
                                        onClick={() => router.push(`/kepsek/persetujuan/${x.id}?type=rkab`)}
                                    >
                                        Tinjau
                                    </Button>
                                    <Button 
                                        className="h-10 rounded-xl bg-emerald-600 text-white font-bold text-sm hover:bg-emerald-700"
                                        onClick={() => router.push(`/kepsek/persetujuan/${x.id}?type=rkab&action=approve`)}
                                    >
                                        Setujui
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    ))}

                    {/* RKAS highlight if no RKAS are listed or as a dedicated card */}
                    {ui.highlight && ui.rkabs.length === 0 && (
                        <Card className="rounded-2xl border-l-4 border-blue-500 border-slate-100 shadow-[0_2px_16px_rgba(0,0,0,0.06)]">
                            <CardContent className="p-4">
                                <div className="flex items-start justify-between gap-3">
                                    <div>
                                        <div className="font-medium text-slate-900">{ui.highlight.title}</div>
                                        <div className="mt-1 text-sm text-slate-600">{ui.highlight.createdBy ?? "-"}</div>
                                        <div className="mt-2 text-sm text-slate-700">Total: {formatIDR(ui.highlight.total)}</div>
                                    </div>
                                    <Badge className="rounded-full bg-blue-100 text-blue-700 hover:bg-blue-100 border-none px-2 py-0.5 text-[10px] font-bold">Review</Badge>
                                </div>

                                <Link
                                    href={`/kepsek/persetujuan/${ui.highlight.id}?type=rkab`}
                                    className="mt-4 block h-11 rounded-xl bg-blue-600 text-white font-semibold grid place-items-center hover:bg-blue-700 transition"
                                >
                                    Tinjau Detail
                                </Link>
                            </CardContent>
                        </Card>
                    )}
                </div>
            </main>
        </div>
    )
}