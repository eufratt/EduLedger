"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowLeft, Upload } from "lucide-react"

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
    <div className="min-h-screen bg-slate-50/50 pb-20">
      {/* Topbar */}
      <header className="sticky top-0 z-50 h-16 bg-blue-600 text-white shadow-md">
        <div className="mx-auto flex h-16 max-w-md items-center gap-4 px-4">
          <Link 
            href="/civitas" 
            className="rounded-full p-2 transition-colors hover:bg-white/20 active:scale-95" 
            aria-label="Kembali"
          >
            <ArrowLeft className="h-6 w-6" />
          </Link>
          <h1 className="text-xl font-bold tracking-tight">Upload Bukti</h1>
        </div>
      </header>

      <main className="mx-auto max-w-md px-4 pt-6 space-y-6">
        {/* Info box with light blue background */}
        <div className="animate-in fade-in slide-in-from-top-4 duration-500 rounded-3xl border border-blue-100 bg-blue-50/80 p-5 text-sm font-medium text-blue-700 shadow-sm backdrop-blur-sm">
          Pilih pengajuan yang sudah dicairkan untuk upload bukti pengeluaran
        </div>

        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-800">
            Pengajuan Dicairkan
          </h2>
          {!loading && (
            <Badge variant="outline" className="rounded-full border-slate-200 bg-white px-3 font-semibold text-slate-500">
              {disbursed.length} Item
            </Badge>
          )}
        </div>

        {error && (
          <div className="rounded-2xl border border-rose-100 bg-rose-50 p-4 text-sm font-medium text-rose-600 animate-in zoom-in-95">
            {error}
          </div>
        )}

        <div className="space-y-4">
          {loading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <Card key={i} className="overflow-hidden rounded-[2rem] border-none shadow-sm animate-pulse">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="space-y-3 w-2/3">
                      <div className="h-4 w-full rounded bg-slate-100" />
                      <div className="h-3 w-1/2 rounded bg-slate-100" />
                      <div className="h-3 w-2/3 rounded bg-slate-100" />
                    </div>
                    <div className="h-8 w-20 rounded-full bg-slate-100" />
                  </div>
                </CardContent>
              </Card>
            ))
          ) : disbursed.length === 0 ? (
            <Card className="rounded-[2rem] border-none bg-white p-10 text-center shadow-sm">
              <CardContent className="flex flex-col items-center gap-3 p-0">
                <div className="rounded-full bg-slate-50 p-6 text-slate-300">
                  <Upload className="h-12 w-12" />
                </div>
                <div>
                  <p className="font-bold text-slate-800">Belum Ada Data</p>
                  <p className="mt-1 text-sm text-slate-500">
                    Belum ada pengajuan yang berstatus dicairkan.
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : (
            disbursed.map((r, idx) => (
              <Link 
                key={r.id} 
                href={`/civitas/upload-bukti/${r.id}`} 
                className="group block animate-in fade-in slide-in-from-bottom-4 duration-500"
                style={{ animationDelay: `${idx * 100}ms` }}
              >
                <Card className="overflow-hidden rounded-[2rem] border-none bg-white shadow-sm transition-all hover:shadow-md active:scale-[0.98]">
                  <CardContent className="flex items-center justify-between gap-4 p-6">
                    <div className="space-y-2">
                      <h3 className="text-lg font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                        {r.judul}
                      </h3>
                      <p className="text-base font-black text-blue-600">
                        {formatIDR(r.jumlah)}
                      </p>
                      <p className="text-xs font-bold text-slate-400 flex items-center gap-1.5 uppercase tracking-wide">
                        <span className="h-1.5 w-1.5 rounded-full bg-slate-200" />
                        Dicairkan: {formatDateID(r.tanggal)}
                      </p>
                    </div>

                    <Badge className="rounded-full bg-blue-50 px-4 py-1.5 text-xs font-black uppercase tracking-widest text-blue-700 hover:bg-blue-100 border-none">
                      Dicairkan
                    </Badge>
                  </CardContent>
                </Card>
              </Link>
            ))
          )}
        </div>
      </main>
    </div>
  )
}
