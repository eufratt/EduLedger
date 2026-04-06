"use client"

import { CheckCircle2 } from "lucide-react"
import { Dialog, DialogContent } from "@/components/ui/dialog"

interface SuccessModalProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    title?: string
    message?: string
}

export function SuccessModal({ 
    open, 
    onOpenChange, 
    title = "Berhasil", 
    message = "Laporan berhasil didownload" 
}: SuccessModalProps) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md rounded-3xl p-8 flex flex-col items-center text-center gap-4">
                <div className="h-20 w-20 rounded-full bg-emerald-50 grid place-items-center mb-2">
                    <CheckCircle2 className="h-10 w-10 text-emerald-500" />
                </div>
                <h2 className="text-xl font-bold text-slate-800">{title}</h2>
                <p className="text-slate-600 leading-relaxed max-w-[240px]">
                    {message}
                </p>
                <div className="mt-2 w-full h-1 bg-slate-50 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500 w-full animate-in slide-in-from-left duration-1000" />
                </div>
            </DialogContent>
        </Dialog>
    )
}
