import { getToken } from "next-auth/jwt"
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export async function middleware(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })
  const { pathname } = req.nextUrl

  // area yang butuh login
  const protectedPaths = ["/civitas", "/bendahara", "/kepsek"]
  const isProtected = protectedPaths.some((p) => pathname.startsWith(p))
  if (!isProtected) return NextResponse.next()

  // belum login
  if (!token) return NextResponse.redirect(new URL("/login", req.url))

  const role = token.role

  // guard per role
  if (pathname.startsWith("/bendahara") && role !== "BENDAHARA") {
    return NextResponse.redirect(new URL("/403", req.url))
  }
  if (pathname.startsWith("/kepsek") && role !== "KEPSEK") {
    return NextResponse.redirect(new URL("/403", req.url))
  }
  if (pathname.startsWith("/civitas") && role !== "CIVITAS") {
    return NextResponse.redirect(new URL("/403", req.url))
  }

  
}

export const config = {
  matcher: ["/civitas/:path*", "/bendahara/:path*", "/kepsek/:path*"],
}
