"use client";

import { useSession } from "next-auth/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, UserPlus, FileText, Banknote } from "lucide-react";

export default function DashboardPage() {
  const { data: session } = useSession();

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Dashboard</h2>
        <p className="text-muted-foreground">
          Selamat datang kembali, {session?.user?.name || "User"}! Berikut adalah ringkasan hari ini.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="shadow-sm border-blue-100/50 hover:shadow-md transition-all">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Total Pasien</CardTitle>
            <Users className="w-4 h-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-900">1,245</div>
            <p className="text-xs text-muted-foreground">
              +12 dari bulan lalu
            </p>
          </CardContent>
        </Card>
        
        <Card className="shadow-sm border-emerald-100/50 hover:shadow-md transition-all">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Pasien Baru Hari Ini</CardTitle>
            <UserPlus className="w-4 h-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-900">8</div>
            <p className="text-xs text-muted-foreground">
              +2 dibanding kemarin
            </p>
          </CardContent>
        </Card>
        
        <Card className="shadow-sm border-purple-100/50 hover:shadow-md transition-all">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Kunjungan</CardTitle>
            <FileText className="w-4 h-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-900">42</div>
            <p className="text-xs text-muted-foreground">
              -5 dibanding kemarin
            </p>
          </CardContent>
        </Card>
        
        <Card className="shadow-sm border-amber-100/50 hover:shadow-md transition-all">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Pendapatan Hari Ini</CardTitle>
            <Banknote className="w-4 h-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-900">Rp 4.5M</div>
            <p className="text-xs text-muted-foreground">
              +15% dari rata-rata
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4 shadow-sm border-blue-50/50">
          <CardHeader>
            <CardTitle>Grafik Kunjungan Mingguan</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px] flex items-center justify-center border-t border-gray-100 bg-gray-50/30 rounded-b-xl">
            <p className="text-muted-foreground text-sm">Grafik akan ditampilkan di sini</p>
          </CardContent>
        </Card>

        <Card className="col-span-3 shadow-sm border-blue-50/50">
          <CardHeader>
            <CardTitle>Antrean Real-time</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px] flex items-center justify-center border-t border-gray-100 bg-gray-50/30 rounded-b-xl">
            <p className="text-muted-foreground text-sm">Daftar antrean akan ditampilkan di sini</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
