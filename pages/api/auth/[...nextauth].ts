import NextAuth, { type NextAuthOptions } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import bcrypt from "bcrypt"
import { prisma } from "@/lib/prisma"

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt" },
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const email = credentials?.email
        const password = credentials?.password
        if (!email || !password) return null

        const user = await prisma.user.findUnique({ where: { email } })
        if (!user || !user.isActive) return null

        const ok = await bcrypt.compare(password, user.password)
        if (!ok) return null

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        } as any
      },
    }),
  ],

  callbacks: {
    async jwt({ token, user }) {
      // saat login pertama, user ada
      if (user) {
        token.id = (user as any).id
        token.role = (user as any).role
        token.name = (user as any).name
        token.email = (user as any).email
      }
      return token
    },

    async session({ session, token }) {
      if (session.user) {
        ;(session.user as any).id = (token as any).id
        ;(session.user as any).role = (token as any).role
      }
      return session
    },

    async redirect({ url, baseUrl }) {
      // ✅ jangan pernah balik ke /403 setelah login
      if (url === `${baseUrl}/403` || url.startsWith(`${baseUrl}/403`)) {
        return `${baseUrl}/kepsek`
      }

      // relative path aman
      if (url.startsWith("/")) return `${baseUrl}${url}`

      // allow same-origin only
      if (url.startsWith(baseUrl)) return url

      return baseUrl
    },
  },

  pages: { signIn: "/login" },
}

export default NextAuth(authOptions)