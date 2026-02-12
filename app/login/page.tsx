"use client"

import { signIn } from "next-auth/react"
import { useState } from "react"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [err, setErr] = useState<string | null>(null)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErr(null)

    const res = await signIn("credentials", {
      email,
      password,
      redirect: false,
    })

    if (res?.error) {
      setErr("Email/password salah atau akun nonaktif.")
      return
    }

    // sementara: masuk ke home dulu
    window.location.href = "/"
  }

  return (
    <div className="p-6 max-w-sm">
      <h1 className="text-xl font-semibold mb-4">Login</h1>

      <form onSubmit={onSubmit} className="space-y-3">
        <input
          className="border p-2 w-full"
          placeholder="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <input
          className="border p-2 w-full"
          placeholder="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        {err && <p className="text-sm">{err}</p>}
        <button className="border p-2 w-full" type="submit">
          Login
        </button>
      </form>
    </div>
  )
}
