"use client"

import { signOut } from "next-auth/react"

export default function LogoutButton() {
  return (
    <button
      onClick={() => signOut({ callbackUrl: "/login" })}
      style={{
        padding: "8px 12px",
        border: "1px solid black",
      }}
    >
      Logout
    </button>
  )
}
