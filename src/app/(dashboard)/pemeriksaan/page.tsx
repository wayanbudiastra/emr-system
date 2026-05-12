'use client';

import { useState, useCallback, useEffect } from 'react';
import Link           from 'next/link';
import { format, formatDistanceToNow } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import {
  Stethoscope, Bell, Clock, RefreshCw, Search,
  ChevronRight, AlertTriangle, UserCheck, Eye,
  Activity,
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input }    from '@/components/ui/input';
import { Button }   from '@/components/ui/button';
import { Badge }    from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { buttonVariants } from '@/components/ui/button';
import { cn }  from '@/lib/utils';

const TODAY = format(new Date(), 'yyyy-MM-dd');

const PENJAMIN_COLORS: Record<string, string> = {
  BPJS:     'bg-green-100 text-green-800 border-green-200',
  UMUM:     'bg-blue-100 text-blue-800 border-blue-200',
  ASURANSI: 'bg-purple-100 text-purple-800 border-purple-200',
};

type KunjunganItem = {
  id:           string;
  nomorAntrean: string;
  status:       string;
  keluhan:      string | null;
  penjamin:     string | null;
  createdAt:    string;
  panggilAt:    string | null;
  pasien: {
    id:           string;
    nomorRM:      string;
    nama:         string;
    tanggalLahir: string;
    jenisKelamin: string;
    alergi:       string | null;
  };
  dokterProfile: { id: string; spesialisasi: string | null; user: { nama: string } } | null;
  poli:          { nama: string; kode: string } | null;
  asesmen:       { beratBadan: number | null; tinggiBadan: number | null } | null;
};

function hitungUsia(tanggalLahir: string): number {
  const today = new Date();
  const lahir = new Date(tanggalLahir);
  let usia = today.getFullYear() - lahir.getFullYear();
  if (today.getMonth() < lahir.getMonth() ||
    (today.getMonth() === lahir.getMonth() && today.getDate() < lahir.getDate())) {
    usia--;
  }
  return usia;
}

function WaitingTime({ since }: { since: string }) {
  const [now] = useState(() => Date.now());
  const mins  = Math.floor((now - new Date(since).getTime()) / 60000);
  const color = mins > 30 ? 'text-red-600' : mins > 15 ? 'text-yellow-600' : 'text-muted-foreground';
  return (
    <span className={`text-xs tabular-nums ${color}`}>
      {mins < 60 ? `${mins} mnt` : `${Math.floor(mins / 60)}j ${mins % 60}m`}
    </span>
  );
}

function KunjunganTable({
  data,
  isLoading,
  onPanggil,
  panggilPending,
  showPanggil,
}: {
  data:          KunjunganItem[];
  isLoading:     boolean;
  onPanggil?:    (id: string) => void;
  panggilPending?: boolean;
  showPanggil:   boolean;
}) {
  if (isLoading) {
    return (
      <div className="space-y-2 p-4">
        {[1,2,3].map(i => <Skeleton key={i} className="h-14 w-full" />)}
      </div>
    );
  }
  if (!data.length) {
    return (
      <div className="text-center py-10 text-muted-foreground">
        <Activity className="mx-auto h-8 w-8 mb-2 opacity-30" />
        <p className="text-sm">Tidak ada pasien {showPanggil ? 'menunggu' : 'sedang diperiksa'}</p>
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-24">Antrean</TableHead>
          <TableHead>Pasien</TableHead>
          <TableHead>Dokter / Poli</TableHead>
          <TableHead>Penjamin</TableHead>
          <TableHead>Keluhan</TableHead>
          <TableHead>{showPanggil ? 'Tunggu' : 'Dipanggil'}</TableHead>
          <TableHead className="w-32">Aksi</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.map(k => {
          const usia    = hitungUsia(k.pasien.tanggalLahir);
          const hasAlergi = Boolean(k.pasien.alergi);

          return (
            <TableRow key={k.id} className={hasAlergi ? 'border-l-2 border-l-red-400' : ''}>
              <TableCell>
                <div className="font-mono font-bold text-base">{k.nomorAntrean}</div>
                {hasAlergi && (
                  <div className="flex items-center gap-1 text-xs text-red-600 mt-0.5">
                    <AlertTriangle className="h-3 w-3" /> Alergi
                  </div>
                )}
              </TableCell>
              <TableCell>
                <div className="font-medium">{k.pasien.nama}</div>
                <div className="text-xs text-muted-foreground">
                  {k.pasien.nomorRM} · {k.pasien.jenisKelamin === 'LAKI_LAKI' ? 'L' : 'P'} · {usia} thn
                </div>
              </TableCell>
              <TableCell>
                <div className="text-sm">{k.dokterProfile ? `dr. ${k.dokterProfile.user.nama}` : '—'}</div>
                <div className="text-xs text-muted-foreground">{k.poli?.nama ?? '—'}</div>
              </TableCell>
              <TableCell>
                {k.penjamin ? (
                  <Badge variant="outline" className={cn('text-xs', PENJAMIN_COLORS[k.penjamin])}>
                    {k.penjamin}
                  </Badge>
                ) : '—'}
              </TableCell>
              <TableCell className="text-sm max-w-[160px] truncate text-muted-foreground">
                {k.keluhan ?? '—'}
              </TableCell>
              <TableCell>
                {showPanggil
                  ? <WaitingTime since={k.createdAt} />
                  : k.panggilAt
                    ? <span className="text-xs text-muted-foreground tabular-nums">
                        {format(new Date(k.panggilAt), 'HH:mm')}
                      </span>
                    : '—'
                }
              </TableCell>
              <TableCell>
                <div className="flex gap-1">
                  {showPanggil && onPanggil && (
                    <Button size="sm" className="h-7 text-xs" disabled={panggilPending}
                      onClick={() => onPanggil(k.id)}>
                      <Bell className="h-3 w-3 mr-1" /> Panggil
                    </Button>
                  )}
                  <Link
                    href={`/pemeriksaan/${k.id}`}
                    className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'h-7 text-xs')}
                  >
                    <Eye className="h-3 w-3 mr-1" /> Detail
                  </Link>
                </div>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}

export default function PemeriksaanPage() {
  const qc = useQueryClient();
  const [search,  setSearch]  = useState('');
  const [tanggal]             = useState(TODAY);
  const [now]                 = useState(() => new Date());

  const { data: allData, isLoading } = useQuery({
    queryKey: ['pemeriksaan-list', tanggal],
    queryFn: async () => {
      const res = await fetch(`/api/pemeriksaan?tanggal=${tanggal}`);
      if (!res.ok) throw new Error('Gagal memuat data');
      return res.json() as Promise<KunjunganItem[]>;
    },
    staleTime: 15_000,
    refetchInterval: 30_000,
  });

  const { mutate: panggil, isPending: panggilPending } = useMutation({
    mutationFn: async (id: string) => {
      const res  = await fetch(`/api/kunjungan/${id}/panggil`, { method: 'PATCH' });
      const body: Record<string, unknown> = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(
          typeof body.error === 'string' ? body.error : `Error ${res.status}: Gagal memanggil pasien`
        );
      }
      return body;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['pemeriksaan-list'] });
      const nama = (data as { pasien?: { nama?: string } })?.pasien?.nama ?? 'Pasien';
      toast.success(`${nama} berhasil dipanggil`);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const refresh = useCallback(
    () => qc.invalidateQueries({ queryKey: ['pemeriksaan-list'] }),
    [qc]
  );

  const filtered = (allData ?? []).filter(k => {
    if (!search) return true;
    const q = search.toLowerCase();
    return k.pasien.nama.toLowerCase().includes(q) ||
           k.nomorAntrean.toLowerCase().includes(q) ||
           k.pasien.nomorRM.toLowerCase().includes(q);
  });

  const menunggu    = filtered.filter(k => k.status === 'MENUNGGU');
  const diperiksa   = filtered.filter(k => k.status === 'DALAM_PEMERIKSAAN');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Stethoscope className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Pemeriksaan</h1>
            <p className="text-sm text-muted-foreground">
              {format(now, 'EEEE, dd MMMM yyyy', { locale: idLocale })}
            </p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={refresh}>
          <RefreshCw className="h-4 w-4 mr-2" /> Refresh
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Menunggu',    value: menunggu.length,   color: 'text-yellow-600', bg: 'bg-yellow-50 border-yellow-200' },
          { label: 'Diperiksa',   value: diperiksa.length,  color: 'text-blue-600',   bg: 'bg-blue-50 border-blue-200' },
          { label: 'Total Hari', value: (allData ?? []).length, color: 'text-gray-600', bg: 'bg-gray-50 border-gray-200' },
          {
            label: 'Dengan Alergi',
            value: (allData ?? []).filter(k => k.pasien.alergi).length,
            color: 'text-red-600', bg: 'bg-red-50 border-red-200'
          },
        ].map(s => (
          <Card key={s.label} className={cn('border', s.bg)}>
            <CardContent className="pt-3 pb-3">
              <div className={cn('text-2xl font-bold', s.color)}>{isLoading ? '—' : s.value}</div>
              <div className="text-xs text-muted-foreground">{s.label}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Cari nama / no. antrean / no. RM..."
          className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {/* Tabs */}
      <Tabs defaultValue="menunggu">
        <TabsList>
          <TabsTrigger value="menunggu" className="gap-2">
            <Clock className="h-4 w-4" />
            Menunggu
            {menunggu.length > 0 && (
              <Badge className="ml-1 h-5 px-1.5 text-xs">{menunggu.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="diperiksa" className="gap-2">
            <UserCheck className="h-4 w-4" />
            Sedang Diperiksa
            {diperiksa.length > 0 && (
              <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">{diperiksa.length}</Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="menunggu">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground font-normal">
                Pasien menunggu dipanggil perawat — klik <strong>Panggil</strong> untuk konfirmasi kedatangan
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <KunjunganTable
                data={menunggu}
                isLoading={isLoading}
                onPanggil={panggil}
                panggilPending={panggilPending}
                showPanggil={true}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="diperiksa">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground font-normal">
                Pasien sedang dalam proses pemeriksaan
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <KunjunganTable
                data={diperiksa}
                isLoading={isLoading}
                showPanggil={false}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
