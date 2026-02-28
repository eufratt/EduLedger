"use client"
import { useRouter } from "next/navigation"
import React, { useState, useEffect } from "react"
import { ArrowLeft, Building2, DollarSign, Calendar, Plus, Loader2, FileText, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { z } from "zod"

const incomeSchema = z.object({
  sumberDanaId: z.string().optional(),
  sumberDanaBaru: z.string().trim().optional().refine((val) => !val || val.length >= 2, {
    message: "Nama sumber dana minimal 2 karakter",
  }),
  jumlahDana: z.string().refine((val) => !isNaN(Number(val)) && Number(val) > 0, {
    message: "Jumlah dana harus berupa angka positif",
  }),
  tanggalPenerimaan: z.string().min(1, "Tanggal penerimaan wajib diisi"),
  deskripsi: z.string().trim().max(200, "Deskripsi maksimal 200 karakter").optional(),
}).refine((data) => {
  // If "NEW" is selected, sumberDanaBaru must be present
  if (data.sumberDanaId === "NEW") {
    return !!data.sumberDanaBaru && data.sumberDanaBaru.length >= 2;
  }
  // Otherwise, sumberDanaId must be present (and not "NEW")
  return !!data.sumberDanaId;
}, {
  message: "Pilih sumber dana atau masukkan sumber dana baru",
  path: ["sumberDanaId"],
});

interface FundingSource {
  id: number
  name: string
  agency?: string
}

export default function InputDanaMasukPage() {
  const router = useRouter()
  const [formData, setFormData] = useState({
    sumberDanaId: "",
    sumberDanaBaru: "",
    jumlahDana: "",
    tanggalPenerimaan: new Date().toISOString().split("T")[0],
    deskripsi: "",
  })

  const [fundingSources, setFundingSources] = useState<FundingSource[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [errorHeader, setErrorHeader] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    fetchFundingSources()
  }, [])

  const fetchFundingSources = async () => {
    setIsLoading(true)
    try {
      const res = await fetch("/api/funding-sources")
      if (res.ok) {
        const data = await res.json()
        setFundingSources(data.items || [])
      }
    } catch (err) {
      console.error("Failed to fetch funding sources:", err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setErrors({})
    setErrorHeader(null)

    // Validation with Zod
    const result = incomeSchema.safeParse(formData)
    if (!result.success) {
      const fieldErrors: Record<string, string> = {}
      result.error.issues.forEach((issue) => {
        const path = issue.path[0]
        if (typeof path === "string") {
          fieldErrors[path] = issue.message
        }
      })
      setErrors(fieldErrors)
      setIsSubmitting(false)
      return
    }

    try {
      let finalFundingSourceId = formData.sumberDanaId && formData.sumberDanaId !== "NEW"
        ? parseInt(formData.sumberDanaId)
        : undefined

      // Jika user input sumber dana baru
      if (formData.sumberDanaId === "NEW" && formData.sumberDanaBaru) {
        const resFs = await fetch("/api/funding-sources", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: formData.sumberDanaBaru }),
        })
        if (resFs.ok) {
          const newFs = await resFs.json()
          finalFundingSourceId = newFs.id
        } else {
          throw new Error("Gagal membuat sumber dana baru")
        }
      }

      if (!finalFundingSourceId && formData.sumberDanaId !== "NEW") {
        setErrors({ sumberDanaId: "Pilih sumber dana atau masukkan sumber dana baru" })
        setIsSubmitting(false)
        return
      }

      const res = await fetch("/api/income", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: parseInt(formData.jumlahDana),
          date: new Date(formData.tanggalPenerimaan).toISOString(),
          description: formData.deskripsi || undefined,
          fundingSourceId: finalFundingSourceId,
        }),
      })

      if (res.ok) {
        setSuccess(true)
        setTimeout(() => {
          router.push("/bendahara")
          router.refresh()
        }, 5000)
      } else {
        const data = await res.json()
        setErrorHeader(data.error || "Gagal menyimpan data")
      }
    } catch (err: any) {
      setErrorHeader(err.message || "Terjadi kesalahan")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-blue-600 shadow-md">
        <div className="mx-auto flex max-w-md items-center gap-3 px-4 py-4 text-white">
          <button
            className="rounded-full p-2 hover:bg-white/10 transition-colors"
            aria-label="Kembali"
            onClick={() => router.back()}
          >
            <ArrowLeft className="h-6 w-6" />
          </button>
          <h1 className="text-xl font-semibold">Input Dana Masuk</h1>
        </div>
      </div>

      <div className="mx-auto w-full max-w-md px-4 pb-10 pt-6 space-y-6 flex-1 relative">
        {/* Success Modal */}
        {success && (
          <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" />
            <div className="relative bg-white rounded-[32px] p-8 w-full max-w-[320px] shadow-2xl animate-in fade-in zoom-in duration-300 flex flex-col items-center text-center">
              <div className="bg-green-100 p-4 rounded-full mb-6">
                <Check className="h-10 w-10 text-green-600" />
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">Data Tersimpan!</h2>
              <p className="text-gray-500 text-sm leading-relaxed">
                Penerimaan dana telah berhasil dicatat
              </p>
            </div>
          </div>
        )}

        {/* Info Box */}
        <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-blue-700 text-sm leading-relaxed">
          Input data penerimaan dana dari pemerintah atau sumber lain
        </div>

        {errorHeader && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
            {errorHeader}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Sumber Dana */}
          <Card className={`border-none shadow-sm overflow-hidden ${errors.sumberDanaId ? 'ring-2 ring-red-200' : ''}`}>
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center gap-2 text-blue-700">
                <Building2 className="h-5 w-5" />
                <span className="font-medium text-gray-700">Sumber Dana</span>
              </div>

              <select
                value={formData.sumberDanaId}
                onChange={(e) => setFormData({ ...formData, sumberDanaId: e.target.value, sumberDanaBaru: "" })}
                className="w-full bg-gray-50 border border-gray-200 rounded-md h-12 px-3 text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">-- Pilih Sumber Dana --</option>
                {fundingSources.map((fs) => (
                  <option key={fs.id} value={fs.id}>
                    {fs.name} {fs.agency ? `(${fs.agency})` : ""}
                  </option>
                ))}
                <option value="NEW"> + Tambah Sumber Dana Baru </option>
              </select>

              {errors.sumberDanaId && (
                <p className="text-xs text-red-500 font-medium">{errors.sumberDanaId}</p>
              )}

              {formData.sumberDanaId === "NEW" && (
                <div className="space-y-1">
                  <Input
                    placeholder="Masukkan nama sumber dana baru"
                    value={formData.sumberDanaBaru}
                    onChange={(e) => setFormData({ ...formData, sumberDanaBaru: e.target.value })}
                    className={`bg-gray-50 border-gray-200 h-12 mt-2 focus-visible:ring-blue-500 ${errors.sumberDanaBaru ? 'border-red-300' : ''}`}
                  />
                  {errors.sumberDanaBaru && (
                    <p className="text-xs text-red-500 font-medium">{errors.sumberDanaBaru}</p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Deskripsi (Optional) */}
          <Card className={`border-none shadow-sm overflow-hidden ${errors.deskripsi ? 'ring-2 ring-red-200' : ''}`}>
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center gap-2 text-gray-400">
                <FileText className="h-5 w-5" />
                <span className="font-medium text-gray-700">Deskripsi / Keterangan</span>
              </div>
              <Input
                placeholder="Contoh: Dana BOS Tahap 1"
                value={formData.deskripsi}
                onChange={(e) => setFormData({ ...formData, deskripsi: e.target.value })}
                className="bg-gray-50 border-gray-200 h-12 focus-visible:ring-blue-500"
              />
              {errors.deskripsi && (
                <p className="text-xs text-red-500 font-medium">{errors.deskripsi}</p>
              )}
            </CardContent>
          </Card>

          {/* Jumlah Dana */}
          <Card className={`border-none shadow-sm overflow-hidden ${errors.jumlahDana ? 'ring-2 ring-red-200' : ''}`}>
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center gap-2 text-green-600">
                <DollarSign className="h-5 w-5" />
                <span className="font-medium text-gray-700">Jumlah Dana</span>
              </div>
              <div className="relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-medium">
                  Rp
                </div>
                <Input
                  type="number"
                  placeholder="0"
                  value={formData.jumlahDana}
                  onChange={(e) => setFormData({ ...formData, jumlahDana: e.target.value })}
                  className="bg-gray-50 border-gray-200 h-12 pl-12 focus-visible:ring-blue-500"
                />
              </div>
              {errors.jumlahDana && (
                <p className="text-xs text-red-500 font-medium">{errors.jumlahDana}</p>
              )}
            </CardContent>
          </Card>

          {/* Tanggal Penerimaan */}
          <Card className={`border-none shadow-sm overflow-hidden ${errors.tanggalPenerimaan ? 'ring-2 ring-red-200' : ''}`}>
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center gap-2 text-purple-600">
                <Calendar className="h-5 w-5" />
                <span className="font-medium text-gray-700">Tanggal Penerimaan</span>
              </div>
              <Input
                type="date"
                value={formData.tanggalPenerimaan}
                onChange={(e) => setFormData({ ...formData, tanggalPenerimaan: e.target.value })}
                className="bg-gray-50 border-gray-200 h-12 focus-visible:ring-blue-500"
              />
              {errors.tanggalPenerimaan && (
                <p className="text-xs text-red-500 font-medium">{errors.tanggalPenerimaan}</p>
              )}
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="space-y-3 pt-2">
            <Button
              type="submit"
              disabled={isSubmitting || success}
              className="w-full h-14 bg-green-600 hover:bg-green-700 text-white rounded-xl font-semibold text-lg flex items-center justify-center gap-2 shadow-sm transition-all"
            >
              {isSubmitting ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Plus className="h-5 w-5" />
              )}
              {isSubmitting ? "Menyimpan..." : "Simpan Penerimaan Dana"}
            </Button>
            <Button
              type="button"
              variant="secondary"
              disabled={isSubmitting}
              className="w-full h-14 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-semibold text-lg border-none shadow-none"
              onClick={() => router.back()}
            >
              Batal
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
