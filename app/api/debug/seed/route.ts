import { NextResponse } from "next/server"
import { headers } from "next/headers"
import { PrismaClient, Role, CivitasType, RkabStatus } from "@prisma/client"
import bcrypt from "bcrypt"

const prisma = new PrismaClient()

// Fungsi pembantu untuk validasi API Key
async function isAuthorized() {
  const headerList = await headers()
  const apiKey = headerList.get("x-api-key")
  const secretToken = process.env.DEBUG_SEED_TOKEN
  return apiKey === secretToken
}


// POST: Menambah User Baru secara Spesifik dari Postman
export async function POST(req: Request) {
  if (!(await isAuthorized())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const body = await req.json()
    const { name, email, password, role, civitasType } = body

    if (!email || !password || !role) {
      return NextResponse.json({ error: "Missing required fields (email, password, role)" }, { status: 400 })
    }

    const passwordHash = await bcrypt.hash(password, 10)

    const newUser = await prisma.user.create({
      data: {
        name: name || "User Baru",
        email: email,
        password: passwordHash,
        role: role as Role,
        civitasType: civitasType as CivitasType || null,
        isActive: true,
      },
    })

    return NextResponse.json({ 
      message: "User created successfully", 
      user: { id: newUser.id, name: newUser.name, email: newUser.email } 
    })
  } catch (error: any) {
    if (error.code === 'P2002') {
      return NextResponse.json({ error: "Email already exists" }, { status: 400 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
