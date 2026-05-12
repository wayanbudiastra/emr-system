'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { differenceInYears, format } from 'date-fns';
import {
  Search, Pill, FlaskConical, Lock, CheckCircle2, Trash2,
  AlertTriangle, RefreshCw, User,
} from 'lucide-react';
import { Input }    from '@/components/ui/input';
import { Button }   from '@/components/ui/button';
import { Badge }    from '@/components/ui/badge';
import { Label }    from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';

// ── Types ──────────────────────────────────────────────────────
type Pasien = {
  id:           string;
  nomorRM:      string;
  nama:         string;
  tanggalLahir: string;
  jenisKelamin: string;
};

type ItemResep = {
  id:         string;
  obatId:     string;
  jumlah:     number;
  aturanPakai: string | null;
  catatan:    string | null;
  obat:       { id: string; nama: string; satuan: string; stok: number; harga: number; hargaBPJS: number | null };
};

type RacikanBahan = {
  id:     string;
  obatId: string;
  jumlah: number;
  satuan: string | null;
  obat:   { id: string; nama: string; satuan: string; stok: number };
};

type RacikanHeader = {
  id:            string;
  namaRacikan:   string;
  metode:        string;
  jumlahSediaan: number;
  aturanPakai:   string | null;
  bahan:         RacikanBahan[];
};

type Resep = {
  id:             string;
  status:         string;
  catatan:        string | null;
  createdAt:      string;
  dokterProfile?: { user: { nama: string } } | null;
  kunjungan: {
    id:       string;
    tanggal:  string;
    penjamin: string | null;
    pasien:   Pasien;
    poli:     { nama: string } | null;
  };
  items:          ItemResep[];
  racikanHeaders: RacikanHeader[];
};

const formatRupiah = (n: number) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n);

const STATUS_OPTIONS = [
  { value: 'MENUNGGU',   label: 'Menunggu'     },
  { value: 'DIPROSES',   label: 'Diproses'     },
  { value: 'SIAP',       label: 'Dikonfirmasi' },
  { value: 'DIAMBIL',    label: 'Diambil'      },
  { value: 'DIBATALKAN', label: 'Dibatalkan'   },
];

