"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Heart, Loader2, Mail, Lock, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        toast.error("Login gagal", {
          description: "Email atau password salah. Silakan coba lagi.",
        });
      } else {
        toast.success("Login berhasil!", {
          description: "Selamat datang di EMR System.",
        });
        router.push("/dashboard");
        router.refresh();
      }
    } catch {
      toast.error("Terjadi kesalahan", {
        description: "Tidak dapat terhubung ke server.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="animate-fade-in">
      {/* Logo Section */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl gradient-primary shadow-lg shadow-blue-500/25 mb-4">
          <Heart className="w-8 h-8 text-white" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
          EMR System
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Sistem Rekam Medis Elektronik
        </p>
      </div>

      {/* Login Card */}
      <Card className="shadow-xl shadow-blue-900/5 border-white/50 backdrop-blur-sm bg-white/80">
        <CardHeader className="space-y-1 pb-4">
          <CardTitle className="text-xl font-semibold text-center">
            Masuk ke Akun Anda
          </CardTitle>
          <CardDescription className="text-center">
            Masukkan email dan password untuk melanjutkan
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium">
                Email
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="email"
                  type="email"
                  placeholder="nama@klinik.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10 h-11 bg-white/50 border-gray-200 focus:border-blue-400 focus:ring-blue-400/20 transition-all"
                  required
                  disabled={isLoading}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium">
                Password
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 h-11 bg-white/50 border-gray-200 focus:border-blue-400 focus:ring-blue-400/20 transition-all"
                  required
                  disabled={isLoading}
                />
              </div>
            </div>

            <Button
              type="submit"
              className="w-full h-11 gradient-primary hover:opacity-90 transition-all duration-200 shadow-lg shadow-blue-500/25 text-white font-medium"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Memproses...
                </>
              ) : (
                "Masuk"
              )}
            </Button>
          </form>

          {/* Demo Credentials — hanya tampil di development */}
          {process.env.NODE_ENV === "development" && (
            <div className="mt-6 p-3 rounded-lg bg-blue-50/80 border border-blue-100">
              <div className="flex items-center gap-2 mb-2">
                <ShieldCheck className="h-4 w-4 text-blue-600" />
                <span className="text-xs font-semibold text-blue-700">Demo Credentials</span>
              </div>
              <div className="space-y-1 text-xs text-blue-600/80">
                <p><span className="font-medium">Super Admin:</span> admin@emr.com / admin123</p>
                <p><span className="font-medium">Dokter:</span> dokter@emr.com / dokter123</p>
                <p><span className="font-medium">Perawat:</span> perawat@emr.com / perawat123</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Footer */}
      <p className="text-center text-xs text-gray-400 mt-6">
        © 2026 EMR System. Hak cipta dilindungi.
      </p>
    </div>
  );
}
