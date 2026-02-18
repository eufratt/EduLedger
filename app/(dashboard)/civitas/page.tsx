"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { signOut } from "next-auth/react"
import Link from "next/link"

import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Bell,
  LogOut,
  Clock3,
  CircleCheck,
  TrendingUp,
  FileText,
  Upload,
  History,
} from "lucide-react"

type DashboardResponse = {
  user: { id: number; name: string }
  summary: {
    pengajuanAktif: number
    disetujui: number
    totalDana: number
    unreadNotif: number
  }
  aktivitasTerbaru: Array<{
    id: number
    judul: string
    jumlah: number
    status: string
    createdAt: string // dari NextResponse jadi ISO string
  }>
}

function Rupiah({ value }: { value: number }) {
  const jt = value / 1_000_000
  const text =
    jt >= 1
      ? `Rp ${jt % 1 === 0 ? jt.toFixed(0) : jt.toFixed(1)} Jt`
      : `Rp ${value.toLocaleString("id-ID")}`
  return <span>{text}</span>
}

function formatIDR(amount: number) {
  return "Rp " + amount.toLocaleString("id-ID")
}

function timeAgoID(dateIso: string) {
  const d = new Date(dateIso)
  const diffMs = Date.now() - d.getTime()
  const sec = Math.floor(diffMs / 1000)
  const min = Math.floor(sec / 60)
  const hour = Math.floor(min / 60)
  const day = Math.floor(hour / 24)

  if (day >= 1) return `${day} hari yang lalu`
  if (hour >= 1) return `${hour} jam yang lalu`
  if (min >= 1) return `${min} menit yang lalu`
  return `baru saja`
}

function statusBadge(status: string): { text: string; className: string } {
  // samain dengan enum BudgetRequestStatus kamu:
  // SUBMITTED, APPROVED, REJECTED, dll
  switch (status) {
    case "SUBMITTED":
      return {
        text: "Menunggu",
        className: "rounded-full bg-yellow-100 text-yellow-700 hover:bg-yellow-100",
      }
    case "APPROVED":
      return {
        text: "Disetujui",
        className: "rounded-full bg-green-100 text-green-700 hover:bg-green-100",
      }
    case "REJECTED":
      return {
        text: "Ditolak",
        className: "rounded-full bg-red-100 text-red-700 hover:bg-red-100",
      }
    default:
      return {
        text: status,
        className: "rounded-full bg-muted text-foreground hover:bg-muted",
      }
  }
}

export default function CivitasDashboardPage() {
  const router = useRouter()

  const [data, setData] = useState<DashboardResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function load() {
      setLoading(true)
      setError(null)

      try {
        const res = await fetch("/api/civitas/dashboard?limitActivities=5", {
          method: "GET",
          credentials: "include", // aman, biar cookie session kebawa
          headers: { "Content-Type": "application/json" },
        })

        if (res.status === 401) {
          // belum login
          router.replace("/login")
          return
        }

        if (res.status === 403) {
          // role bukan CIVITAS -> jangan pura-pura aman
          setError("Akses ditolak (bukan CIVITAS).")
          return
        }

        if (!res.ok) {
          const j = await res.json().catch(() => null)
          throw new Error(j?.error ?? `HTTP ${res.status}`)
        }

        const json = (await res.json()) as DashboardResponse
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

  const stats = useMemo(() => {
    return {
      aktif: data?.summary.pengajuanAktif ?? 0,
      disetujui: data?.summary.disetujui ?? 0,
      totalDana: data?.summary.totalDana ?? 0,
      unread: data?.summary.unreadNotif ?? 0,
    }
  }, [data])

  return (
    <div className="min-h-screen bg-background">
      {/* Topbar */}
      <header className="sticky top-0 z-50 h-14 bg-primary text-primary-foreground shadow">
        <div className="mx-auto flex h-14 max-w-md items-center justify-between px-4">
          <h1 className="text-lg font-semibold">Dashboard Civitas</h1>

          <div className="flex items-center gap-3">
            <div className="relative">
              <Bell className="h-6 w-6" />
              <span className="absolute -right-2 -top-2 grid h-5 min-w-5 place-items-center rounded-full bg-red-500 px-1 text-xs font-semibold text-white">
                {stats.unread}
              </span>
            </div>

            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="rounded-md p-1 hover:bg-white/10 transition"
            >
              <LogOut className="h-6 w-6" />
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-md px-4 pb-10 pt-4">
        {/* Error state */}
        {error && (
          <div className="mb-4 rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </div>
        )}

        {/* Welcome Card */}
        <div className="rounded-2xl bg-gradient-to-br from-primary to-blue-700 p-[1px] shadow-sm">
          <div className="rounded-2xl px-5 py-6 text-white">
            <p className="text-sm/5 opacity-90">Selamat Datang,</p>
            <p className="mt-1 text-2xl font-semibold">
              {loading ? "..." : data?.user.name ?? "User"}
            </p>
            <p className="mt-3 text-sm/5 opacity-90">Kelola pengajuan dana dengan mudah</p>
          </div>
        </div>

        {/* Stat Cards */}
        <div className="mt-5 grid grid-cols-3 gap-3">
          <Card className="rounded-2xl">
            <CardContent className="p-4">
              <Clock3 className="h-6 w-6 text-orange-500" />
              <div className="mt-2 text-xl font-semibold">{loading ? "…" : stats.aktif}</div>
              <div className="mt-1 text-sm text-muted-foreground">Pengajuan Aktif</div>
            </CardContent>
          </Card>

          <Card className="rounded-2xl">
            <CardContent className="p-4">
              <CircleCheck className="h-6 w-6 text-green-600" />
              <div className="mt-2 text-xl font-semibold">{loading ? "…" : stats.disetujui}</div>
              <div className="mt-1 text-sm text-muted-foreground">Disetujui</div>
            </CardContent>
          </Card>

          <Card className="rounded-2xl">
            <CardContent className="p-4">
              <TrendingUp className="h-6 w-6 text-blue-600" />
              <div className="mt-2 text-sm font-semibold text-blue-600">
                {loading ? "…" : <Rupiah value={stats.totalDana} />}
              </div>
              <div className="mt-1 text-sm text-muted-foreground">Total Dana</div>
            </CardContent>
          </Card>
        </div>

        {/* Menu Utama */}
        <h2 className="mt-6 text-base font-semibold text-foreground">Menu Utama</h2>

        <div className="mt-3 grid grid-cols-2 gap-4">
          <Link href="/civitas/ajukan-dana" className="block">
            <Card className="rounded-2xl transition hover:shadow-md active:scale-[0.99]">
              <CardContent className="flex flex-col items-center justify-center gap-3 p-6">
                <div className="grid h-14 w-14 place-items-center rounded-2xl bg-blue-600 text-white">
                  <FileText className="h-7 w-7" />
                </div>
                <div className="text-sm font-medium">Ajukan Dana</div>
              </CardContent>
            </Card>
          </Link>

          <Link href="/civitas/upload-bukti" className="block">
            <Card className="rounded-2xl">
              <CardContent className="flex flex-col items-center justify-center gap-3 p-6">
                <div className="grid h-14 w-14 place-items-center rounded-2xl bg-green-600 text-white">
                  <Upload className="h-7 w-7" />
                </div>
                <div className="text-sm font-medium">Upload Bukti</div>
              </CardContent>
            </Card>
          </Link>


          <Card className="rounded-2xl">
            <CardContent className="flex flex-col items-center justify-center gap-3 p-6">
              <div className="grid h-14 w-14 place-items-center rounded-2xl bg-purple-600 text-white">
                <History className="h-7 w-7" />
              </div>
              <div className="text-sm font-medium">Riwayat Pengajuan</div>
            </CardContent>
          </Card>

          <Card className="rounded-2xl">
            <CardContent className="flex flex-col items-center justify-center gap-3 p-6">
              <div className="grid h-14 w-14 place-items-center rounded-2xl bg-orange-500 text-white">
                <Bell className="h-7 w-7" />
              </div>
              <div className="text-sm font-medium">Notifikasi</div>
            </CardContent>
          </Card>
        </div>

        {/* Aktivitas Terbaru */}
        <h2 className="mt-6 text-base font-semibold text-foreground">Aktivitas Terbaru</h2>

        <div className="mt-3 space-y-3">
          {loading &&
            Array.from({ length: 2 }).map((_, i) => (
              <Card key={i} className="rounded-2xl">
                <CardContent className="p-4">
                  <div className="h-4 w-2/3 animate-pulse rounded bg-muted" />
                  <div className="mt-3 h-3 w-1/2 animate-pulse rounded bg-muted" />
                  <div className="mt-3 h-3 w-1/3 animate-pulse rounded bg-muted" />
                </CardContent>
              </Card>
            ))}

          {!loading && (data?.aktivitasTerbaru?.length ?? 0) === 0 && (
            <Card className="rounded-2xl">
              <CardContent className="p-4 text-sm text-muted-foreground">
                Belum ada aktivitas.
              </CardContent>
            </Card>
          )}

          {!loading &&
            data?.aktivitasTerbaru?.map((a) => {
              const b = statusBadge(a.status)
              return (
                <Card key={a.id} className="rounded-2xl">
                  <CardContent className="flex items-start justify-between gap-3 p-4">
                    <div>
                      <div className="font-medium">{a.judul}</div>
                      <div className="mt-2 text-sm text-muted-foreground">
                        {formatIDR(a.jumlah)}
                      </div>
                      <div className="mt-2 text-sm text-muted-foreground">
                        {timeAgoID(a.createdAt)}
                      </div>
                    </div>
                    <Badge className={b.className}>{b.text}</Badge>
                  </CardContent>
                </Card>
              )
            })}
        </div>
      </main>
    </div>
  )
}