// ── Edit Item Dialog ──────────────────────────────────────────
function EditItemDialog({
  item,
  kunjunganId,
  resepId,
  onClose,
}: {
  item:        ItemResep;
  kunjunganId: string;
  resepId:     string;
  onClose:     () => void;
}) {
  const qc = useQueryClient();
  const [jumlah,      setJumlah]      = useState(item.jumlah);
  const [aturanPakai, setAturanPakai] = useState(item.aturanPakai ?? '');

  const { mutate: update, isPending } = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/kunjungan/${kunjunganId}/resep/${resepId}/item/${item.id}`, {
        method:  'PUT',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ jumlah, aturanPakai: aturanPakai || null }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error ?? 'Gagal mengubah');
      return body;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['farmasi-resep'] });
      toast.success('Item diperbarui');
      onClose();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Edit Item: {item.obat.nama}</DialogTitle>
      </DialogHeader>
      <div className="space-y-4 py-2">
        <div className="space-y-1">
          <Label className="text-xs">Jumlah ({item.obat.satuan}) — Stok tersedia: {item.obat.stok}</Label>
          <Input
            type="number" min={1} max={item.obat.stok}
            value={jumlah}
            onChange={e => setJumlah(Math.max(1, parseInt(e.target.value) || 1))}
          />
          {jumlah > item.obat.stok && (
            <p className="text-xs text-destructive flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" /> Melebihi stok tersedia
            </p>
          )}
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Aturan Pakai (Signa)</Label>
          <Input placeholder="3x1 tablet/hari" value={aturanPakai}
            onChange={e => setAturanPakai(e.target.value)} />
        </div>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onClose}>Batal</Button>
        <Button onClick={() => update()} disabled={isPending || jumlah > item.obat.stok}>
          {isPending ? 'Menyimpan...' : 'Simpan'}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}

// ── Resep Detail Card ─────────────────────────────────────────
function ResepDetailCard({ resep }: { resep: Resep }) {
  const qc  = useQueryClient();
  const kunjunganId = resep.kunjungan.id;
  const isLocked    = ['SIAP', 'DIAMBIL', 'DIBATALKAN'].includes(resep.status);
  const isBPJS      = resep.kunjungan.penjamin === 'BPJS';
  const [editItem, setEditItem] = useState<ItemResep | null>(null);

  const usia = differenceInYears(new Date(), new Date(resep.kunjungan.pasien.tanggalLahir));

  const totalResep =
    resep.items.reduce((s, i) => {
      const h = isBPJS ? (i.obat.hargaBPJS ?? i.obat.harga) : i.obat.harga;
      return s + h * i.jumlah;
    }, 0);

  const { mutate: deleteItem, isPending: delPending } = useMutation({
    mutationFn: async (iid: string) => {
      const res = await fetch(`/api/kunjungan/${kunjunganId}/resep/${resep.id}/item/${iid}`, { method: 'DELETE' });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error ?? 'Gagal menghapus');
      return body;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['farmasi-resep'] }); toast.success('Item dihapus'); },
    onError: (e: Error) => toast.error(e.message),
  });

  const { mutate: deleteRacikan } = useMutation({
    mutationFn: async (hid: string) => {
      const res = await fetch(`/api/kunjungan/${kunjunganId}/resep/${resep.id}/racikan/${hid}`, { method: 'DELETE' });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error ?? 'Gagal menghapus');
      return body;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['farmasi-resep'] }); toast.success('Racikan dihapus'); },
    onError: (e: Error) => toast.error(e.message),
  });

  const { mutate: konfirmasi, isPending: konfPending } = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/kunjungan/${kunjunganId}/resep/${resep.id}/konfirmasi`, { method: 'PATCH' });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error ?? 'Gagal konfirmasi');
      return body;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['farmasi-resep'] });
      toast.success('Resep dikonfirmasi — stok dipotong & billing diperbarui');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const totalItems = resep.items.length + resep.racikanHeaders.length;

  return (
    <>
      <Card className="overflow-hidden">
        {/* Patient Header */}
        <div className="px-4 py-3 bg-muted/20 border-b flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 text-sm font-bold text-primary">
              {resep.kunjungan.pasien.nama.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-sm font-semibold">{resep.kunjungan.pasien.nama}</p>
                <Badge variant="outline" className="text-xs font-mono">{resep.kunjungan.pasien.nomorRM}</Badge>
                {resep.kunjungan.penjamin && (
                  <Badge variant="secondary" className="text-xs">{resep.kunjungan.penjamin}</Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                {resep.kunjungan.pasien.jenisKelamin === 'LAKI_LAKI' ? 'Laki-laki' : 'Perempuan'} · {usia} tahun ·
                {resep.kunjungan.poli?.nama ?? '—'} ·
                {resep.dokterProfile ? ` dr. ${resep.dokterProfile.user.nama}` : ''}
              </p>
            </div>
          </div>
          <div className="text-right flex-shrink-0">
            <p className="text-xs text-muted-foreground">{format(new Date(resep.createdAt), 'HH:mm')}</p>
            <p className="text-xs text-muted-foreground">{totalItems} item</p>
          </div>
        </div>

        <CardContent className="p-4 space-y-4">
          {/* Obat Jadi */}
          {resep.items.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1.5">
                <Pill className="h-3.5 w-3.5" /> Obat Jadi
              </p>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nama Obat</TableHead>
                    <TableHead>Jumlah</TableHead>
                    <TableHead>Signa</TableHead>
                    <TableHead>Harga</TableHead>
                    {!isLocked && <TableHead className="w-20" />}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {resep.items.map(item => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <p className="text-sm font-medium">{item.obat.nama}</p>
                        <p className="text-xs text-muted-foreground">Stok: {item.obat.stok} {item.obat.satuan}</p>
                      </TableCell>
                      <TableCell className="tabular-nums text-sm">{item.jumlah} {item.obat.satuan}</TableCell>
                      <TableCell className="text-sm">{item.aturanPakai ?? '—'}</TableCell>
                      <TableCell className="text-xs">
                        {formatRupiah((isBPJS ? (item.obat.hargaBPJS ?? item.obat.harga) : item.obat.harga) * item.jumlah)}
                      </TableCell>
                      {!isLocked && (
                        <TableCell>
                          <div className="flex gap-1">
                            <Button variant="outline" size="sm" className="h-7 text-xs"
                              onClick={() => setEditItem(item)}>
                              Edit
                            </Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive"
                              disabled={delPending} onClick={() => deleteItem(item.id)}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Racikan */}
          {resep.racikanHeaders.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1.5">
                <FlaskConical className="h-3.5 w-3.5" /> Obat Racikan
              </p>
              <div className="space-y-2">
                {resep.racikanHeaders.map(r => (
                  <div key={r.id} className="border rounded-md p-3 bg-muted/20">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-semibold">{r.namaRacikan}</p>
                          <Badge variant="secondary" className="text-xs">{r.metode}</Badge>
                          <span className="text-xs text-muted-foreground">{r.jumlahSediaan} bungkus/kapsul</span>
                        </div>
                        {r.aturanPakai && <p className="text-xs text-muted-foreground mt-0.5">{r.aturanPakai}</p>}
                        <div className="mt-2 space-y-0.5">
                          {r.bahan.map(b => (
                            <p key={b.id} className="text-xs text-muted-foreground">
                              • {b.obat.nama} — {b.jumlah} {b.satuan ?? b.obat.satuan}
                              <span className="ml-1 text-yellow-600">(Stok: {b.obat.stok})</span>
                            </p>
                          ))}
                        </div>
                      </div>
                      {!isLocked && (
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive ml-2 flex-shrink-0"
                          onClick={() => deleteRacikan(r.id)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {totalItems === 0 && (
            <p className="text-sm text-muted-foreground text-center py-2">Resep kosong</p>
          )}

          {/* Footer */}
          <div className="flex items-center justify-between pt-2 border-t">
            <div>
              <p className="text-xs text-muted-foreground">Estimasi Tagihan Obat</p>
              <p className="text-base font-bold">{formatRupiah(totalResep)}</p>
            </div>
            {!isLocked ? (
              <Button
                className="bg-green-600 hover:bg-green-700 text-white gap-1.5"
                disabled={konfPending || totalItems === 0}
                onClick={() => konfirmasi()}
              >
                <CheckCircle2 className="h-4 w-4" />
                {konfPending ? 'Memproses...' : 'Konfirmasi & Kunci Resep'}
              </Button>
            ) : (
              <div className="flex items-center gap-1.5 text-green-700 text-sm font-medium">
                <Lock className="h-4 w-4" />
                Resep Terkunci
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {editItem && (
        <Dialog open onOpenChange={() => setEditItem(null)}>
          <EditItemDialog
            item={editItem}
            kunjunganId={kunjunganId}
            resepId={resep.id}
            onClose={() => setEditItem(null)}
          />
        </Dialog>
      )}
    </>
  );
}

// ── Main Dashboard ────────────────────────────────────────────
export function FarmasiDashboard() {
  const qc = useQueryClient();
  const [statusFilter, setStatusFilter] = useState('MENUNGGU');
  const [search,       setSearch]       = useState('');
  const [debouncedQ,   setDQ]           = useState('');

  useEffect(() => {
    const t = setTimeout(() => setDQ(search), 400);
    return () => clearTimeout(t);
  }, [search]);

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['farmasi-resep', statusFilter, debouncedQ],
    queryFn:  async () => {
      const sp = new URLSearchParams({ status: statusFilter, limit: '50' });
      if (debouncedQ) sp.set('search', debouncedQ);
      const res = await fetch(`/api/farmasi/resep?${sp}`);
      if (!res.ok) throw new Error('Gagal memuat data farmasi');
      return res.json() as Promise<{ data: Resep[]; total: number }>;
    },
    refetchInterval: 30_000,
    staleTime:        15_000,
  });

  const resepList = data?.data ?? [];
  const total     = data?.total ?? 0;

  return (
    <div className="space-y-5">
      {/* Toolbar */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2 flex-1 min-w-[200px]">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Cari nama / no. RM pasien..."
              className="pl-9"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        </div>
        <Select value={statusFilter} onValueChange={(v) => { if (v) setStatusFilter(v); }}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map(s => (
              <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button variant="outline" size="icon" disabled={isFetching}
          onClick={() => qc.invalidateQueries({ queryKey: ['farmasi-resep'] })}>
          <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {/* Stats */}
      <div className="flex items-center gap-4 text-sm text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <User className="h-4 w-4" />
          {total} resep {STATUS_OPTIONS.find(s => s.value === statusFilter)?.label.toLowerCase()}
        </span>
        {isFetching && <span className="text-xs animate-pulse">Memperbarui...</span>}
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-48 w-full" />)}
        </div>
      ) : resepList.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Pill className="h-10 w-10 mx-auto mb-3 text-muted-foreground opacity-50" />
            <p className="font-medium text-muted-foreground">Tidak ada resep</p>
            <p className="text-sm text-muted-foreground mt-1">
              {debouncedQ ? `Tidak ada hasil untuk "${debouncedQ}"` : `Tidak ada resep dengan status "${STATUS_OPTIONS.find(s => s.value === statusFilter)?.label}"`}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {resepList.map(resep => (
            <ResepDetailCard key={resep.id} resep={resep} />
          ))}
        </div>
      )}
    </div>
  );
}
