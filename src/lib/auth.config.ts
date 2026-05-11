import type { NextAuthConfig } from "next-auth";

export const authConfig: NextAuthConfig = {
  session: { strategy: "jwt" },
  providers: [],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.role     = (user as { role: string }).role;
        token.id       = user.id as string;
        token.isActive = (user as { isActive: boolean }).isActive;
        token.passwordChangedAt =
          (user as { passwordChangedAt?: Date | null }).passwordChangedAt?.getTime() ?? 0;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id       = token.id as string;
        session.user.role     = token.role as string;
        session.user.isActive = token.isActive as boolean;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
    error:  "/login",
  },
};
