import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { authConfig } from "@/lib/auth.config";
import { getPrisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  trustHost: true,
  providers: [
    Credentials({
      credentials: {
        email:    { label: "Email",    type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const prisma = await getPrisma();
        const user = await prisma.user.findUnique({
          where: { email: credentials.email as string },
        });

        if (!user) return null;
        if (!user.isActive) throw new Error("ACCOUNT_DISABLED");

        const valid = await bcrypt.compare(credentials.password as string, user.password);
        if (!valid) return null;

        // Catat waktu login terakhir (fire-and-forget)
        prisma.user.update({
          where: { id: user.id },
          data: { lastLoginAt: new Date() },
        }).catch(() => {});

        return {
          id:               user.id,
          name:             user.nama,
          email:            user.email,
          role:             user.role,
          isActive:         user.isActive,
          passwordChangedAt: user.passwordChangedAt,
        };
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      // Hanya isi token saat pertama login
      if (user) {
        token.id               = user.id as string;
        token.role             = (user as { role: string }).role;
        token.isActive         = (user as { isActive: boolean }).isActive;
        token.passwordChangedAt =
          (user as { passwordChangedAt?: Date | null }).passwordChangedAt?.getTime() ?? 0;
      }
      return token;
    },

    session({ session, token }) {
      if (!token?.sub) return session;
      session.user.id       = token.id as string;
      session.user.role     = token.role as string;
      session.user.isActive = token.isActive as boolean;
      return session;
    },
  },
});
