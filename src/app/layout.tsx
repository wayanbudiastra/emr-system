import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { NextAuthProvider } from "@/components/providers/session-provider";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: "EMR System - Sistem Rekam Medis Elektronik",
  description: "Sistem Rekam Medis Elektronik (RME) untuk digitalisasi pencatatan medis di fasilitas kesehatan",
  keywords: ["EMR", "rekam medis", "elektronik", "kesehatan", "klinik"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans antialiased`}>
        <NextAuthProvider>
          <TooltipProvider>
            {children}
            <Toaster richColors position="top-right" />
          </TooltipProvider>
        </NextAuthProvider>
      </body>
    </html>
  );
}
