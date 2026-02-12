import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"

export async function requireRole(allowedRoles: string[]) {
  const session = await getServerSession(authOptions)

  if (!session) {
    throw new Error("UNAUTHORIZED")
  }

  const role = (session.user as any).role

  if (!allowedRoles.includes(role)) {
    throw new Error("FORBIDDEN")
  }

  return session
}
