"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"

import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

type TimelineItem = {
  key: string
  title: string
  at: string
  note?: string | null
}

type DetailRes = {
  data: {
    id: number
    judul: string
    jumlah: number
    status: string
    statusLabel: string
    diajukanAt: string
    deskripsi: string
    timeline: TimelineItem[]
  }
}

function formatIDR(n: number) {
  return "Rp " + n.toLocaleString("id-ID")
}

function formatDateID(iso: string) {
  const d = new Date(iso)
  return d.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  })
}

async function readApiError(res: Response) {
  const j = await res.json().catch(() => null)
  return j?.error ?? j?.message ?? `HTTP ${res.status}`
}

function statusPillClass(status: string) {
  switch (status) {
    case "SUBMITTED":
      return "bg-yellow-100 text-yellow-700"
    case "APPROVED":
      return "bg-green-100 text-green-700"
    case "REJECTED":
      return "bg-red-100 text-red-700"
    case "DISBURSED":
      return "bg-blue-100 text-blue-700"
    case "COMPLETED":
      return "bg-muted text-foreground"
    default:
      return "bg-muted text-foreground"
  }
}

export default function DetailRiwayatPage() {
  const router = useRouter()
  const params = useParams<{ id: string }>()
  const id = Number(params?.id)

  const [data, setData] = useState<DetailRes["data"] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function load() {
      if (!Number.isFinite(id) || id <= 0) {
        setError("ID tidak valid.")
        setLoading(false)
        return
      }

      setLoading(true)
      setError(null)

      try {
        const res = await fetch(`/api/requests/${id}`, {
          credentials: "include",
        })

        if (res.status === 401) {
          router.replace("/login")
          return
        }

        if (res.status === 403) {
          throw new Error("Akses ditolak.")
        }

        if (!res.ok) throw new Error(await readApiError(res))

        const json = (await res.json()) as DetailRes
        if (!cancelled) setData(json.data)
      } catch (e: any) {
        if (!cancelled) setError(e?.message ?? "Gagal memuat detail.")
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()

    return () => {
      cancelled = true
    }
  }, [id, router])

  return (
    <div className="min-h-screen bg-background">
      {/* Topbar */}
      <header className="sticky top-0 z-50 h-14 bg-primary text-primary-foreground shadow">
        <div className="mx-auto flex h-14 max-w-md items-center gap-3 px-4">
          <Link
            href="/civitas/riwayat"
            className="rounded-md p-1 hover:bg-white/10 transition"
          >
            <ArrowLeft className="h-6 w-6" />
          </Link>
          <h1 className="text-lg font-semibold">Detail Pengajuan</h1>
        </div>
      </header>

      <main className="mx-auto max-w-md px-4 pb-10 pt-4 space-y-4">
        {loading && (
          <div className="text-sm text-muted-foreground">Memuat...</div>
        )}

        {error && (
          <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </div>
        )}

        {!loading && data && (
          <>
            {/* Card Utama */}
            <Card className="rounded-2xl">
              <CardContent className="p-4 space-y-2">
                <div className="flex items-start justify-between">
                  <div className="font-medium">{data.judul}</div>
                  <Badge
                    className={`rounded-full px-3 py-1 text-xs ${statusPillClass(
                      data.status
                    )}`}
                  >
                    {data.statusLabel}
                  </Badge>
                </div>

                <div className="text-sm">{formatIDR(data.jumlah)}</div>

                <div className="text-sm text-muted-foreground">
                  Diajukan: {formatDateID(data.diajukanAt)}
                </div>
              </CardContent>
            </Card>

            {/* Deskripsi */}
            <Card className="rounded-2xl">
              <CardContent className="p-4 space-y-2">
                <div className="font-medium">Deskripsi</div>
                <div className="text-sm text-muted-foreground">
                  {data.deskripsi || "-"}
                </div>
              </CardContent>
            </Card>

            {/* Timeline */}
            <Card className="rounded-2xl">
              <CardContent className="p-4 space-y-4">
                <div className="font-medium">Timeline</div>

                {data.timeline.map((t) => (
                  <div key={t.key} className="flex gap-3">
                    <div className="mt-1 h-3 w-3 rounded-full bg-blue-600" />
                    <div>
                      <div className="text-sm font-medium">{t.title}</div>
                      <div className="text-sm text-muted-foreground">
                        {formatDateID(t.at)}
                      </div>
                      {t.note && (
                        <div className="text-xs text-muted-foreground mt-1">
                          {t.note}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </>
        )}
      </main>
    </div>
  )
}