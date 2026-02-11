import { PrismaClient } from "@prisma/client"
import bcrypt from "bcrypt"

const prisma = new PrismaClient()

async function main() {
  const pwd = await bcrypt.hash("password123", 10)

  await prisma.user.upsert({
    where: { email: "civitas@demo.id" },
    update: {},
    create: { name: "Civitas", email: "civitas@demo.id", password: pwd, role: "CIVITAS" },
  })
  await prisma.user.upsert({
    where: { email: "bendahara@demo.id" },
    update: {},
    create: { name: "Bendahara", email: "bendahara@demo.id", password: pwd, role: "BENDAHARA" },
  })
  await prisma.user.upsert({
    where: { email: "kepsek@demo.id" },
    update: {},
    create: { name: "Kepsek", email: "kepsek@demo.id", password: pwd, role: "KEPSEK" },
  })
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })
