import { redirect } from "next/navigation"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/pages/api/auth/[...nextauth]"

export default async function Home() {
  const session = await getServerSession(authOptions)

  if (!session) redirect("/login")

  const role = (session.user as any).role as string

  if (role === "BENDAHARA") redirect("/bendahara")
  if (role === "KEPSEK") redirect("/kepsek")

  // default
  redirect("/civitas")
}
