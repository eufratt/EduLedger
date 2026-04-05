"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { signOut } from "next-auth/react"

import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Bell,
  LogOut,
  Wallet,
  ArrowDownCircle,
  ArrowUpCircle,
  DollarSign,
  TrendingDown,
  FileText,
  Receipt,
} from "lucide-react"

type BendaharaDashboardResponse = {
  user: { name: string }
  summary: {
    totalSaldo: number
    danaMasuk12M: number
    danaKeluar12M: number
    siapCairCount: number
    siapCairTotal: number
    buktiKurangCount: number
    unreadNotif: number
  }
}

type RkabBasic = {
  id: number
  code: string
  fiscalYear: number
  status: string
  createdAt: string
  _count?: { items: number }
}

function formatCompactIDR(n: number) {
  const abs = Math.abs(n)
  if (abs >= 1_000_000_000) return `Rp ${Math.round(n / 1_000_000_000)} M`
  if (abs >= 1_000_000) return `Rp ${Math.round(n / 1_000_000)} Jt`
  if (abs >= 1_000) return `Rp ${Math.round(n / 1_000)} Rb`
  return `Rp ${Math.round(n)}`
}

function formatIDR(n: number) {
  return "Rp " + n.toLocaleString("id-ID")
}

function SummaryRow({
  icon,
  title,
  value,
  bg,
  valueClass,
}: {
  icon: React.ReactNode
  title: string
  value: string
  bg: string
  valueClass: string
}) {
  return (
    <div className={`flex items-center gap-3 rounded-2xl p-4 ${bg}`}>
      <div className="grid h-11 w-11 place-items-center rounded-2xl bg-white/60">
        {icon}
      </div>
      <div className="min-w-0">
        <div className="text-sm text-slate-600">{title}</div>
        <div className={`text-base font-semibold ${valueClass}`}>{value}</div>
      </div>
    </div>
  )
}

