import { NextResponse } from "next/server";

// Hapus semua cookie session NextAuth agar user bisa login bersih
export async function GET() {
  const res = NextResponse.redirect(
    new URL("/login", process.env.NEXTAUTH_URL ?? "http://localhost:3000")
  );

  // Hapus semua cookie yang mungkin menyimpan session NextAuth
  const cookieNames = [
    "next-auth.session-token",
    "__Secure-next-auth.session-token",
    "next-auth.csrf-token",
    "__Host-next-auth.csrf-token",
    "next-auth.callback-url",
  ];

  for (const name of cookieNames) {
    res.cookies.set(name, "", { maxAge: 0, path: "/" });
  }

  return res;
}
