"use client"

import { useRouter } from "next/navigation"
import React, { useState, useEffect, useMemo } from "react"
import { ArrowLeft, Plus, Trash2, Save, AlertTriangle, Loader2, Info, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"

interface EligibleRequest {
  id: number
  title: string
  amountRequested: number
}

interface RKASItem {
  id: string // local tracking id
  budgetRequestId?: number
  name?: string
  amountAllocated: string
  isManual: boolean
}

export default function CreateRKASPage() {
  const router = useRouter()
  const [fiscalYear, setFiscalYear] = useState(new Date().getFullYear().toString())
  const [totalBalance, setTotalBalance] = useState<number>(0)
  const [eligibleRequests, setEligibleRequests] = useState<EligibleRequest[]>([])
  const [items, setItems] = useState<RKASItem[]>([
    { id: crypto.randomUUID(), amountAllocated: "", isManual: false }
  ])
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [errorHeader, setErrorHeader] = useState<string | null>(null)

  useEffect(() => {
    fetchInitialData()
  }, [])

  const fetchInitialData = async () => {
    setIsLoading(true)
    try {
      const [balanceRes, eligibleRes] = await Promise.all([
        fetch("/api/bendahara/rkab/balance"),
        fetch("/api/bendahara/budget-requests/eligible")
      ])

      if (balanceRes.ok) {
        const data = await balanceRes.json()
        setTotalBalance(data.totalSaldo)
      }
      if (eligibleRes.ok) {
        const data = await eligibleRes.json()
        setEligibleRequests(data.items || [])
      }
    } catch (err) {
      console.error("Failed to fetch initial data:", err)
    } finally {
      setIsLoading(false)
    }
  }

  const addItem = () => {
    setItems([...items, { id: crypto.randomUUID(), amountAllocated: "", isManual: false }])
  }

  const removeItem = (id: string) => {
    if (items.length > 1) {
      setItems(items.filter(it => it.id !== id))
    }
  }

  const updateItem = (id: string, updates: Partial<RKASItem>) => {
    setItems(items.map(it => {
      if (it.id === id) {
        const updated = { ...it, ...updates }
        
        // Auto fill amount if a budget request is selected
        if (updates.budgetRequestId && !updated.isManual) {
          const br = eligibleRequests.find(r => r.id === updates.budgetRequestId)
          if (br) {
            updated.amountAllocated = br.amountRequested.toString()
          }
        }
        
        return updated
      }
      return it
    }))
  }

  const totalPlanned = useMemo(() => {
    return items.reduce((acc, it) => acc + (Number(it.amountAllocated) || 0), 0)
  }, [items])

  const isOverBudget = totalPlanned > totalBalance

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setErrorHeader(null)

    // Basic validation
    if (!fiscalYear) {
      setErrorHeader("Tahun ajaran wajib diisi")
      setIsSubmitting(false)
      return
    }

    const payload = {
      fiscalYear: parseInt(fiscalYear),
      items: items.map(it => ({
        budgetRequestId: it.isManual ? undefined : it.budgetRequestId,
        name: it.isManual ? it.name : undefined,
        amountAllocated: parseInt(it.amountAllocated || "0"),
        note: ""
      })).filter(it => it.name || it.budgetRequestId)
    }

    if (payload.items.length === 0) {
      setErrorHeader("Minimal harus ada satu kegiatan yang diisi")
      setIsSubmitting(false)
      return
    }

    try {
      const res = await fetch("/api/bendahara/rkab", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      })

      if (res.ok) {
        setSuccess(true)
        setTimeout(() => {
          router.push("/bendahara")
          router.refresh()
        }, 3000)
      } else {
        const data = await res.json()
        setErrorHeader(data.error || "Gagal menyimpan RKAS")
      }
    } catch (err: any) {
      setErrorHeader(err.message || "Terjadi kesalahan")
    } finally {
      setIsSubmitting(false)
    }
  }

  const formatIDR = (n: number) => {
    return "Rp " + n.toLocaleString("id-ID")
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-transparent flex flex-col items-center">
      <div className="w-full max-w-md bg-white min-h-screen shadow-2xl relative flex flex-col">
        {/* Header */}
        <div className="sticky top-0 z-20 bg-blue-600 shadow-md">
          <div className="flex items-center gap-4 px-4 py-4 text-white">
            <button 
              onClick={() => router.back()}
              className="p-1 hover:bg-white/10 rounded-full transition-colors"
            >
              <ArrowLeft className="h-6 w-6" />
            </button>
            <h1 className="text-xl font-semibold">Membuat RKAS</h1>
          </div>
        </div>

        <div className="flex-1 px-4 py-6 space-y-6 overflow-y-auto">
          {/* Info Modal */}
          {success && (
            <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
              <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" />
              <div className="relative bg-white rounded-[32px] p-8 w-full max-w-[320px] shadow-2xl animate-in fade-in zoom-in duration-300 flex flex-col items-center text-center">
                <div className="bg-green-100 p-4 rounded-full mb-6">
                  <Check className="h-10 w-10 text-green-600" />
                </div>
                <h2 className="text-xl font-bold text-gray-900 mb-2">RKAS Dikirim!</h2>
                <p className="text-gray-500 text-sm leading-relaxed">
                  RKAS berhasil dibuat dan dikirim ke Kepala Sekolah untuk disetujui.
                </p>
              </div>
            </div>
          )}

          {/* Intro Text */}
          <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-sm text-blue-700 leading-relaxed">
            Rencana Kegiatan dan Anggaran Sekolah (RKAS) untuk tahun ajaran
          </div>

          {errorHeader && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
              <span>{errorHeader}</span>
            </div>
          )}

          {/* Tahun Ajaran */}
          <Card className="border-slate-100 shadow-sm rounded-2xl overflow-hidden">
            <CardContent className="p-5 space-y-3">
              <label className="text-sm font-medium text-slate-700">Tahun Ajaran</label>
              <Input
                type="number"
                placeholder="2024"
                value={fiscalYear}
                onChange={(e) => setFiscalYear(e.target.value)}
                className="bg-gray-50 border-gray-200 h-14 rounded-xl text-lg focus-visible:ring-blue-500"
              />
            </CardContent>
          </Card>

          {/* Total Anggaran Tersedia (Fetched) */}
          <Card className="border-slate-100 shadow-sm rounded-2xl overflow-hidden">
            <CardContent className="p-5 space-y-3">
              <div className="flex items-center gap-2 text-emerald-600 font-medium">
                <Info className="h-5 w-5" />
                <span>Total Anggaran Tersedia</span>
              </div>
              <div className="relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-medium">
                  Rp
                </div>
                <Input
                  disabled
                  value={totalBalance.toLocaleString("id-ID")}
                  className="bg-gray-50 border-gray-200 h-14 pl-12 rounded-xl text-lg text-slate-700 font-semibold"
                />
              </div>
            </CardContent>
          </Card>

          {/* Daftar Kegiatan */}
          <div className="space-y-4">
            <div className="flex items-center justify-between px-1">
              <h2 className="font-semibold text-slate-800">Daftar Kegiatan</h2>
              <Button 
                onClick={addItem}
                type="button"
                size="sm" 
                className="bg-blue-600 hover:bg-blue-700 rounded-lg flex items-center gap-1 h-9"
              >
                <Plus className="h-4 w-4" />
                Tambah
              </Button>
            </div>

            {items.map((it, index) => (
              <Card key={it.id} className="border-slate-100 shadow-sm rounded-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-300">
                <CardContent className="p-5 space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-50 pb-3">
                    <span className="font-medium text-slate-400 text-sm italic">Kegiatan {index + 1}</span>
                    <button 
                      onClick={() => removeItem(it.id)}
                      className="text-red-500 hover:bg-red-50 p-1.5 rounded-lg transition-colors"
                      type="button"
                    >
                      <Trash2 className="h-5 w-5" />
                    </button>
                  </div>

                  <div className="space-y-3">
                    <select
                      className="w-full h-12 px-3 rounded-xl bg-gray-50 border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                      value={it.isManual ? "MANUAL" : (it.budgetRequestId?.toString() || "")}
                      onChange={(e) => {
                        const val = e.target.value
                        if (val === "MANUAL") {
                          updateItem(it.id, { isManual: true, budgetRequestId: undefined })
                        } else {
                          updateItem(it.id, { isManual: false, budgetRequestId: parseInt(val) || undefined })
                        }
                      }}
                    >
                      <option value="">-- Pilih Kegiatan --</option>
                      <option value="MANUAL" className="font-semibold text-blue-600">+ Tambah Kegiatan Manual</option>
                      <optgroup label="Pengajuan Tersedia">
                        {eligibleRequests.map(r => (
                          <option key={r.id} value={r.id}>{r.title}</option>
                        ))}
                      </optgroup>
                    </select>

                    {it.isManual && (
                      <Input
                        placeholder="Nama kegiatan manual..."
                        value={it.name || ""}
                        onChange={(e) => updateItem(it.id, { name: e.target.value })}
                        className="bg-gray-50 border-gray-200 h-12 rounded-xl focus-visible:ring-blue-500"
                      />
                    )}

                    <div className="relative">
                      <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-medium">
                        Rp
                      </div>
                      <Input
                        type="number"
                        placeholder="Anggaran"
                        value={it.amountAllocated}
                        onChange={(e) => updateItem(it.id, { amountAllocated: e.target.value })}
                        className="bg-gray-50 border-gray-200 h-12 pl-12 rounded-xl focus-visible:ring-blue-500"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Summary Section */}
          <div className="pt-4 border-t border-slate-100">
            <div className="flex items-center justify-between text-slate-600 mb-2 font-medium">
              <span>Total Rencana Anggaran:</span>
              <span className={`text-lg font-bold ${isOverBudget ? 'text-red-600' : 'text-slate-900'}`}>
                {formatIDR(totalPlanned)}
              </span>
            </div>
            
            {isOverBudget && (
              <div className="flex items-center gap-2 text-xs text-red-600 bg-red-50 p-3 rounded-lg border border-red-100 mt-2">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <span>Peringatan: Total rencana melebihi anggaran yang tersedia!</span>
              </div>
            )}
          </div>

          {/* Simpan Button */}
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || success}
            className="w-full h-14 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-bold text-lg flex items-center justify-center gap-2 shadow-lg transition-transform active:scale-95 disabled:opacity-70 disabled:scale-100"
          >
            {isSubmitting ? (
              <Loader2 className="h-6 w-6 animate-spin" />
            ) : (
              <Save className="h-6 w-6" />
            )}
            {isSubmitting ? "Menyimpan..." : "Simpan RKAS"}
          </Button>

          {/* Catatan Box */}
          <div className="bg-amber-50 border border-amber-100 rounded-2xl p-5 space-y-3">
            <div className="flex items-center gap-2 text-amber-800 font-bold">
              <span>📌 Catatan:</span>
            </div>
            <ul className="text-xs text-amber-700 space-y-2 list-none">
              <li>• RKAS akan dikirim ke Kepala Sekolah untuk persetujuan</li>
              <li>• Pastikan semua kegiatan dan anggaran sudah sesuai</li>
              <li className="font-semibold text-red-700">• Total anggaran tidak boleh melebihi dana tersedia</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