function MenuTile({
  href,
  iconBoxClass,
  icon,
  label,
}: {
  href: string
  iconBoxClass: string
  icon: React.ReactNode
  label: string
}) {
  return (
    <Link href={href} className="block">
      <Card className="rounded-2xl border-slate-100 shadow-[0_2px_16px_rgba(0,0,0,0.06)] hover:shadow-[0_6px_22px_rgba(0,0,0,0.08)] transition active:scale-[0.99]">
        <CardContent className="p-6">
          <div className="flex flex-col items-center gap-3">
            <div className={`grid h-14 w-14 place-items-center rounded-2xl ${iconBoxClass}`}>
              {icon}
            </div>
            <div className="text-sm font-medium text-slate-800 text-center">{label}</div>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}

export default function BendaharaDashboardPage() {
  const router = useRouter()
  const [data, setData] = useState<BendaharaDashboardResponse | null>(null)
  const [rkabs, setRkabs] = useState<RkabBasic[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function load() {
      setLoading(true)
      setError(null)

      try {
        // GANTI URL kalau endpoint kamu pakai /api/dashboard/bendahara
        const res = await fetch("/api/bendahara/dashboard", {
          method: "GET",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
        })

        if (res.status === 401) {
          router.replace("/login")
          return
        }
        if (res.status === 403) {
          setError("Akses ditolak (bukan BENDAHARA).")
          return
        }
        if (!res.ok) {
          const t = await res.text().catch(() => "")
          throw new Error(t || `HTTP ${res.status}`)
        }

        const json = (await res.json()) as BendaharaDashboardResponse
        if (!cancelled) setData(json)

        // Load RKAB list
        const rkabRes = await fetch("/api/bendahara/rkab")
        if (rkabRes.ok) {
          const rkabJson = await rkabRes.json()
          if (!cancelled) setRkabs(rkabJson.data || [])
        }
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
    const s = data?.summary
    return {
      name: data?.user.name ?? "Bendahara",
      saldo: s?.totalSaldo ?? 0,
      masuk: s?.danaMasuk12M ?? 0,
      keluar: s?.danaKeluar12M ?? 0,
      notif: s?.unreadNotif ?? 0,
      siapCairCount: s?.siapCairCount ?? 0,
      siapCairTotal: s?.siapCairTotal ?? 0,
      buktiKurang: s?.buktiKurangCount ?? 0,
    }
  }, [data])

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Top App Bar (biru) */}
      <header className="sticky top-0 z-50 bg-blue-600 text-white shadow">
        <div className="mx-auto flex h-14 max-w-md items-center justify-between px-4">
          <h1 className="text-lg font-semibold">Dashboard Bendahara</h1>

          <div className="flex items-center gap-3">
            <Link
              href="/bendahara/notifikasi"
              className="relative grid h-9 w-9 place-items-center rounded-xl bg-white/15 hover:bg-white/20 transition"
              aria-label="Notifikasi"
            >
              <Bell className="h-5 w-5" />
              {ui.notif > 0 && (
                <span className="absolute -right-2 -top-2 grid h-5 min-w-5 place-items-center rounded-full bg-rose-500 px-1 text-xs font-semibold text-white">
                  {ui.notif}
                </span>
              )}
            </Link>

            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="grid h-9 w-9 place-items-center rounded-xl bg-white/15 hover:bg-white/20 transition"
              aria-label="Keluar"
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

        {/* Welcome Card (hijau) */}
        <div className="rounded-2xl bg-gradient-to-br from-emerald-700 to-emerald-600 p-5 text-white shadow-[0_10px_28px_rgba(16,185,129,0.25)]">
          <div className="text-sm/5 opacity-90">Selamat Datang,</div>
          <div className="mt-1 text-2xl font-semibold">
            {loading ? "..." : ui.name}
          </div>
          <div className="mt-2 text-sm/5 opacity-90">
            Kelola keuangan sekolah dengan efisien
          </div>
        </div>

        {/* Ringkasan Keuangan */}
        <div className="mt-5">
          <div className="mb-3 text-slate-700 font-semibold">Ringkasan Keuangan</div>
          <Card className="rounded-2xl border-slate-100 shadow-[0_2px_16px_rgba(0,0,0,0.06)]">
            <CardContent className="p-4 space-y-3">
              <SummaryRow
                icon={<Wallet className="h-6 w-6 text-blue-600" />}
                title="Total Saldo"
                value={loading ? "…" : formatCompactIDR(ui.saldo)}
                bg="bg-blue-50"
                valueClass="text-blue-700"
              />
              <SummaryRow
                icon={<ArrowDownCircle className="h-6 w-6 text-emerald-600" />}
                title="Dana Masuk"
                value={loading ? "…" : formatCompactIDR(ui.masuk)}
                bg="bg-emerald-50"
                valueClass="text-emerald-700"
              />
              <SummaryRow
                icon={<ArrowUpCircle className="h-6 w-6 text-rose-600" />}
                title="Dana Keluar"
                value={loading ? "…" : formatCompactIDR(ui.keluar)}
                bg="bg-rose-50"
                valueClass="text-rose-700"
              />
            </CardContent>
          </Card>
        </div>

        {/* Menu Utama */}
        <div className="mt-6">
          <div className="mb-3 text-slate-700 font-semibold">Menu Utama</div>
          <div className="grid grid-cols-2 gap-4">
            <MenuTile
              href="/bendahara/penerimaan-dana"
              iconBoxClass="bg-emerald-500 text-white"
              icon={<DollarSign className="h-7 w-7" />}
              label="Penerimaan Dana"
            />
            <MenuTile
              href="/bendahara/pencairan-dana"
              iconBoxClass="bg-blue-500 text-white"
              icon={<TrendingDown className="h-7 w-7" />}
              label="Pencairan Dana"
            />
            <MenuTile
              href="/bendahara/rkas/create"
              iconBoxClass="bg-violet-500 text-white"
              icon={<FileText className="h-7 w-7" />}
              label="Membuat RKAS"
            />
            <MenuTile
              href="/bendahara/transaksi"
              iconBoxClass="bg-orange-500 text-white"
              icon={<Receipt className="h-7 w-7" />}
              label="Data Transaksi"
            />
          </div>

          {/* Notifikasi row panjang + badge */}
          <Link
            href="/bendahara/notifikasi"
            className="mt-4 flex items-center justify-between rounded-2xl bg-white border border-slate-100 shadow-[0_2px_16px_rgba(0,0,0,0.06)] p-4"
          >
            <div className="flex items-center gap-3">
              <div className="grid h-12 w-12 place-items-center rounded-2xl bg-rose-500 text-white">
                <Bell className="h-7 w-7" />
              </div>
              <div className="font-medium text-slate-800">Notifikasi</div>
            </div>

            {ui.notif > 0 && (
              <span className="grid h-7 min-w-7 place-items-center rounded-full bg-rose-500 px-2 text-sm font-semibold text-white">
                {ui.notif}
              </span>
            )}
          </Link>
        </div>

        {/* RKAS Menunggu Persetujuan */}
        <div className="mt-6">
          <div className="mb-3 text-slate-700 font-semibold flex items-center justify-between">
            <span>RKAS Menunggu Persetujuan</span>
            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-100">
              {rkabs.filter(r => r.status === "SUBMITTED").length}
            </Badge>
          </div>
          <div className="space-y-3">
            {rkabs.filter(r => r.status === "SUBMITTED").length === 0 ? (
              <div className="text-center py-8 rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/50">
                <FileText className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                <div className="text-sm text-slate-500 italic">Belum ada pengajuan RKAS</div>
              </div>
            ) : (
              rkabs.filter(r => r.status === "SUBMITTED").map(r => (
                <Link key={r.id} href={`/bendahara/rkas/${r.id}/edit`}>
                  <Card className="rounded-2xl border-slate-100 shadow-[0_2px_16px_rgba(0,0,0,0.06)] hover:border-blue-200 hover:shadow-[0_4px_20px_rgba(37,99,235,0.1)] transition active:scale-[0.99] mb-3 overflow-hidden">
                    <CardContent className="p-4 flex items-center gap-4">
                      <div className="grid h-12 w-12 place-items-center rounded-xl bg-orange-50 text-orange-600 shrink-0">
                        <FileText className="h-6 w-6" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="font-semibold text-slate-900 truncate">{r.code}</div>
                        <div className="text-xs text-slate-500 mt-1 flex items-center gap-2">
                          <span>Tahun {r.fiscalYear}</span>
                          <span>•</span>
                          <span>{r._count?.items ?? 0} Kegiatan</span>
                        </div>
                      </div>
                      <Badge className="bg-orange-100 text-orange-700 hover:bg-orange-100 border-none px-2 py-0.5 text-[10px]">
                        SUBMITTED
                      </Badge>
                    </CardContent>
                  </Card>
                </Link>
              ))
            )}
          </div>
        </div>

        {/* Tindakan Diperlukan */}
        <div className="mt-6">
          <div className="mb-3 text-slate-700 font-semibold">Tindakan Diperlukan</div>
          <div className="space-y-3">
            <Card className="rounded-2xl border-slate-100 shadow-[0_2px_16px_rgba(0,0,0,0.06)]">
              <CardContent className="p-4 flex items-start gap-3">
                <div className="grid h-11 w-11 place-items-center rounded-2xl bg-blue-50">
                  <TrendingDown className="h-6 w-6 text-blue-600" />
                </div>
                <div className="min-w-0">
                  <div className="font-medium text-slate-900">
                    {loading ? "…" : `${ui.siapCairCount} Pengajuan Siap Dicairkan`}
                  </div>
                  <div className="text-sm text-slate-600 mt-1">
                    Total: {loading ? "…" : formatIDR(ui.siapCairTotal)}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-2xl border-slate-100 shadow-[0_2px_16px_rgba(0,0,0,0.06)]">
              <CardContent className="p-4 flex items-start gap-3">
                <div className="grid h-11 w-11 place-items-center rounded-2xl bg-emerald-50">
                  <DollarSign className="h-6 w-6 text-emerald-600" />
                </div>
                <div className="min-w-0">
                  <div className="font-medium text-slate-900">
                    {loading ? "…" : `${ui.buktiKurang} Pengajuan Belum Ada Bukti`}
                  </div>
                  <div className="text-sm text-slate-600 mt-1">
                    Cek & minta upload bukti
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Skeleton minimal biar ga kosong saat loading */}
        {loading && (
          <div className="mt-4 text-xs text-slate-500">
            Memuat data dashboard…
          </div>
        )}
      </main>
    </div>
  )
}