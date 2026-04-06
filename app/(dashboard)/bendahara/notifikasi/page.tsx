"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { ChevronLeft, Bell, BellOff, CheckCircle2, Info, AlertTriangle, XCircle, Clock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "sonner"
import { NotificationType } from "@prisma/client"

type Notification = {
  id: number
  userId: number
  title: string
  message: string
  type: NotificationType
  isRead: boolean
  link: string | null
  createdAt: string
}

type NotificationResponse = {
  data: Notification[]
  meta: {
    total: number
    page: number
    limit: number
    unreadCount: number
  }
}

export default function NotifikasiBendaharaPage() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<"all" | "unread">("all")
  const [data, setData] = useState<NotificationResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [markingAll, setMarkingAll] = useState(false)

  const fetchNotifications = async (tab: "all" | "unread") => {
    setLoading(true)
    try {
      const res = await fetch(`/api/notifications?filter=${tab}&limit=20`)
      if (!res.ok) throw new Error("Gagal memuat notifikasi")
      const json = await res.json()
      setData(json)
    } catch (error) {
      console.error(error)
      toast.error("Gagal memuat notifikasi")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchNotifications(activeTab)
  }, [activeTab])

  const markAsRead = async (id: number, link: string | null) => {
    try {
      await fetch(`/api/notifications/${id}/read`, { method: "PATCH" })
      // Re-fetch to update counts and list
      fetchNotifications(activeTab)
      if (link) router.push(link)
    } catch (error) {
      console.error(error)
    }
  }

  const markAllAsRead = async () => {
    setMarkingAll(true)
    try {
      const res = await fetch("/api/notifications", { method: "PATCH" })
      if (!res.ok) throw new Error("Gagal memperbarui notifikasi")
      toast.success("Semua notifikasi ditandai sebagai dibaca")
      fetchNotifications(activeTab)
    } catch (error) {
      console.error(error)
      toast.error("Gagal memperbarui notifikasi")
    } finally {
      setMarkingAll(false)
    }
  }

  const getIcon = (type: NotificationType) => {
    switch (type) {
      case "SUCCESS": return <CheckCircle2 className="h-5 w-5 text-emerald-600" />
      case "WARNING": return <AlertTriangle className="h-5 w-5 text-amber-600" />
      case "ERROR": return <XCircle className="h-5 w-5 text-rose-600" />
      default: return <Info className="h-5 w-5 text-blue-600" />
    }
  }

  const getBgColor = (type: NotificationType) => {
    switch (type) {
      case "SUCCESS": return "bg-emerald-100"
      case "WARNING": return "bg-amber-100"
      case "ERROR": return "bg-rose-100"
      default: return "bg-blue-100"
    }
  }

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMins / 60)
    const diffDays = Math.floor(diffHours / 24)

    if (diffMins < 1) return "Baru saja"
    if (diffMins < 60) return `${diffMins} menit yang lalu`
    if (diffHours < 24) return `${diffHours} jam yang lalu`
    if (diffDays === 1) return "Kemarin"
    return date.toLocaleDateString("id-ID", { day: "numeric", month: "short" })
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full bg-blue-600 text-white shadow max-w-md">
        <div className="flex h-14 items-center px-4 gap-4">
          <button onClick={() => router.back()} className="p-1 hover:bg-white/10 rounded-full transition">
            <ChevronLeft className="h-6 w-6" />
          </button>
          <h1 className="text-lg font-semibold flex-1">Notifikasi</h1>
        </div>
      </header>

      <main className="w-full max-w-md px-4 py-6 flex flex-col gap-6 pb-24">
        {/* Summary Card */}
        <Card className="rounded-2xl border-none shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden">
          <CardContent className="p-5 flex items-center justify-between">
            <div className="space-y-1">
              <div className="text-sm text-slate-500 font-medium">Total Notifikasi</div>
              <div className="text-2xl font-bold text-slate-900">{loading ? "..." : data?.meta.total || 0} notifikasi</div>
            </div>
            {data && data.meta.unreadCount > 0 && (
              <Badge className="bg-rose-500 hover:bg-rose-500 text-white border-none px-3 py-1 rounded-full font-semibold">
                {data.meta.unreadCount} Belum Dibaca
              </Badge>
            )}
          </CardContent>
        </Card>

        {/* Tabs */}
        <div className="flex p-1 bg-slate-200/50 rounded-xl">
          <button
            onClick={() => setActiveTab("all")}
            className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${activeTab === "all" ? "bg-white text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
          >
            Semua ({data?.meta.total || 0})
          </button>
          <button
            onClick={() => setActiveTab("unread")}
            className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${activeTab === "unread" ? "bg-rose-500 text-white shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
          >
             Belum Dibaca ({data?.meta.unreadCount || 0})
          </button>
        </div>

        {/* List */}
        <div className="space-y-4">
          {loading ? (
            Array(4).fill(0).map((_, i) => (
              <div key={i} className="flex gap-4 p-4 bg-white rounded-2xl shadow-sm border border-slate-100">
                <Skeleton className="h-10 w-10 rounded-xl shrink-0" />
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-3 w-1/4" />
                </div>
              </div>
            ))
          ) : !data || data.data.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400">
              <BellOff className="h-16 w-16 mb-4 opacity-20" />
              <p className="font-medium">Tidak ada notifikasi</p>
            </div>
          ) : (
            data.data.map((n) => (
              <div
                key={n.id}
                onClick={() => markAsRead(n.id, n.link)}
                className={`relative group flex gap-4 p-4 rounded-2xl transition-all cursor-pointer border ${n.isRead ? "bg-white border-slate-100 opacity-75" : "bg-white border-blue-100 shadow-[0_4px_20px_rgba(59,130,246,0.08)]"}`}
              >
                {!n.isRead && <div className="absolute top-4 right-4 h-2 w-2 bg-blue-500 rounded-full" />}
                
                <div className={`h-11 w-11 rounded-xl shrink-0 flex items-center justify-center ${getBgColor(n.type)}`}>
                  {getIcon(n.type)}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="font-bold text-slate-900 group-hover:text-blue-600 transition truncate">{n.title}</div>
                  <p className="mt-1 text-sm text-slate-600 line-clamp-2 leading-relaxed">{n.message}</p>
                  <div className="mt-3 flex items-center gap-1.5 text-[11px] font-medium text-slate-400 uppercase tracking-wider">
                    <Clock className="h-3 w-3" />
                    {formatTime(n.createdAt)}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer Action */}
        <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md bg-white border-t border-slate-100 p-4 pb-8 flex justify-center">
            <button 
                onClick={markAllAsRead}
                disabled={markingAll || (data?.meta.unreadCount || 0) === 0}
                className="text-blue-600 font-bold text-sm hover:underline disabled:text-slate-400 disabled:no-underline transition"
            >
                {markingAll ? "Memperbarui..." : "Tandai Semua Sudah Dibaca"}
            </button>
        </div>
      </main>
    </div>
  )
}
