"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { signIn } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { LogIn } from "lucide-react"

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const res = await signIn("credentials", {
      redirect: false,
      email,
      password,
      callbackUrl: "/civitas", // ganti kalau mau dynamic by role nanti
    })

    setLoading(false)

    if (!res) {
      setError("Login gagal. Coba lagi.")
      return
    }

    if (res.error) {
      setError("Email/Password salah atau akun tidak aktif.")
      return
    }

    // redirect manual karena redirect:false
    router.replace(res.url ?? "/civitas")
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#1E63F3] via-[#1B5BEA] to-[#1446C7]">
      <div className="mx-auto flex min-h-screen max-w-md flex-col px-6">
        {/* Header section */}
        <div className="pt-16 text-center text-white">
          <div className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-white/95 shadow-lg">
            <LogIn className="h-9 w-9 text-[#1E63F3]" />
          </div>

          <div className="mt-8 space-y-2">
            <div className="text-base font-medium">Sistem Informasi</div>
            <div className="text-base font-medium">Pengelolaan Keuangan Sekolah</div>
            <div className="text-base font-medium opacity-90">EduLedger</div>
          </div>
        </div>

        {/* Card */}
        <Card className="mt-10 rounded-3xl border-0 bg-white shadow-xl">
          <CardContent className="p-6">
            <h1 className="mb-6 text-center text-base font-semibold text-foreground">
              Masuk ke Akun Anda
            </h1>

            {error && (
              <div className="mb-4 rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </div>
            )}

            <form onSubmit={onSubmit} className="space-y-5">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Email / Username</label>
                <Input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Masukkan email"
                  className="h-12 rounded-xl"
                  autoComplete="username"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Password</label>
                <Input
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Masukkan password"
                  type="password"
                  className="h-12 rounded-xl"
                  autoComplete="current-password"
                />
              </div>

              <Button
                type="submit"
                className="h-12 w-full rounded-xl bg-[#1E63F3] text-white hover:bg-[#1957D6]"
                disabled={loading || !email || !password}
              >
                {loading ? "Memproses..." : "Masuk"}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="mt-auto pb-10 pt-12 text-center text-sm text-white/90">
          © 2025 EduLedger
        </div>
      </div>
    </div>
  )
}