import { getServerSession } from "next-auth"
import { authOptions } from "@/pages/api/auth/[...nextauth]"

export async function requireSession() {
  const session = await getServerSession(authOptions)
  if (!session) throw new Error("UNAUTHORIZED")
  return session
}

export async function requireRole(allowed: string[]) {
  const session = await requireSession()
  const role = (session.user as any).role as string
  if (!allowed.includes(role)) throw new Error("FORBIDDEN")
  return session
}
