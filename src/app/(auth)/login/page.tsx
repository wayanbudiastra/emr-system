"use client";

import { useState, Suspense } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Heart, Loader2, Mail, Lock, ShieldCheck, AlertCircle } from "lucide-react";
import { toast } from "sonner";

const ERROR_MESSAGES: Record<string, string> = {
  ACCOUNT_DISABLED:  "Akun Anda telah dinonaktifkan. Hubungi administrator.",
  CredentialsSignin: "Email atau password salah.",
  SessionExpired:    "Sesi Anda telah kadaluarsa. Silakan login kembali.",
};

function LoginForm() {
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const router       = useRouter();
  const searchParams = useSearchParams();

  const urlError = searchParams.get("error") ?? "";
  const errorMsg = ERROR_MESSAGES[urlError] ?? "";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const result = await signIn("credentials", { email, password, redirect: false });
      if (result?.error) {
        const msg = result.error === "ACCOUNT_DISABLED"
          ? ERROR_MESSAGES.ACCOUNT_DISABLED
          : "Email atau password salah. Silakan coba lagi.";
        toast.error("Login gagal", { description: msg });
      } else {
        toast.success("Login berhasil!");
        router.push("/dashboard");
        router.refresh();
      }
    } catch {
      toast.error("Terjadi kesalahan", { description: "Tidak dapat terhubung ke server." });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="animate-fade-in">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl gradient-primary shadow-lg shadow-blue-500/25 mb-4">
          <Heart className="w-8 h-8 text-white" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 tracking-tight">EMR System</h1>
        <p className="text-sm text-gray-500 mt-1">Sistem Rekam Medis Elektronik</p>
      </div>

      <Card className="shadow-xl shadow-blue-900/5 border-white/50 backdrop-blur-sm bg-white/80 dark:bg-gray-900/80">
        <CardHeader className="space-y-1 pb-4">
          <CardTitle className="text-xl font-semibold text-center">Masuk ke Akun Anda</CardTitle>
          <CardDescription className="text-center">Masukkan email dan password untuk melanjutkan</CardDescription>
        </CardHeader>
        <CardContent>
          {/* Error dari URL (redirect dari middleware) */}
          {errorMsg && (
            <div className="mb-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
              <div className="flex items-center gap-2 mb-1">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                <span>{errorMsg}</span>
              </div>
              {urlError === "ACCOUNT_DISABLED" && (
                <a
                  href="/api/auth/clear-session"
                  className="mt-2 inline-block text-xs underline text-red-600 hover:text-red-800"
                >
                  Klik di sini untuk bersihkan sesi dan coba lagi
                </a>
              )}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input id="email" type="email" placeholder="nama@klinik.com"
                  value={email} onChange={(e) => setEmail(e.target.value)}
                  className="pl-10 h-11" required disabled={isLoading} />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input id="password" type="password" placeholder="••••••••"
                  value={password} onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 h-11" required disabled={isLoading} />
              </div>
            </div>

            <Button type="submit"
              className="w-full h-11 gradient-primary hover:opacity-90 text-white font-medium"
              disabled={isLoading}>
              {isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Memproses...</> : "Masuk"}
            </Button>
          </form>

          {process.env.NODE_ENV === "development" && (
            <div className="mt-6 p-3 rounded-lg bg-blue-50/80 border border-blue-100">
              <div className="flex items-center gap-2 mb-2">
                <ShieldCheck className="h-4 w-4 text-blue-600" />
                <span className="text-xs font-semibold text-blue-700">Demo Credentials (password: Admin@1234)</span>
              </div>
              <div className="space-y-1 text-xs text-blue-600/80">
                <p><span className="font-medium">Super Admin:</span> superadmin@emr.local</p>
                <p><span className="font-medium">Dokter:</span> dokter@emr.local</p>
                <p><span className="font-medium">Perawat:</span> perawat@emr.local</p>
                <p><span className="font-medium">Admission:</span> admission@emr.local</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <p className="text-center text-xs text-gray-400 mt-6">© 2026 EMR System. Hak cipta dilindungi.</p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
