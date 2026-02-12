import { NextResponse } from "next/server"
import { requireRole } from "@/lib/authz"

export async function GET() {
  try {
    await requireRole(["BENDAHARA"])

    return NextResponse.json({
      message: "Halo Bendahara, kamu boleh akses ini",
    })
  } catch (e: any) {
    if (e.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }
}
