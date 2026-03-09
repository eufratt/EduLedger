"use client"

import React, { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"


type FundingSource = {
  id: number
  name: string
  agency?: string | null
  createdAt?: string
}

type LedgerEntry = {
  id: number
  type: "INCOME" | "EXPENSE"
  title: string
  amount: number
  date: string
  fundingSource?: { id: number; name: string; agency?: string | null } | null
}

function formatIDR(n: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(n)
}

function pad2(x: number) {
  return String(x).padStart(2, "0")
}

function toYYYYMM(d: Date) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}`
}

function monthLabel(yyyymm: string) {
  const [y, m] = yyyymm.split("-").map((v) => Number(v))
  const dt = new Date(y, (m ?? 1) - 1, 1)
  return new Intl.DateTimeFormat("id-ID", { month: "long", year: "numeric" }).format(dt)
}

function dateLabel(iso: string) {
  const d = new Date(iso)
  return new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short", year: "numeric" }).format(d)
}

export default function Page() {
  const [period, setPeriod] = useState(() => toYYYYMM(new Date()))
  const [items, setItems] = useState<LedgerEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState<string | null>(null)
  const [total, setTotal] = useState(0)

  const router = useRouter()

  async function load() {
    setLoading(true)
    setErr(null)
    try {
      const res = await fetch(`/api/ledger-entries?type=INCOME&period=${encodeURIComponent(period)}`, {
        cache: "no-store",
      })
      if (!res.ok) {
        const j = await res.json().catch(() => null)
        throw new Error(j?.error || `Gagal load data (${res.status})`)
      }
      const j = (await res.json()) as { items: LedgerEntry[]; total: number }
      setItems(Array.isArray(j.items) ? j.items : [])
      setTotal(Number(j.total ?? 0))
    } catch (e: any) {
      setErr(e?.message || "Gagal load data")
      setItems([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period])

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Bar */}
      <div className="sticky top-0 z-10 bg-blue-600">
        <div className="mx-auto flex max-w-md items-center gap-3 px-4 py-4 text-white">
          <button
            className="rounded-full p-2 hover:bg-white/10"
            aria-label="Kembali"
            onClick={() => router.back()}          >
            {/* simple back arrow */}
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <path
                d="M15 18l-6-6 6-6"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
          <h1 className="text-lg font-semibold">Penerimaan Dana</h1>
        </div>
      </div>

      <div className="mx-auto max-w-md px-4 pb-10 pt-5">
        {/* Summary Card */}
        <div className="rounded-2xl bg-gradient-to-br from-green-600 to-green-700 p-5 text-white shadow-md">
          <div className="text-sm opacity-90">Total Penerimaan</div>
          <div className="mt-2 text-2xl font-bold">{formatIDR(total)}</div>
          <div className="mt-3 text-sm opacity-90">Bulan {monthLabel(period)}</div>

          <div className="mt-4">
            <label className="text-xs opacity-90">Pilih Bulan</label>
            <input
              type="month"
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              className="mt-1 w-full rounded-xl border border-white/25 bg-white/10 px-3 py-2 text-sm text-white placeholder:text-white/60 outline-none focus:ring-2 focus:ring-white/40"
            />
          </div>
        </div>

        {/* Button */}
        <button
          onClick={() => router.push("/bendahara/input-dana-masuk")} className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 px-4 py-4 font-semibold text-white shadow-md hover:bg-blue-700 active:scale-[0.99]"
        >
          <span className="text-xl leading-none">＋</span>
          <span>Input Dana Masuk</span>
        </button>

        {/* Riwayat */}
        <div className="mt-6">
          <h2 className="text-base font-semibold text-gray-800">Riwayat Penerimaan</h2>

          {err ? (
            <div className="mt-3 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {err}
            </div>
          ) : null}

          {loading ? (
            <div className="mt-3 space-y-3">
              <SkeletonRow />
              <SkeletonRow />
              <SkeletonRow />
            </div>
          ) : items.length === 0 ? (
            <div className="mt-3 rounded-xl border bg-white p-4 text-sm text-gray-600">
              Belum ada penerimaan untuk periode ini.
            </div>
          ) : (
            <div className="mt-3 space-y-3">
              {items.map((it) => (
                <div key={it.id} className="rounded-2xl border bg-white p-4 shadow-sm">
                  <div className="flex items-start gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-green-100 text-green-700">
                      {/* $ icon */}
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                        <path
                          d="M12 2v20"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                        />
                        <path
                          d="M17 6.5c0-1.93-2.24-3.5-5-3.5S7 4.57 7 6.5 9.24 10 12 10s5 1.57 5 3.5S14.76 17 12 17s-5-1.57-5-3.5"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                        />
                      </svg>
                    </div>

                    <div className="flex-1">
                      <div className="text-sm font-semibold text-gray-800">
                        {it.title || it.fundingSource?.name || "Dana Masuk"}                      </div>
                      <div className="mt-1 text-sm text-gray-700">{formatIDR(it.amount)}</div>
                      <div className="mt-2 flex items-center gap-2 text-xs text-gray-500">
                        {/* calendar */}
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                          <path
                            d="M7 3v2M17 3v2"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                          />
                          <path
                            d="M4 9h16"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                          />
                          <path
                            d="M6 5h12a2 2 0 0 1 2 2v13a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                          />
                        </svg>
                        <span>{dateLabel(it.date)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function SkeletonRow() {
  return (
    <div className="rounded-2xl border bg-white p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="h-12 w-12 animate-pulse rounded-2xl bg-gray-200" />
        <div className="flex-1">
          <div className="h-4 w-2/3 animate-pulse rounded bg-gray-200" />
          <div className="mt-2 h-4 w-1/3 animate-pulse rounded bg-gray-200" />
          <div className="mt-3 h-3 w-1/4 animate-pulse rounded bg-gray-200" />
        </div>
      </div>
    </div>
  )
}

function InputIncomeModal({
  period,
  onClose,
  onCreated,
}: {
  period: string
  onClose: () => void
  onCreated: () => void
}) {
  const [sources, setSources] = useState<FundingSource[]>([])
  const [q, setQ] = useState("")
  const [loadingSources, setLoadingSources] = useState(false)

  const [fundingSourceId, setFundingSourceId] = useState<number | "">("")
  const [amount, setAmount] = useState<string>("")
  const [date, setDate] = useState(() => {
    // default: tanggal hari ini, tapi tetap masuk bulan period bila beda
    const now = new Date()
    const yyyymm = toYYYYMM(now)
    const base = yyyymm === period ? now : new Date(Number(period.slice(0, 4)), Number(period.slice(5, 7)) - 1, 1)
    return `${base.getFullYear()}-${pad2(base.getMonth() + 1)}-${pad2(base.getDate())}`
  })
  const [description, setDescription] = useState("")

  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  async function loadSources(query: string) {
    setLoadingSources(true)
    try {
      const res = await fetch(`/api/funding-sources?q=${encodeURIComponent(query)}`, { cache: "no-store" })
      if (!res.ok) return
      const j = (await res.json()) as { items: FundingSource[] }
      setSources(Array.isArray(j.items) ? j.items : [])
    } finally {
      setLoadingSources(false)
    }
  }

  useEffect(() => {
    loadSources("")
  }, [])

  useEffect(() => {
    const t = setTimeout(() => loadSources(q), 250)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q])

  async function submit() {
    setErr(null)

    const amt = Number(String(amount).replace(/[^\d]/g, ""))
    if (!Number.isFinite(amt) || amt <= 0) {
      setErr("Nominal tidak valid.")
      return
    }
    if (!date) {
      setErr("Tanggal wajib diisi.")
      return
    }

    setSaving(true)
    try {
      const res = await fetch("/api/ledger-entries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "INCOME",
          amount: amt,
          date, // "YYYY-MM-DD"
          description: description.trim() ? description.trim() : undefined,
          fundingSourceId: fundingSourceId === "" ? undefined : Number(fundingSourceId),
        }),
      })
      const j = await res.json().catch(() => null)
      if (!res.ok) throw new Error(j?.error || `Gagal simpan (${res.status})`)
      onCreated()
    } catch (e: any) {
      setErr(e?.message || "Gagal simpan")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-20 flex items-end justify-center bg-black/40 p-4 sm:items-center">
      <div className="w-full max-w-md rounded-3xl bg-white p-5 shadow-xl">
        <div className="flex items-center justify-between">
          <div className="text-base font-semibold text-gray-800">Input Dana Masuk</div>
          <button onClick={onClose} className="rounded-full p-2 hover:bg-gray-100" aria-label="Tutup">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <path
                d="M18 6L6 18M6 6l12 12"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>

        {err ? (
          <div className="mt-3 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{err}</div>
        ) : null}

        <div className="mt-4 space-y-3">
          <div>
            <label className="text-xs font-medium text-gray-700">Sumber Dana</label>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Cari sumber dana (mis. BOS Regular)…"
              className="mt-1 w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-200"
            />
            <select
              value={fundingSourceId}
              onChange={(e) => setFundingSourceId(e.target.value ? Number(e.target.value) : "")}
              className="mt-2 w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-200"
            >
              <option value="">{loadingSources ? "Loading…" : "Pilih sumber dana (opsional)"}</option>
              {sources.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                  {s.agency ? ` — ${s.agency}` : ""}
                </option>
              ))}
            </select>
            <div className="mt-1 text-[11px] text-gray-500">
              Kalau sumber dana belum ada, buat dulu via endpoint funding-sources (yang kamu sudah bikin).
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-700">Nominal</label>
              <input
                inputMode="numeric"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="50000000"
                className="mt-1 w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-200"
              />
              <div className="mt-1 text-[11px] text-gray-500">
                Preview: {amount ? formatIDR(Number(String(amount).replace(/[^\d]/g, "")) || 0) : "—"}
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-700">Tanggal</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="mt-1 w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-200"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-gray-700">Keterangan</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Contoh: BOS Regular Triwulan 4"
              rows={3}
              className="mt-1 w-full resize-none rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-200"
            />
          </div>

          <button
            onClick={submit}
            disabled={saving}
            className="mt-1 w-full rounded-2xl bg-blue-600 px-4 py-3 font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
          >
            {saving ? "Menyimpan…" : "Simpan"}
          </button>
        </div>
      </div>
    </div>
  )
}