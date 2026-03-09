"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowLeft } from "lucide-react"

import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

type ReqRow = {
  id: number
  judul: string
  jumlah: number
  status: string
  statusLabel: string
  tanggal: string // ISO
}

type ApiRes = {
  data: ReqRow[]
  meta: { page: number; limit: number; total: number }
}

function formatIDR(n: number) {
  return "Rp " + n.toLocaleString("id-ID")
}

function formatDateID(dateIso: string) {
  const d = new Date(dateIso)
  return d.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })
}

async function readApiError(res: Response) {
  const j = await res.json().catch(() => null)
  return j?.error ?? j?.message ?? `HTTP ${res.status}`
}

export default function UploadBuktiPage() {
  const router = useRouter()
  const [rows, setRows] = useState<ReqRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function load() {
      setLoading(true)
      setError(null)

      try {
        // pakai filter=disetujui -> backend balikin APPROVED/DISBURSED/COMPLETED
        const res = await fetch("/api/requests?filter=disetujui&page=1&limit=50", {
          credentials: "include",
        })

        if (res.status === 401) {
          router.replace("/login")
          return
        }
        if (res.status === 403) {
          throw new Error("Akses ditolak (bukan CIVITAS).")
        }
        if (!res.ok) {
          throw new Error(await readApiError(res))
        }

        const json = (await res.json()) as ApiRes
        if (!cancelled) setRows(json.data ?? [])
      } catch (e: any) {
        if (!cancelled) setError(e?.message ?? "Gagal memuat data.")
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [router])

  // 🔥 yang tampil cuma DISBURSED
  const disbursed = useMemo(
    () => rows.filter((r) => r.status === "DISBURSED"),
    [rows]
  )

  return (
    <div className="min-h-screen bg-background">
      {/* Topbar */}
      <header className="sticky top-0 z-50 h-14 bg-primary text-primary-foreground shadow">
        <div className="mx-auto flex h-14 max-w-md items-center gap-3 px-4">
          <Link href="/civitas" className="rounded-md p-1 hover:bg-white/10 transition" aria-label="Kembali">
            <ArrowLeft className="h-6 w-6" />
          </Link>
          <h1 className="text-lg font-semibold">Upload Bukti</h1>
        </div>
      </header>

      <main className="mx-auto max-w-md px-4 pb-10 pt-4">
        {/* Info box */}
        <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-700">
          Pilih pengajuan yang sudah dicairkan untuk upload bukti pengeluaran
        </div>

        <h2 className="mt-5 text-base font-semibold text-foreground">
          Pengajuan yang Sudah Dicairkan
        </h2>

        {error && (
          <div className="mt-4 rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </div>
        )}

        <div className="mt-4 space-y-3">
          {loading &&
            Array.from({ length: 3 }).map((_, i) => (
              <Card key={i} className="rounded-2xl">
                <CardContent className="p-4">
                  <div className="h-4 w-2/3 animate-pulse rounded bg-muted" />
                  <div className="mt-3 h-3 w-1/3 animate-pulse rounded bg-muted" />
                  <div className="mt-3 h-3 w-1/2 animate-pulse rounded bg-muted" />
                </CardContent>
              </Card>
            ))}

          {!loading && disbursed.length === 0 && (
            <Card className="rounded-2xl">
              <CardContent className="p-4 text-sm text-muted-foreground">
                Belum ada pengajuan yang dicairkan.
              </CardContent>
            </Card>
          )}

          {!loading &&
            disbursed.map((r) => (
              <Link key={r.id} href={`/civitas/upload-bukti/${r.id}`} className="block">
                <Card className="rounded-2xl transition hover:shadow-md active:scale-[0.99]">
                  <CardContent className="flex items-start justify-between gap-3 p-4">
                    <div>
                      <div className="font-medium">{r.judul}</div>
                      <div className="mt-2 text-sm text-muted-foreground">{formatIDR(r.jumlah)}</div>
                      <div className="mt-2 text-sm text-muted-foreground">
                        Dicairkan: {formatDateID(r.tanggal)}
                      </div>
                    </div>

                    <Badge className="rounded-full bg-blue-100 text-blue-700 hover:bg-blue-100">
                      Dicairkan
                    </Badge>
                  </CardContent>
                </Card>
              </Link>
            ))}
        </div>
      </main>
    </div>
  )
}
