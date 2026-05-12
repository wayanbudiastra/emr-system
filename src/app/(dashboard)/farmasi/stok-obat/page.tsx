'use client';

import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { format } from 'date-fns';
import {
  Pill, Plus, Search, RefreshCw, Pencil, Trash2,
  AlertTriangle, PackageOpen, ToggleLeft, ToggleRight,
  FlaskConical, Wrench, TrendingDown, TrendingUp,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input }    from '@/components/ui/input';
import { Button }   from '@/components/ui/button';
import { Badge }    from '@/components/ui/badge';
import { Label }    from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';

// ── Types ──────────────────────────────────────────────────────
type ObatRow = {
  id:          string;
  kode:        string;
  barcode:     string | null;
  nama:        string;
  generik:     string | null;
  jenisBarang: string;
  satuan:      string;
  satuanBesar: string | null;
  isPaten:     boolean;
  stok:        number;
  minStock:    number;
  maxStock:    number | null;
  harga:       number;
  hargaBPJS:   number | null;
  hargaBeli:   number | null;
  kategori:    string | null;
  isActive:    boolean;
  expiredDate: string | null;
  isLowStock:  boolean;
  isOverstock: boolean;
};

type ObatForm = Omit<ObatRow, 'id' | 'isLowStock' | 'isOverstock'>;

const EMPTY_FORM: ObatForm = {
  kode: '', barcode: '', nama: '', generik: '', jenisBarang: 'OBAT',
  satuan: '', satuanBesar: '', isPaten: false,
  stok: 0, minStock: 0, maxStock: null,
  harga: 0, hargaBPJS: null, hargaBeli: null,
  kategori: '', isActive: true, expiredDate: null,
};

const SATUAN_OPTIONS = ['Tablet', 'Kapsul', 'Botol', 'Ampul', 'Vial', 'Sachet', 'Strip', 'Box', 'Pcs', 'Set', 'Tube', 'Ml', 'Gram'];

const formatRp = (n: number) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n);

