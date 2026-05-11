import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth.config";
import { NextResponse } from "next/server";
import { hasRouteAccess } from "@/config/rbac.config";
import type { Role } from "@prisma/client";

const { auth } = NextAuth(authConfig);

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const session = req.auth;

  const publicPaths = ["/login", "/register"];
  if (publicPaths.some((p) => pathname.startsWith(p))) {
    if (session) return NextResponse.redirect(new URL("/dashboard", req.url));
    return NextResponse.next();
  }

  if (pathname === "/") {
    return NextResponse.redirect(
      new URL(session ? "/dashboard" : "/login", req.url)
    );
  }

  if (!session?.user) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  // Blokir user nonaktif — hanya jika isActive eksplisit false (bukan undefined dari token lama)
  if (session.user.isActive === false) {
    return NextResponse.redirect(new URL("/login?error=ACCOUNT_DISABLED", req.url));
  }

  const userRole = session.user.role as Role;
  if (userRole && !hasRouteAccess(userRole, pathname)) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!api/auth|_next/static|_next/image|favicon.ico).*)"],
};
