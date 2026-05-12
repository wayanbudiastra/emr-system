'use client';

import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  Search, Plus, Trash2, Pill, FlaskConical,
  CheckCircle2, Lock, ShoppingCart, AlertTriangle, ChevronDown, ChevronUp,
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input }    from '@/components/ui/input';
import { Button }   from '@/components/ui/button';
import { Badge }    from '@/components/ui/badge';
import { Label }    from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';

// ── Types ──────────────────────────────────────────────────────
type ObatItem = {
  id:       string;
  kode:     string;
  nama:     string;
  generik:  string | null;
  satuan:   string;
  stok:     number;
  harga:    number;
  hargaBPJS: number | null;
};

type ItemResep = {
  id:         string;
  obatId:     string;
  jumlah:     number;
  aturanPakai: string | null;
  catatan:    string | null;
  obat:       Pick<ObatItem, 'id' | 'nama' | 'satuan' | 'stok' | 'harga' | 'hargaBPJS'>;
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
  metode:        'PUYER' | 'KAPSUL' | 'SALEP';
  jumlahSediaan: number;
  aturanPakai:   string | null;
  bahan:         RacikanBahan[];
};

type Resep = {
  id:             string;
  status:         'MENUNGGU' | 'DIPROSES' | 'SIAP' | 'DIAMBIL' | 'DIBATALKAN';
  catatan:        string | null;
  createdAt:      string;
  dokterProfile?: { user: { nama: string } } | null;
  items:          ItemResep[];
  racikanHeaders: RacikanHeader[];
};

// ── Cart types ──────────────────────────────────────────────────
type ObatCart = {
  obat:       ObatItem;
  jumlah:     number;
  aturanPakai: string;
};

type BahanCart = {
  obat:   ObatItem;
  jumlah: number;
  satuan: string;
};

const formatRupiah = (n: number) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n);

// ── Status Badge ──────────────────────────────────────────────
const STATUS_INFO: Record<string, { label: string; className: string }> = {
  MENUNGGU:   { label: 'Menunggu Apoteker', className: 'bg-yellow-100 text-yellow-800' },
  DIPROSES:   { label: 'Diproses',          className: 'bg-blue-100 text-blue-800'    },
  SIAP:       { label: 'Dikonfirmasi',      className: 'bg-green-100 text-green-800'  },
  DIAMBIL:    { label: 'Sudah Diambil',     className: 'bg-gray-100 text-gray-800'    },
  DIBATALKAN: { label: 'Dibatalkan',        className: 'bg-red-100 text-red-800'      },
};