// ── Form Dialog ───────────────────────────────────────────────
function ObatFormDialog({
  open, onClose, initial, onSuccess,
}: {
  open:      boolean;
  onClose:   () => void;
  initial?:  ObatRow | null;
  onSuccess: () => void;
}) {
  const isEdit = Boolean(initial);
  const [form, setForm] = useState<ObatForm>(
    initial
      ? {
          kode: initial.kode, barcode: initial.barcode ?? '', nama: initial.nama,
          generik: initial.generik ?? '', jenisBarang: initial.jenisBarang,
          satuan: initial.satuan, satuanBesar: initial.satuanBesar ?? '',
          isPaten: initial.isPaten, stok: initial.stok,
          minStock: initial.minStock, maxStock: initial.maxStock,
          harga: initial.harga, hargaBPJS: initial.hargaBPJS,
          hargaBeli: initial.hargaBeli, kategori: initial.kategori ?? '',
          isActive: initial.isActive,
          expiredDate: initial.expiredDate ? initial.expiredDate.split('T')[0] : null,
        }
      : EMPTY_FORM
  );

  const set = (k: keyof ObatForm, v: unknown) => setForm(p => ({ ...p, [k]: v }));

  const { mutate: save, isPending } = useMutation({
    mutationFn: async () => {
      const url    = isEdit ? `/api/farmasi/obat/${initial!.id}` : '/api/farmasi/obat';
      const method = isEdit ? 'PUT' : 'POST';
      const body   = {
        ...form,
        barcode:     form.barcode     || null,
        generik:     form.generik     || null,
        satuanBesar: form.satuanBesar || null,
        hargaBPJS:   form.hargaBPJS   ?? null,
        hargaBeli:   form.hargaBeli   ?? null,
        kategori:    form.kategori    || null,
        expiredDate: form.expiredDate || null,
        maxStock:    form.maxStock    ?? null,
      };
      const res  = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? 'Gagal menyimpan');
      return data;
    },
    onSuccess: () => {
      toast.success(isEdit ? 'Data obat diperbarui' : 'Obat baru ditambahkan');
      onSuccess();
      onClose();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={o => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Data Obat/Alkes' : 'Tambah Obat/Alkes Baru'}</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-4 py-2">
          {/* Row 1 */}
          <div className="space-y-1">
            <Label className="text-xs">Kode <span className="text-destructive">*</span></Label>
            <Input value={form.kode} onChange={e => set('kode', e.target.value.toUpperCase())}
              placeholder="OBT-001" disabled={isEdit} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Barcode</Label>
            <Input value={form.barcode ?? ''} onChange={e => set('barcode', e.target.value)} placeholder="Kode scan opsional" />
          </div>

          {/* Row 2 */}
          <div className="col-span-2 space-y-1">
            <Label className="text-xs">Nama Barang <span className="text-destructive">*</span></Label>
            <Input value={form.nama} onChange={e => set('nama', e.target.value)} placeholder="Nama lengkap obat/alkes" />
          </div>

          {/* Row 3 */}
          <div className="space-y-1">
            <Label className="text-xs">Nama Generik</Label>
            <Input value={form.generik ?? ''} onChange={e => set('generik', e.target.value)} placeholder="Zat aktif / nama generik" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Jenis Barang</Label>
            <Select value={form.jenisBarang} onValueChange={v => set('jenisBarang', v ?? 'OBAT')}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="OBAT">Obat</SelectItem>
                <SelectItem value="ALKES">Alkes (Alat Kesehatan)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Row 4 — Satuan */}
          <div className="space-y-1">
            <Label className="text-xs">Satuan Kecil (Resep) <span className="text-destructive">*</span></Label>
            <div className="flex gap-2">
              <Input value={form.satuan} onChange={e => set('satuan', e.target.value)} placeholder="Tablet" list="satuan-list" />
              <datalist id="satuan-list">{SATUAN_OPTIONS.map(s => <option key={s} value={s} />)}</datalist>
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Satuan Besar (Penerimaan)</Label>
            <Input value={form.satuanBesar ?? ''} onChange={e => set('satuanBesar', e.target.value)} placeholder="Box, Karton" list="satuan-list" />
          </div>

          {/* Row 5 — Stok */}
          <div className="space-y-1">
            <Label className="text-xs">Stok Awal</Label>
            <Input type="number" min={0} value={form.stok}
              onChange={e => set('stok', parseInt(e.target.value) || 0)} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-xs">Min Stok (Reorder)</Label>
              <Input type="number" min={0} value={form.minStock}
                onChange={e => set('minStock', parseInt(e.target.value) || 0)} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Max Stok</Label>
              <Input type="number" min={0} value={form.maxStock ?? ''}
                placeholder="Opsional"
                onChange={e => set('maxStock', e.target.value ? parseInt(e.target.value) : null)} />
            </div>
          </div>

          {/* Row 6 — Harga */}
          <div className="space-y-1">
            <Label className="text-xs">Harga Umum <span className="text-destructive">*</span></Label>
            <Input type="number" min={0} value={form.harga}
              onChange={e => set('harga', parseFloat(e.target.value) || 0)} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Harga BPJS</Label>
            <Input type="number" min={0} value={form.hargaBPJS ?? ''}
              placeholder="Opsional"
              onChange={e => set('hargaBPJS', e.target.value ? parseFloat(e.target.value) : null)} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Harga Beli</Label>
            <Input type="number" min={0} value={form.hargaBeli ?? ''}
              placeholder="Opsional"
              onChange={e => set('hargaBeli', e.target.value ? parseFloat(e.target.value) : null)} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Kategori</Label>
            <Input value={form.kategori ?? ''} onChange={e => set('kategori', e.target.value)}
              placeholder="Analgesik, Antibiotik, ..." />
          </div>

          {/* Row 7 — Flags */}
          <div className="space-y-1">
            <Label className="text-xs">Tanggal Expired</Label>
            <Input type="date" value={form.expiredDate ?? ''}
              onChange={e => set('expiredDate', e.target.value || null)} />
          </div>
          <div className="space-y-3 pt-5">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" className="rounded" checked={form.isPaten}
                onChange={e => set('isPaten', e.target.checked)} />
              <span className="text-sm">Obat Paten (bukan generik)</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" className="rounded" checked={form.isActive}
                onChange={e => set('isActive', e.target.checked)} />
              <span className="text-sm">Status Aktif</span>
            </label>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Batal</Button>
          <Button disabled={isPending || !form.kode || !form.nama || !form.satuan}
            onClick={() => save()}>
            {isPending ? 'Menyimpan...' : isEdit ? 'Simpan Perubahan' : 'Tambah Obat'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Stok Adjustment Dialog ────────────────────────────────────
function StokDialog({ obat, onClose, onSuccess }: { obat: ObatRow; onClose: () => void; onSuccess: () => void }) {
  const [delta, setDelta] = useState(0);
  const [mode, setMode]   = useState<'in' | 'out'>('in');

  const { mutate: adjust, isPending } = useMutation({
    mutationFn: async () => {
      const res  = await fetch(`/api/farmasi/obat/${obat.id}/stok`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ delta: mode === 'in' ? delta : -delta }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? 'Gagal update stok');
      return data;
    },
    onSuccess: () => { toast.success('Stok diperbarui'); onSuccess(); onClose(); },
    onError:   (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open onOpenChange={o => !o && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle>Penyesuaian Stok</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="text-sm">
            <span className="text-muted-foreground">Obat:</span> <span className="font-medium">{obat.nama}</span><br />
            <span className="text-muted-foreground">Stok saat ini:</span> <span className="font-bold text-lg">{obat.stok}</span> {obat.satuan}
          </div>
          <div className="flex gap-2">
            <Button variant={mode === 'in' ? 'default' : 'outline'} className="flex-1" onClick={() => setMode('in')}>
              <TrendingUp className="h-4 w-4 mr-1" /> Stok Masuk
            </Button>
            <Button variant={mode === 'out' ? 'default' : 'outline'} className="flex-1" onClick={() => setMode('out')}>
              <TrendingDown className="h-4 w-4 mr-1" /> Stok Keluar
            </Button>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Jumlah ({obat.satuan})</Label>
            <Input type="number" min={1} value={delta || ''}
              onChange={e => setDelta(parseInt(e.target.value) || 0)} />
          </div>
          {mode === 'out' && delta > obat.stok && (
            <p className="text-xs text-destructive">Jumlah melebihi stok tersedia ({obat.stok})</p>
          )}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Batal</Button>
          <Button disabled={isPending || delta <= 0 || (mode === 'out' && delta > obat.stok)}
            onClick={() => adjust()}>
            {isPending ? 'Memproses...' : 'Simpan'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Main Page ─────────────────────────────────────────────────
export default function StokObatPage() {
  const qc = useQueryClient();
  const [search,      setSearch]      = useState('');
  const [jenis,       setJenis]       = useState('all');
  const [statusFilter, setStatus]     = useState('aktif');
  const [lowOnly,     setLowOnly]     = useState(false);
  const [page,        setPage]        = useState(1);
  const [addOpen,     setAddOpen]     = useState(false);
  const [editObat,    setEditObat]    = useState<ObatRow | null>(null);
  const [stokObat,    setStokObat]    = useState<ObatRow | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['farmasi-obat', search, jenis, statusFilter, lowOnly, page],
    queryFn:  async () => {
      const sp = new URLSearchParams();
      if (search)       sp.set('q',     search);
      if (jenis !== 'all') sp.set('jenis', jenis);
      if (statusFilter === 'aktif')    sp.set('aktif', 'true');
      if (statusFilter === 'nonaktif') sp.set('aktif', 'false');
      sp.set('page', String(page));
      sp.set('limit', '30');
      const res = await fetch(`/api/farmasi/obat?${sp}`);
      if (!res.ok) throw new Error('Gagal memuat data');
      return res.json();
    },
    staleTime: 15_000,
  });

  const { mutate: toggleStatus } = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/farmasi/obat/${id}/toggle`, { method: 'PATCH' });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error ?? 'Gagal ubah status');
      return body;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['farmasi-obat'] }); toast.success('Status diperbarui'); },
    onError:   (e: Error) => toast.error(e.message),
  });

  const { mutate: deleteObat } = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/farmasi/obat/${id}`, { method: 'DELETE' });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error ?? 'Gagal hapus');
      return body;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['farmasi-obat'] }); toast.success('Obat dihapus'); },
    onError:   (e: Error) => toast.error(e.message),
  });

  const refresh = useCallback(() => qc.invalidateQueries({ queryKey: ['farmasi-obat'] }), [qc]);

  const rows: ObatRow[] = data?.data ?? [];
  const total: number   = data?.total ?? 0;
  const lowCount: number = data?.lowStockCount ?? 0;

  // Expired warning: 90 days
  const soon = new Date(); soon.setDate(soon.getDate() + 90);
  const expiredSoonCount = rows.filter(r => r.expiredDate && new Date(r.expiredDate) <= soon).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Pill className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Master Data Farmasi</h1>
            <p className="text-sm text-muted-foreground">Manajemen obat, alkes, dan kontrol stok</p>
          </div>
        </div>
        <Button onClick={() => setAddOpen(true)}>
          <Plus className="h-4 w-4 mr-2" /> Tambah Obat/Alkes
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total Item',   value: total,           icon: PackageOpen,    color: 'text-blue-600',   bg: 'bg-blue-50' },
          { label: 'Stok Rendah', value: lowCount,          icon: AlertTriangle,  color: 'text-red-600',    bg: 'bg-red-50' },
          { label: 'Hampir Expired', value: expiredSoonCount, icon: AlertTriangle, color: 'text-yellow-600', bg: 'bg-yellow-50' },
          { label: 'Obat Aktif',  value: rows.filter(r => r.isActive).length, icon: Pill, color: 'text-green-600', bg: 'bg-green-50' },
        ].map(s => {
          const Icon = s.icon;
          return (
            <Card key={s.label} className={`border ${s.bg}`}>
              <CardContent className="pt-3 pb-3 flex items-center gap-3">
                <Icon className={`h-5 w-5 ${s.color}`} />
                <div>
                  <div className={`text-xl font-bold ${s.color}`}>{isLoading ? '—' : s.value}</div>
                  <div className="text-xs text-muted-foreground">{s.label}</div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Low stock alert banner */}
      {lowCount > 0 && (
        <div className="flex items-center gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3">
          <AlertTriangle className="h-5 w-5 text-red-600 shrink-0" />
          <p className="text-sm text-red-800">
            <strong>{lowCount} item</strong> memiliki stok di bawah batas minimum (reorder point).
            <button className="ml-2 underline" onClick={() => { setLowOnly(true); setStatus('aktif'); }}>
              Lihat sekarang
            </button>
          </p>
        </div>
      )}

      {/* Filter */}
      <Card>
        <CardContent className="pt-4 pb-4">
          <div className="flex flex-wrap gap-3 items-center">
            <div className="relative flex-1 min-w-48">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Cari nama, kode, barcode, generik..."
                className="pl-9" value={search}
                onChange={e => { setSearch(e.target.value); setPage(1); }} />
            </div>
            <Select value={jenis} onValueChange={v => { setJenis(v ?? 'all'); setPage(1); }}>
              <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Jenis</SelectItem>
                <SelectItem value="OBAT"><FlaskConical className="h-3.5 w-3.5 inline mr-1" />Obat</SelectItem>
                <SelectItem value="ALKES"><Wrench className="h-3.5 w-3.5 inline mr-1" />Alkes</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={v => { setStatus(v ?? 'aktif'); setPage(1); }}>
              <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="semua">Semua Status</SelectItem>
                <SelectItem value="aktif">Aktif</SelectItem>
                <SelectItem value="nonaktif">Non-Aktif</SelectItem>
              </SelectContent>
            </Select>
            <Button variant={lowOnly ? 'default' : 'outline'} size="sm"
              onClick={() => { setLowOnly(v => !v); setPage(1); }}>
              <AlertTriangle className="h-3.5 w-3.5 mr-1" />
              {lowOnly ? 'Semua Stok' : 'Stok Rendah'}
            </Button>
            <Button variant="outline" size="icon" onClick={refresh}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-muted-foreground font-normal">
            {isLoading ? 'Memuat...' : `${total} item ditemukan`}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Kode</TableHead>
                <TableHead>Nama Obat/Alkes</TableHead>
                <TableHead>Jenis</TableHead>
                <TableHead>Satuan</TableHead>
                <TableHead>Stok</TableHead>
                <TableHead>Harga Umum</TableHead>
                <TableHead>Harga BPJS</TableHead>
                <TableHead>Expired</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-28">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading
                ? Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 10 }).map((_, j) => (
                        <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                      ))}
                    </TableRow>
                  ))
                : !rows.length
                ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center py-10 text-muted-foreground">
                      <PackageOpen className="h-8 w-8 mx-auto mb-2 opacity-30" />
                      Tidak ada data
                    </TableCell>
                  </TableRow>
                )
                : rows.filter(r => !lowOnly || r.isLowStock).map(obat => {
                  const expiredDate = obat.expiredDate ? new Date(obat.expiredDate) : null;
                  const isExpiredSoon = expiredDate && expiredDate <= soon;
                  const isExpired     = expiredDate && expiredDate < new Date();

                  return (
                    <TableRow key={obat.id} className={!obat.isActive ? 'opacity-50' : ''}>
                      <TableCell>
                        <div className="font-mono text-xs font-semibold">{obat.kode}</div>
                        {obat.barcode && <div className="text-xs text-muted-foreground">{obat.barcode}</div>}
                      </TableCell>
                      <TableCell>
                        <div className="font-medium text-sm">{obat.nama}</div>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          {obat.generik && <span className="text-xs text-muted-foreground">{obat.generik}</span>}
                          {obat.isPaten && <Badge variant="outline" className="text-xs h-4 px-1">Paten</Badge>}
                          {obat.kategori && <Badge variant="secondary" className="text-xs h-4 px-1">{obat.kategori}</Badge>}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`text-xs ${obat.jenisBarang === 'OBAT' ? 'text-blue-700' : 'text-orange-700'}`}>
                          {obat.jenisBarang}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">
                        <div>{obat.satuan}</div>
                        {obat.satuanBesar && <div className="text-xs text-muted-foreground">{obat.satuanBesar}</div>}
                      </TableCell>
                      <TableCell>
                        <div className={`font-semibold tabular-nums text-sm ${obat.isLowStock ? 'text-red-600' : ''}`}>
                          {obat.stok} {obat.satuan}
                        </div>
                        {obat.isLowStock && (
                          <div className="flex items-center gap-1 text-xs text-red-600">
                            <AlertTriangle className="h-3 w-3" /> Min: {obat.minStock}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-sm tabular-nums">{formatRp(obat.harga)}</TableCell>
                      <TableCell className="text-sm tabular-nums">
                        {obat.hargaBPJS ? formatRp(obat.hargaBPJS) : '—'}
                      </TableCell>
                      <TableCell>
                        {expiredDate ? (
                          <span className={`text-xs ${isExpired ? 'text-red-600 font-semibold' : isExpiredSoon ? 'text-yellow-700' : 'text-muted-foreground'}`}>
                            {format(expiredDate, 'MM/yyyy')}
                            {isExpired && ' ⚠ Exp'}
                          </span>
                        ) : '—'}
                      </TableCell>
                      <TableCell>
                        <Badge variant={obat.isActive ? 'default' : 'secondary'} className="text-xs">
                          {obat.isActive ? 'Aktif' : 'Non-Aktif'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-0.5">
                          <Button variant="ghost" size="icon" className="h-7 w-7" title="Update Stok"
                            onClick={() => setStokObat(obat)}>
                            <PackageOpen className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7" title="Edit"
                            onClick={() => setEditObat(obat)}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7" title="Toggle Status"
                            onClick={() => toggleStatus(obat.id)}>
                            {obat.isActive
                              ? <ToggleRight className="h-3.5 w-3.5 text-green-600" />
                              : <ToggleLeft  className="h-3.5 w-3.5 text-muted-foreground" />}
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" title="Hapus"
                            onClick={() => { if (confirm(`Hapus "${obat.nama}"?`)) deleteObat(obat.id); }}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Pagination */}
      {data && data.totalPages > 1 && (
        <div className="flex justify-between text-sm text-muted-foreground">
          <span>Halaman {page} dari {data.totalPages}</span>
          <div className="flex gap-1">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Prev</Button>
            <Button variant="outline" size="sm" disabled={page >= data.totalPages} onClick={() => setPage(p => p + 1)}>Next</Button>
          </div>
        </div>
      )}

      {/* Dialogs */}
      {addOpen && (
        <ObatFormDialog open onClose={() => setAddOpen(false)} onSuccess={refresh} />
      )}
      {editObat && (
        <ObatFormDialog open initial={editObat} onClose={() => setEditObat(null)} onSuccess={refresh} />
      )}
      {stokObat && (
        <StokDialog obat={stokObat} onClose={() => setStokObat(null)} onSuccess={refresh} />
      )}
    </div>
  );
}
