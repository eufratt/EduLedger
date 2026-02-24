"use client"
import { useRouter, useSearchParams } from "next/navigation"
import React, { useEffect, useState } from "react"

export default function InputDanaMasukPage() {
  const router = useRouter()

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="sticky top-0 z-10 bg-blue-600">
        <div className="mx-auto flex max-w-md items-center gap-3 px-4 py-4 text-white">
          <button
            className="rounded-full p-2 hover:bg-white/10"
            aria-label="Kembali"
            onClick={() => router.back()}
          >
            ←
          </button>
          <h1 className="text-lg font-semibold">Input Dana Masuk</h1>
        </div>
      </div>

      <div className="mx-auto max-w-md px-4 pb-10 pt-5">
        {/* taruh form kamu di sini */}
      </div>
    </div>
  )
}