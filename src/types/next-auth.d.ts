import type { DefaultSession, DefaultJWT } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: string;
      isActive: boolean;
    } & DefaultSession["user"];
  }

  interface User {
    role: string;
    isActive: boolean;
    passwordChangedAt?: Date | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT extends DefaultJWT {
    role: string;
    isActive: boolean;
    passwordChangedAt?: number;
  }
}