// ── Obat Search ──────────────────────────────────────────────
function ObatSearch({ onSelect }: { onSelect: (obat: ObatItem) => void }) {
  const [search, setSearch] = useState('');
  const [debouncedQ, setDQ] = useState('');
  const [open, setOpen]     = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setDQ(search), 400);
    return () => clearTimeout(t);
  }, [search]);

  const { data = [], isLoading } = useQuery({
    queryKey: ['obat-search', debouncedQ],
    queryFn:  async () => {
      if (!debouncedQ) return [];
      const res = await fetch(`/api/obat?search=${encodeURIComponent(debouncedQ)}&limit=15`);
      if (!res.ok) throw new Error('Gagal memuat obat');
      return res.json() as Promise<ObatItem[]>;
    },
    staleTime: 30_000,
  });

  return (
    <div className="relative">
      <div className="relative">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Ketik nama obat untuk mencari..."
          className="pl-9"
          value={search}
          onChange={e => { setSearch(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 200)}
        />
      </div>
      {open && debouncedQ && (
        <div className="absolute z-50 mt-1 w-full bg-background border rounded-md shadow-md max-h-56 overflow-y-auto">
          {isLoading ? (
            <div className="p-3 space-y-2">
              {[1,2,3].map(i => <Skeleton key={i} className="h-8 w-full" />)}
            </div>
          ) : !data.length ? (
            <p className="p-3 text-sm text-muted-foreground">Tidak ada hasil untuk &quot;{debouncedQ}&quot;</p>
          ) : data.map(obat => (
            <button
              key={obat.id}
              className="w-full text-left px-3 py-2 hover:bg-muted flex items-center justify-between gap-4"
              onMouseDown={() => { onSelect(obat); setSearch(''); setOpen(false); }}
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{obat.nama}</p>
                <p className="text-xs text-muted-foreground">{obat.generik ?? ''} · {obat.satuan}</p>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-xs font-medium">{formatRupiah(obat.harga)}</p>
                <p className="text-xs text-muted-foreground">Stok: {obat.stok}</p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Resep Summary Card ────────────────────────────────────────
function ResepCard({
  resep,
  kunjunganId,
  onRefresh,
  readOnly,
}: {
  resep:       Resep;
  kunjunganId: string;
  onRefresh:   () => void;
  readOnly:    boolean;
}) {
  const qc = useQueryClient();
  const [expanded, setExpanded] = useState(true);
  const info = STATUS_INFO[resep.status] ?? STATUS_INFO.MENUNGGU;
  const isLocked = ['SIAP', 'DIAMBIL', 'DIBATALKAN'].includes(resep.status);

  const { mutate: deleteItem, isPending: delPending } = useMutation({
    mutationFn: async (iid: string) => {
      const res = await fetch(`/api/kunjungan/${kunjunganId}/resep/${resep.id}/item/${iid}`, { method: 'DELETE' });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error ?? 'Gagal menghapus');
      return body;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['kunjungan-resep', kunjunganId] }); toast.success('Item dihapus'); },
    onError: (e: Error) => toast.error(e.message),
  });

  const { mutate: deleteRacikan } = useMutation({
    mutationFn: async (hid: string) => {
      const res = await fetch(`/api/kunjungan/${kunjunganId}/resep/${resep.id}/racikan/${hid}`, { method: 'DELETE' });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error ?? 'Gagal menghapus');
      return body;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['kunjungan-resep', kunjunganId] }); toast.success('Racikan dihapus'); },
    onError: (e: Error) => toast.error(e.message),
  });

  void onRefresh;

  const totalItems = resep.items.length + resep.racikanHeaders.length;

  return (
    <div className="border rounded-lg overflow-hidden">
      <div
        className="flex items-center justify-between px-4 py-3 bg-muted/30 cursor-pointer"
        onClick={() => setExpanded(p => !p)}
      >
        <div className="flex items-center gap-3">
          <Pill className="h-4 w-4 text-primary" />
          <div>
            <p className="text-sm font-medium">Resep #{resep.id.slice(-6).toUpperCase()}</p>
            <p className="text-xs text-muted-foreground">{totalItems} item</p>
          </div>
          <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${info.className}`}>
            {info.label}
          </span>
          {isLocked && <Lock className="h-3.5 w-3.5 text-muted-foreground" />}
        </div>
        {expanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
      </div>

      {expanded && (
        <div className="p-4 space-y-3">
          {/* Non-racikan items */}
          {resep.items.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Obat Jadi</p>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nama Obat</TableHead>
                    <TableHead>Jumlah</TableHead>
                    <TableHead>Aturan Pakai</TableHead>
                    {!readOnly && <TableHead className="w-10" />}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {resep.items.map(item => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <p className="text-sm font-medium">{item.obat.nama}</p>
                        <p className="text-xs text-muted-foreground">{item.obat.satuan}</p>
                      </TableCell>
                      <TableCell className="tabular-nums">{item.jumlah}</TableCell>
                      <TableCell className="text-sm">{item.aturanPakai ?? '—'}</TableCell>
                      {!readOnly && (
                        <TableCell>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive"
                            disabled={delPending} onClick={() => deleteItem(item.id)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Racikan items */}
          {resep.racikanHeaders.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Obat Racikan</p>
              <div className="space-y-2">
                {resep.racikanHeaders.map(r => (
                  <div key={r.id} className="border rounded-md p-3 bg-muted/20">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <FlaskConical className="h-4 w-4 text-purple-600" />
                          <p className="text-sm font-semibold">{r.namaRacikan}</p>
                          <Badge variant="secondary" className="text-xs">{r.metode}</Badge>
                          <span className="text-xs text-muted-foreground">{r.jumlahSediaan} bungkus/kapsul</span>
                        </div>
                        {r.aturanPakai && <p className="text-xs text-muted-foreground mt-0.5 ml-6">{r.aturanPakai}</p>}
                        <div className="ml-6 mt-2 space-y-0.5">
                          {r.bahan.map(b => (
                            <p key={b.id} className="text-xs text-muted-foreground">
                              • {b.obat.nama} — {b.jumlah} {b.satuan ?? b.obat.satuan}
                            </p>
                          ))}
                        </div>
                      </div>
                      {!readOnly && (
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive flex-shrink-0"
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
            <p className="text-sm text-muted-foreground text-center py-2">Belum ada item di resep ini</p>
          )}
        </div>
      )}
    </div>
  );
}

// ── Main Module ───────────────────────────────────────────────
export function ModuleResep({ kunjunganId }: { kunjunganId: string }) {
  const qc = useQueryClient();

  // ── Non-racikan cart ──────────────────────────────────────
  const [cartObat, setCartObat] = useState<ObatCart[]>([]);

  // ── Racikan form ──────────────────────────────────────────
  const [namaRacikan,   setNamaRacikan]   = useState('');
  const [metodeRacikan, setMetodeRacikan] = useState<'PUYER' | 'KAPSUL' | 'SALEP'>('PUYER');
  const [jumlahSediaan, setJumlahSediaan] = useState(1);
  const [aturanRacikan, setAturanRacikan] = useState('');
  const [bahanCart,     setBahanCart]     = useState<BahanCart[]>([]);

  // ── Data ──────────────────────────────────────────────────
  const { data: resepList = [], isLoading } = useQuery({
    queryKey: ['kunjungan-resep', kunjunganId],
    queryFn:  async () => {
      const res = await fetch(`/api/kunjungan/${kunjunganId}/resep`);
      if (!res.ok) throw new Error('Gagal memuat resep');
      return res.json() as Promise<Resep[]>;
    },
    staleTime: 15_000,
  });

  // Active resep = the latest MENUNGGU/DIPROSES one for adding items
  const activeResep = resepList.find(r => ['MENUNGGU', 'DIPROSES'].includes(r.status));

  // ── Create resep ──────────────────────────────────────────
  const { mutate: createResep, isPending: createPending } = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/kunjungan/${kunjunganId}/resep`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({}),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error ?? 'Gagal membuat resep');
      return body as Resep;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['kunjungan-resep', kunjunganId] });
      toast.success('Resep baru dibuat');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // ── Submit non-racikan ─────────────────────────────────────
  const { mutate: submitObat, isPending: obatPending } = useMutation({
    mutationFn: async ({ resepId, items }: { resepId: string; items: ObatCart[] }) => {
      for (const c of items) {
        const res = await fetch(`/api/kunjungan/${kunjunganId}/resep/${resepId}/item`, {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({
            obatId:     c.obat.id,
            jumlah:     c.jumlah,
            aturanPakai: c.aturanPakai || null,
          }),
        });
        const body = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(body.error ?? `Gagal menambah ${c.obat.nama}`);
      }
    },
    onSuccess: () => {
      setCartObat([]);
      qc.invalidateQueries({ queryKey: ['kunjungan-resep', kunjunganId] });
      toast.success('Obat berhasil ditambahkan ke resep');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // ── Submit racikan ────────────────────────────────────────
  const { mutate: submitRacikan, isPending: racikanPending } = useMutation({
    mutationFn: async (resepId: string) => {
      const res = await fetch(`/api/kunjungan/${kunjunganId}/resep/${resepId}/racikan`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          namaRacikan,
          metode:        metodeRacikan,
          jumlahSediaan,
          aturanPakai:   aturanRacikan || null,
          bahan:         bahanCart.map(b => ({ obatId: b.obat.id, jumlah: b.jumlah, satuan: b.satuan || null })),
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error ?? 'Gagal menyimpan racikan');
      return body;
    },
    onSuccess: () => {
      setNamaRacikan('');
      setMetodeRacikan('PUYER');
      setJumlahSediaan(1);
      setAturanRacikan('');
      setBahanCart([]);
      qc.invalidateQueries({ queryKey: ['kunjungan-resep', kunjunganId] });
      toast.success('Racikan berhasil ditambahkan ke resep');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // ── Cart helpers ──────────────────────────────────────────
  const addObat = useCallback((obat: ObatItem) => {
    setCartObat(p => {
      if (p.find(c => c.obat.id === obat.id)) return p;
      return [...p, { obat, jumlah: 1, aturanPakai: '' }];
    });
  }, []);

  const addBahan = useCallback((obat: ObatItem) => {
    setBahanCart(p => {
      if (p.find(c => c.obat.id === obat.id)) return p;
      return [...p, { obat, jumlah: 1, satuan: obat.satuan }];
    });
  }, []);

  const handleSubmitObat = async () => {
    if (!cartObat.length) return;
    let resepId = activeResep?.id;
    if (!resepId) {
      // Create resep first, then submit
      const res = await fetch(`/api/kunjungan/${kunjunganId}/resep`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({}),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) { toast.error(body.error ?? 'Gagal membuat resep'); return; }
      resepId = body.id;
      qc.invalidateQueries({ queryKey: ['kunjungan-resep', kunjunganId] });
    }
    submitObat({ resepId: resepId!, items: cartObat });
  };

  const handleSubmitRacikan = async () => {
    if (!namaRacikan || bahanCart.length === 0) return;
    let resepId = activeResep?.id;
    if (!resepId) {
      const res = await fetch(`/api/kunjungan/${kunjunganId}/resep`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({}),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) { toast.error(body.error ?? 'Gagal membuat resep'); return; }
      resepId = body.id;
      qc.invalidateQueries({ queryKey: ['kunjungan-resep', kunjunganId] });
    }
    submitRacikan(resepId!);
  };

  void createResep; void createPending;

  return (
    <div className="space-y-5">
      <Tabs defaultValue="non-racikan">
        <TabsList className="w-full">
          <TabsTrigger value="non-racikan" className="flex-1 gap-1.5">
            <Pill className="h-4 w-4" />
            Obat Jadi
          </TabsTrigger>
          <TabsTrigger value="racikan" className="flex-1 gap-1.5">
            <FlaskConical className="h-4 w-4" />
            Racikan
          </TabsTrigger>
        </TabsList>

        {/* ── Non-Racikan Tab ──────────────────────────────── */}
        <TabsContent value="non-racikan" className="space-y-4 mt-4">
          <div>
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
              Cari Obat (Aktif & Stok Tersedia)
            </h4>
            <ObatSearch onSelect={addObat} />
          </div>

          {cartObat.length > 0 && (
            <Card>
              <CardContent className="pt-3 pb-3 space-y-3">
                <h4 className="text-sm font-medium flex items-center gap-2">
                  <ShoppingCart className="h-4 w-4" /> Obat Dipilih ({cartObat.length})
                </h4>
                {cartObat.map(c => (
                  <div key={c.obat.id} className="rounded-md border p-3 space-y-2">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-sm font-medium">{c.obat.nama}</p>
                        <p className="text-xs text-muted-foreground">{c.obat.satuan} · Stok: {c.obat.stok} · {formatRupiah(c.obat.harga)}</p>
                      </div>
                      <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive flex-shrink-0"
                        onClick={() => setCartObat(p => p.filter(x => x.obat.id !== c.obat.id))}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <Label className="text-xs">Jumlah ({c.obat.satuan})</Label>
                        <Input
                          type="number" min={1} max={c.obat.stok} className="h-8 text-xs"
                          value={c.jumlah}
                          onChange={e => setCartObat(p => p.map(x => x.obat.id === c.obat.id ? { ...x, jumlah: Math.max(1, parseInt(e.target.value) || 1) } : x))}
                        />
                        {c.jumlah > c.obat.stok && (
                          <p className="text-xs text-destructive flex items-center gap-1">
                            <AlertTriangle className="h-3 w-3" /> Melebihi stok
                          </p>
                        )}
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Aturan Pakai (Signa)</Label>
                        <Input
                          className="h-8 text-xs" placeholder="Misal: 3x1 tablet/hari"
                          value={c.aturanPakai}
                          onChange={e => setCartObat(p => p.map(x => x.obat.id === c.obat.id ? { ...x, aturanPakai: e.target.value } : x))}
                        />
                      </div>
                    </div>
                  </div>
                ))}
                <div className="flex items-center justify-between pt-1 border-t">
                  <p className="text-sm text-muted-foreground">
                    {cartObat.length} jenis obat
                  </p>
                  <Button
                    size="sm"
                    disabled={obatPending || cartObat.some(c => c.jumlah > c.obat.stok)}
                    onClick={handleSubmitObat}
                  >
                    {obatPending ? 'Menyimpan...' : 'Simpan ke Resep'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ── Racikan Tab ──────────────────────────────────── */}
        <TabsContent value="racikan" className="space-y-4 mt-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2 space-y-1">
              <Label className="text-xs">Nama Racikan</Label>
              <Input placeholder="Misal: Puyer Batuk Anak" value={namaRacikan}
                onChange={e => setNamaRacikan(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Metode</Label>
              <Select value={metodeRacikan} onValueChange={v => setMetodeRacikan(v as typeof metodeRacikan)}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PUYER">Puyer</SelectItem>
                  <SelectItem value="KAPSUL">Kapsul</SelectItem>
                  <SelectItem value="SALEP">Salep</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Jumlah Sediaan</Label>
              <Input type="number" min={1} placeholder="10" value={jumlahSediaan}
                onChange={e => setJumlahSediaan(Math.max(1, parseInt(e.target.value) || 1))} />
            </div>
            <div className="col-span-2 space-y-1">
              <Label className="text-xs">Aturan Pakai</Label>
              <Input placeholder="Misal: 3x sehari 1 bungkus" value={aturanRacikan}
                onChange={e => setAturanRacikan(e.target.value)} />
            </div>
          </div>

          <div>
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
              Cari Bahan Obat
            </h4>
            <ObatSearch onSelect={addBahan} />
          </div>

          {bahanCart.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Komposisi ({bahanCart.length} bahan)
              </p>
              {bahanCart.map(b => (
                <div key={b.obat.id} className="flex items-center gap-2 border rounded-md p-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{b.obat.nama}</p>
                  </div>
                  <Input
                    type="number" min={0.1} step={0.1} className="h-8 text-xs w-20"
                    value={b.jumlah}
                    onChange={e => setBahanCart(p => p.map(x => x.obat.id === b.obat.id ? { ...x, jumlah: parseFloat(e.target.value) || 1 } : x))}
                  />
                  <Input
                    className="h-8 text-xs w-20" placeholder={b.obat.satuan}
                    value={b.satuan}
                    onChange={e => setBahanCart(p => p.map(x => x.obat.id === b.obat.id ? { ...x, satuan: e.target.value } : x))}
                  />
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive flex-shrink-0"
                    onClick={() => setBahanCart(p => p.filter(x => x.obat.id !== b.obat.id))}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
              <Button
                size="sm" className="w-full"
                disabled={!namaRacikan || racikanPending}
                onClick={handleSubmitRacikan}
              >
                {racikanPending ? 'Menyimpan...' : `Simpan Racikan "${namaRacikan || '...'}"`}
              </Button>
            </div>
          )}

          {bahanCart.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">
              Cari obat di atas untuk menambahkan bahan racikan
            </p>
          )}
        </TabsContent>
      </Tabs>

      {/* ── Resep List ─────────────────────────────────────── */}
      <div className="border-t pt-4">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            Daftar Resep ({resepList.length} resep)
          </h4>
          {!activeResep && resepList.length === 0 && (
            <Button size="sm" variant="outline" onClick={() => createResep()} disabled={createPending}>
              <Plus className="h-3.5 w-3.5 mr-1" /> Buat Resep Kosong
            </Button>
          )}
        </div>

        {isLoading ? (
          <div className="space-y-2">{[1,2].map(i => <Skeleton key={i} className="h-16 w-full" />)}</div>
        ) : resepList.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Pill className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Belum ada resep untuk kunjungan ini</p>
            <p className="text-xs mt-1">Tambahkan obat di atas untuk otomatis membuat resep</p>
          </div>
        ) : (
          <div className="space-y-3">
            {resepList.map(r => (
              <ResepCard
                key={r.id}
                resep={r}
                kunjunganId={kunjunganId}
                onRefresh={() => qc.invalidateQueries({ queryKey: ['kunjungan-resep', kunjunganId] })}
                readOnly={['SIAP', 'DIAMBIL', 'DIBATALKAN'].includes(r.status)}
              />
            ))}
          </div>
        )}

        {activeResep && (
          <div className="mt-3 rounded-md bg-yellow-50 border border-yellow-200 px-3 py-2 flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-yellow-700 flex-shrink-0" />
            <p className="text-xs text-yellow-800">
              Resep aktif sedang menunggu konfirmasi Apoteker di menu Farmasi.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
