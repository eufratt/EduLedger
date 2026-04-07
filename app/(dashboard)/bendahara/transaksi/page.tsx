"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { 
  ArrowLeft, 
  Search, 
  TrendingDown, 
  TrendingUp, 
  Calendar,
  Wallet,
  ArrowDownCircle,
  ArrowUpCircle,
  Filter,
  Loader2
} from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"

// --- Types ---

type TransactionType = "ALL" | "INCOME" | "EXPENSE"

interface TransactionItem {
  id: number
  type: "INCOME" | "EXPENSE"
  title: string
  amount: number
  date: string
  description?: string
}

interface SummaryData {
  totalSaldo: number
  totalIncome: number
  totalExpense: number
}

// --- Helpers ---

function formatCompactIDR(n: number) {
  const abs = Math.abs(n)
  if (abs >= 1_000_000_000) return `Rp ${(n / 1_000_000_000).toFixed(1)}M`.replace(".0", "")
  if (abs >= 1_000_000) return `Rp ${(n / 1_000_000).toFixed(1)}Jt`.replace(".0", "")
  if (abs >= 1_000) return `Rp ${(n / 1_000).toFixed(1)}Rb`.replace(".0", "")
  return `Rp ${Math.round(n)}`
}

function formatFullIDR(n: number) {
  return "Rp " + Math.abs(n).toLocaleString("id-ID")
}

function formatDate(dateStr: string) {
  const date = new Date(dateStr)
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric"
  }).format(date)
}

function getTodayMonth() {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, "0")
  return `${y}-${m}`
}

// --- Components ---

export default function TransaksiPage() {
  const router = useRouter()
  
  // State
  const [period, setPeriod] = useState(getTodayMonth())
  const [activeType, setActiveType] = useState<TransactionType>("ALL")
  const [searchQuery, setSearchQuery] = useState("")
  const [loading, setLoading] = useState(true)
  const [transactions, setTransactions] = useState<TransactionItem[]>([])
  const [summary, setSummary] = useState<SummaryData>({
    totalSaldo: 0,
    totalIncome: 0,
    totalExpense: 0
  })

  const [error, setError] = useState<string | null>(null)
  
  // Fetch data
  const loadData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({
        period,
        take: "100"
      })
      if (activeType !== "ALL") params.append("type", activeType)
      if (searchQuery) params.append("q", searchQuery)

      const res = await fetch(`/api/ledger-entries?${params.toString()}`)
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        throw new Error(j.error || "Gagal memuat data")
      }
      
      const data = await res.json()
      setTransactions(data.items || [])
      
      // Use totals directly from API
      setSummary({
        totalIncome: data.totalIncome ?? 0,
        totalExpense: data.totalExpense ?? 0,
        totalSaldo: data.totalBalance ?? 0
      })
    } catch (err: any) {
      console.error(err)
      setError(err.message || "Terjadi kesalahan koneksi")
    } finally {
      setLoading(false)
    }
  }, [period, activeType, searchQuery])

  useEffect(() => {
    const timer = setTimeout(() => {
      loadData()
    }, 300) // Debounce search
    return () => clearTimeout(timer)
  }, [loadData])

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-blue-600 text-white shadow-lg">
        <div className="mx-auto flex h-16 max-w-md items-center gap-4 px-4">
          <button 
            onClick={() => router.back()}
            className="hover:bg-white/20 p-2 rounded-full transition"
          >
            <ArrowLeft className="h-6 w-6" />
          </button>
          <h1 className="text-xl font-bold">Data Transaksi</h1>
        </div>
      </header>

      <main className="mx-auto max-w-md px-4 pb-10 pt-6">
        
        {/* Error message */}
        {error && (
          <div className="mb-6 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700 flex items-center gap-3 animate-in fade-in slide-in-from-top-2 duration-300">
            <div className="bg-rose-100 rounded-full p-1">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <p className="font-medium">{error}</p>
          </div>
        )}

        {/* Period Picker */}
        <div className="mb-6 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-slate-700 font-medium">
            <Calendar className="h-5 w-5 text-blue-600" />
            <span>Pilih Periode:</span>
          </div>
          <input 
            type="month" 
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        {/* Summary horizontal scroll */}
        <div className="flex gap-4 overflow-x-auto pb-6 -mx-4 px-4 no-scrollbar">
          <SummaryCard 
            label="Masuk" 
            amount={summary.totalIncome} 
            type="income" 
            icon={<TrendingDown className="h-6 w-6 text-emerald-600" />}
          />
          <SummaryCard 
            label="Keluar" 
            amount={summary.totalExpense} 
            type="expense" 
            icon={<TrendingUp className="h-6 w-6 text-rose-600" />}
          />
          <SummaryCard 
            label="Saldo" 
            amount={summary.totalSaldo} 
            type="balance" 
            icon={<Wallet className="h-6 w-6 text-white" />}
          />
        </div>

        {/* Search */}
        <div className="relative mb-6">
          <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
          <Input 
            placeholder="Cari transaksi..." 
            className="h-12 border-slate-200 bg-white pl-12 pr-4 rounded-2xl shadow-sm focus:ring-blue-500 focus:border-blue-500"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Filters */}
        <div className="mb-6 flex items-center gap-3 overflow-x-auto no-scrollbar">
          <div className="grid place-items-center h-10 w-10 rounded-xl bg-white border border-slate-200 text-slate-500 shrink-0">
            <Filter className="h-5 w-5" />
          </div>
          <FilterChip 
            active={activeType === "ALL"} 
            onClick={() => setActiveType("ALL")} 
            label="Semua" 
          />
          <FilterChip 
            active={activeType === "INCOME"} 
            onClick={() => setActiveType("INCOME")} 
            label="Dana Masuk" 
            color="emerald"
          />
          <FilterChip 
            active={activeType === "EXPENSE"} 
            onClick={() => setActiveType("EXPENSE")} 
            label="Dana Keluar" 
            color="rose"
          />
        </div>

        {/* Transaction History Heading */}
        <div className="mb-4 text-slate-700 font-bold">Riwayat Transaksi</div>

        {/* Transaction List */}
        <div className="space-y-4">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400">
              <Loader2 className="h-10 w-10 animate-spin mb-4" />
              <p>Memuat transaksi...</p>
            </div>
          ) : transactions.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-3xl border border-dashed border-slate-200">
              <div className="mx-auto w-16 h-16 bg-slate-50 text-slate-300 rounded-full flex items-center justify-center mb-4">
                <TrendingDown className="h-8 w-8" />
              </div>
              <p className="text-slate-500 font-medium">Tidak ada transaksi ditemukan</p>
              <p className="text-slate-400 text-sm">Coba ubah filter atau periode</p>
            </div>
          ) : (
            transactions.map((tx) => (
              <TransactionCard key={tx.id} transaction={tx} />
            ))
          )}
        </div>
      </main>
    </div>
  )
}

function SummaryCard({ label, amount, type, icon }: { label: string, amount: number, type: "income" | "expense" | "balance", icon: React.ReactNode }) {
  const bgColor = {
    income: "bg-white",
    expense: "bg-white",
    balance: "bg-blue-600 text-white shadow-blue-200/50"
  }[type]

  const labelColor = type === "balance" ? "text-blue-100" : "text-slate-500"
  const amountColor = {
    income: "text-emerald-600",
    expense: "text-rose-600",
    balance: "text-white"
  }[type]

  return (
    <div className={`min-w-[140px] flex-1 rounded-3xl p-5 shadow-[0_8px_30px_rgb(0,0,0,0.04)] ${bgColor} border ${type === 'balance' ? 'border-transparent' : 'border-slate-100'}`}>
      <div className={`mb-3 flex justify-between items-start`}>
        {type !== 'balance' && (
          <div className="w-10 h-10 rounded-2xl bg-slate-50 flex items-center justify-center">
            {icon}
          </div>
        )}
        {type === 'balance' && (
           <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center text-white">
            <Wallet className="h-6 w-6" />
          </div>
        )}
      </div>
      <div>
        <div className={`text-xs font-semibold uppercase tracking-wider mb-1 ${labelColor}`}>{label}</div>
        <div className={`text-lg font-bold ${amountColor}`}>
          {formatCompactIDR(amount)}
        </div>
      </div>
    </div>
  )
}

function FilterChip({ active, onClick, label, color = "blue" }: { active: boolean, onClick: () => void, label: string, color?: "blue" | "emerald" | "rose" }) {
  const activeClasses = {
    blue: "bg-blue-600 text-white border-blue-600 shadow-lg shadow-blue-200",
    emerald: "bg-emerald-600 text-white border-emerald-600 shadow-lg shadow-emerald-200",
    rose: "bg-rose-600 text-white border-rose-600 shadow-lg shadow-rose-200"
  }[color]

  return (
    <button 
      onClick={onClick}
      className={`px-5 py-2.5 rounded-2xl text-sm font-semibold transition-all whitespace-nowrap border ${
        active 
          ? activeClasses 
          : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"
      }`}
    >
      {label}
    </button>
  )
}

function TransactionCard({ transaction }: { transaction: TransactionItem }) {
  const isIncome = transaction.type === "INCOME"
  
  return (
    <div className="group rounded-3xl bg-white p-4 shadow-[0_2px_16px_rgba(0,0,0,0.04)] border border-slate-50 transition active:scale-[0.98]">
      <div className="flex items-center gap-4">
        <div className={`grid h-14 w-14 place-items-center rounded-2xl shrink-0 ${
          isIncome ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"
        }`}>
          {isIncome ? <TrendingDown className="h-7 w-7" /> : <TrendingUp className="h-7 w-7" />}
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-bold text-slate-800 truncate mb-1 leading-tight">
            {transaction.title}
          </div>
          <div className={`text-base font-extrabold ${isIncome ? "text-emerald-600" : "text-rose-600"}`}>
            {isIncome ? "+" : "-"} {formatFullIDR(transaction.amount)}
          </div>
          <div className="mt-1.5 flex items-center gap-1.5 text-[11px] font-medium text-slate-400">
            <Calendar className="h-3 w-3" />
            {formatDate(transaction.date)}
          </div>
        </div>
      </div>
    </div>
  )
}
