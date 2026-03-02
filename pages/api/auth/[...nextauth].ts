import NextAuth, { type NextAuthOptions } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import bcrypt from "bcrypt"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const credSchema = z.object({
  email: z.string().trim().min(1).email(),
  password: z.string().min(6),
})

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt" },
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const parsed = credSchema.safeParse(credentials)
        if (!parsed.success) return null

        const { email, password } = parsed.data

        const user = await prisma.user.findUnique({ where: { email } })
        if (!user || !user.isActive) return null

        const ok = await bcrypt.compare(password, user.password)
        if (!ok) return null

        return {
          id: String(user.id),
          name: user.name,
          email: user.email,
          role: user.role,
        }
      },
    }),
  ],

  callbacks: {
    async jwt({ token, user }) {
      // saat login pertama, user ada
      if (user) {
        token.id = (user).id
        token.role = (user).role
      }
      return token
    },

    async session({ session, token }) {
      if (session.user && token.id && token.role) {
        session.user.id = token.id
        session.user.role = token.role
      }
      return session
    },

    async redirect({ url, baseUrl }) {
      if (url.startsWith("/")) return `${baseUrl}${url}`
      if (url.startsWith(baseUrl)) return url
      return baseUrl
    },
  },

  pages: { signIn: "/login" },
}

export default NextAuth(authOptions)