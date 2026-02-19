"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowLeft, Search, Filter } from "lucide-react"

import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

type Status =
  | "SUBMITTED"
  | "APPROVED"
  | "REJECTED"
  | "DISBURSED"
  | "COMPLETED"
  | "CANCELLED"
  | "DRAFT"
  | string

type Row = {
  id: number
  judul: string
  jumlah: number
  status: Status
  statusLabel: string
  tanggal: string // ISO
}

type ApiRes = {
  data: Row[]
  meta: { page: number; limit: number; total: number }
}

function formatIDR(n: number) {
  return "Rp " + n.toLocaleString("id-ID")
}

function formatDateID(iso: string) {
  const d = new Date(iso)
  return d.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })
}

function statusPillClass(label: string, status: Status) {
  // pakai label dari API kalau ada, tapi tetap aman kalau status mentah
  const s = (status ?? "").toString().toUpperCase()
  const l = (label ?? "").toLowerCase()

  if (s === "SUBMITTED" || l.includes("menunggu")) return "bg-yellow-100 text-yellow-700 hover:bg-yellow-100"
  if (s === "APPROVED" || l.includes("disetujui")) return "bg-green-100 text-green-700 hover:bg-green-100"
  if (s === "REJECTED" || l.includes("ditolak")) return "bg-red-100 text-red-700 hover:bg-red-100"
  if (s === "DISBURSED" || l.includes("dicairkan")) return "bg-blue-100 text-blue-700 hover:bg-blue-100"
  if (s === "COMPLETED" || l.includes("selesai")) return "bg-slate-100 text-slate-700 hover:bg-slate-100"

  return "bg-muted text-muted-foreground hover:bg-muted"
}

function chipClass(active: boolean, variant: "default" | "yellow" | "green" | "red" = "default") {
  if (!active) return "bg-background text-foreground border border-muted-foreground/20 hover:bg-muted/30"

  if (variant === "yellow") return "bg-amber-600 text-white border border-amber-600 hover:bg-amber-600/90"
  if (variant === "green") return "bg-green-600 text-white border border-green-600 hover:bg-green-600/90"
  if (variant === "red") return "bg-red-600 text-white border border-red-600 hover:bg-red-600/90"

  return "bg-primary text-primary-foreground border border-primary hover:bg-primary/90"
}

