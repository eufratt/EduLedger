import { getToken } from "next-auth/jwt"
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  const isProtected =
    pathname.startsWith("/civitas") ||
    pathname.startsWith("/bendahara") ||
    pathname.startsWith("/kepsek")

  if (!isProtected) return NextResponse.next()

  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })
  if (!token) return NextResponse.redirect(new URL("/login", req.url))

  const role = (token as any).role as string | undefined

  // ✅ kunci: role kadang belum kebaca pas redirect pertama setelah login
  if (!role) return NextResponse.next()

  if (pathname.startsWith("/bendahara") && role !== "BENDAHARA") {
    return NextResponse.redirect(new URL("/403", req.url))
  }
  if (pathname.startsWith("/kepsek") && role !== "KEPSEK") {
    return NextResponse.redirect(new URL("/403", req.url))
  }
  if (pathname.startsWith("/civitas") && role !== "CIVITAS") {
    return NextResponse.redirect(new URL("/403", req.url))
  }
  console.log("[MW]", pathname, "token?", !!token, "role=", (token as any)?.role)

  return NextResponse.next()
}

export const config = {
  matcher: ["/civitas/:path*", "/bendahara/:path*", "/kepsek/:path*"],
}