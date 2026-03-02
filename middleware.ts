import { getToken } from "next-auth/jwt"
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })

  // belum login
  if (!token) return NextResponse.redirect(new URL("/login", req.url))

  const role = token.role as string | undefined

  // token ada tapi role hilang = session tidak valid
  if (!role) return NextResponse.redirect(new URL("/login", req.url))

  // RBAC
  if (pathname.startsWith("/bendahara") && role !== "BENDAHARA") {
    return NextResponse.redirect(new URL("/403", req.url))
  }
  if (pathname.startsWith("/kepsek") && role !== "KEPSEK") {
    return NextResponse.redirect(new URL("/403", req.url))
  }
  if (pathname.startsWith("/civitas") && role !== "CIVITAS") {
    return NextResponse.redirect(new URL("/403", req.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/civitas/:path*", "/bendahara/:path*", "/kepsek/:path*"],
}