export default function RiwayatPengajuanPage() {
  const router = useRouter()

  const [q, setQ] = useState("")
  const [filter, setFilter] = useState<"semua" | "menunggu" | "disetujui" | "ditolak">("semua")

  const [rows, setRows] = useState<Row[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // pagination basic (opsional)
  const [page, setPage] = useState(1)
  const limit = 10
  const [total, setTotal] = useState(0)

  // debounce search biar gak spam fetch
  const [qDebounced, setQDebounced] = useState(q)
  useEffect(() => {
    const t = setTimeout(() => setQDebounced(q), 350)
    return () => clearTimeout(t)
  }, [q])

  // reset page kalau q/filter berubah
  useEffect(() => {
    setPage(1)
  }, [qDebounced, filter])

  const abortRef = useRef<AbortController | null>(null)

  async function readApiError(res: Response) {
    const j = await res.json().catch(() => null)
    return j?.error ?? j?.message ?? `HTTP ${res.status}`
  }

  useEffect(() => {
    let mounted = true
    abortRef.current?.abort()
    const ac = new AbortController()
    abortRef.current = ac

    async function load() {
      setLoading(true)
      setError(null)

      try {
        const params = new URLSearchParams()
        if (qDebounced.trim()) params.set("q", qDebounced.trim())
        params.set("filter", filter)
        params.set("page", String(page))
        params.set("limit", String(limit))

        const res = await fetch(`/api/requests?${params.toString()}`, {
          credentials: "include",
          signal: ac.signal,
        })

        if (res.status === 401) {
          router.replace("/login")
          return
        }
        if (res.status === 403) {
          throw new Error("Akses ditolak (bukan CIVITAS).")
        }
        if (!res.ok) throw new Error(await readApiError(res))

        const json = (await res.json()) as ApiRes
        if (!mounted) return

        setRows(json.data ?? [])
        setTotal(json.meta?.total ?? 0)
      } catch (e: any) {
        if (!mounted) return
        if (e?.name === "AbortError") return
        setError(e?.message ?? "Gagal memuat data.")
      } finally {
        if (mounted) setLoading(false)
      }
    }

    load()
    return () => {
      mounted = false
      ac.abort()
    }
  }, [router, qDebounced, filter, page])

  const canPrev = page > 1
  const canNext = page * limit < total

  const headerSubtitle = useMemo(() => {
    if (loading) return "Memuat..."
    if (error) return "Gagal memuat"
    if (!rows.length) return "Tidak ada data"
    return `${rows.length} item`
  }, [loading, error, rows.length])

  return (
    <div className="min-h-screen bg-background">
      {/* Topbar */}
      <header className="sticky top-0 z-50 h-14 bg-primary text-primary-foreground shadow">
        <div className="mx-auto flex h-14 max-w-md items-center gap-3 px-4">
          <Link href="/civitas" className="rounded-md p-1 hover:bg-white/10 transition" aria-label="Kembali">
            <ArrowLeft className="h-6 w-6" />
          </Link>
          <div className="flex flex-col">
            <h1 className="text-lg font-semibold leading-5">Riwayat Pengajuan</h1>
            <span className="text-xs opacity-90">{headerSubtitle}</span>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-md px-4 pb-10 pt-4">
        {/* Search */}
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Cari pengajuan..."
            className="h-12 rounded-2xl pl-10"
          />
        </div>

        {/* Filter chips */}
        <div className="mt-4 flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-2xl border border-muted-foreground/20 bg-background">
            <Filter className="h-5 w-5 text-muted-foreground" />
          </div>

          <div className="flex flex-1 gap-2">
            <button
              type="button"
              onClick={() => setFilter("semua")}
              className={`h-10 flex-1 rounded-2xl px-3 text-sm font-medium ${chipClass(filter === "semua", "default")}`}
            >
              Semua
            </button>
            <button
              type="button"
              onClick={() => setFilter("menunggu")}
              className={`h-10 flex-1 rounded-2xl px-3 text-sm font-medium ${chipClass(
                filter === "menunggu",
                "yellow"
              )}`}
            >
              Menunggu
            </button>
            <button
              type="button"
              onClick={() => setFilter("disetujui")}
              className={`h-10 flex-1 rounded-2xl px-3 text-sm font-medium ${chipClass(
                filter === "disetujui",
                "green"
              )}`}
            >
              Disetujui
            </button>
            <button
              type="button"
              onClick={() => setFilter("ditolak")}
              className={`h-10 flex-1 rounded-2xl px-3 text-sm font-medium ${chipClass(filter === "ditolak", "red")}`}
            >
              Ditolak
            </button>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="mt-4 rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </div>
        )}

        {/* List */}
        <div className="mt-4 space-y-3">
          {loading ? (
            <Card className="rounded-2xl">
              <CardContent className="p-4 text-sm text-muted-foreground">Memuat data...</CardContent>
            </Card>
          ) : rows.length === 0 ? (
            <Card className="rounded-2xl">
              <CardContent className="p-6 text-center text-sm text-muted-foreground">
                Tidak ada pengajuan untuk filter ini.
              </CardContent>
            </Card>
          ) : (
            rows.map((r) => (
              <Link key={r.id} href={`/civitas/riwayat/${r.id}`} className="block">
                <Card className="rounded-2xl hover:bg-muted/20 transition">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="truncate font-medium">{r.judul}</div>
                        <div className="mt-2 text-sm">{formatIDR(r.jumlah)}</div>
                        <div className="mt-2 text-sm text-muted-foreground">{formatDateID(r.tanggal)}</div>
                      </div>

                      <div className="flex flex-col items-end gap-3">
                        <span className="text-muted-foreground">›</span>
                        <Badge className={`rounded-full ${statusPillClass(r.statusLabel, r.status)}`}>
                          {r.statusLabel}
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))
          )}
        </div>

        {/* Pagination simple */}
        {!loading && total > 0 && (
          <div className="mt-5 flex items-center justify-between">
            <Button variant="secondary" className="rounded-xl" disabled={!canPrev} onClick={() => setPage((p) => p - 1)}>
              Prev
            </Button>
            <div className="text-sm text-muted-foreground">
              Page <span className="text-foreground">{page}</span>
            </div>
            <Button variant="secondary" className="rounded-xl" disabled={!canNext} onClick={() => setPage((p) => p + 1)}>
              Next
            </Button>
          </div>
        )}
      </main>
    </div>
  )
}