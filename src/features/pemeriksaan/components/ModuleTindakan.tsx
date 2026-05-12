'use client';

import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { format } from 'date-fns';
import {
  Stethoscope, Wrench, Search, Plus, Trash2,
  ShoppingCart, AlertTriangle,
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input }   from '@/components/ui/input';
import { Button }  from '@/components/ui/button';
import { Badge }   from '@/components/ui/badge';
import { Label }   from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';

// ── Types ──────────────────────────────────────────────────────
type MasterTindakanItem = {
  id:       string;
  kode:     string;
  nama:     string;
  tarif:    number;
  isActive: boolean;
};

type PeralatanItem = {
  id:     string;
  kode:   string;
  nama:   string;
  merk:   string | null;
  tarif:  number | null;
  status: string;
};

type TindakanRow = {
  id:        string;
  jumlah:    number;
  catatan:   string | null;
  createdAt: string;
  masterTindakan: { id: string; kode: string; nama: string; tarif: number };
};

type AlatRow = {
  id:          string;
  dipakaiOleh?: string | null;
  catatan:     string | null;
  waktuMulai:  string;
  peralatan:   { id: string; kode: string; nama: string; merk: string | null; tarif: number | null };
};

// ── Cart ──────────────────────────────────────────────────────
type TindakanCart = {
  item:    MasterTindakanItem;
  jumlah:  number;
  catatan: string;
};

type AlatCart = {
  item:    PeralatanItem;
  jumlah:  number;
  catatan: string;
};

const formatRupiah = (n: number) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n);

// ── Catalog Tindakan ──────────────────────────────────────────
function CatalogTindakan({
  poliId,
  cart,
  existingIds,
  onAdd,
}: {
  poliId:      string | null;
  cart:        TindakanCart[];
  existingIds: Set<string>;
  onAdd:       (item: MasterTindakanItem) => void;
}) {
  const [search, setSearch] = useState('');
  const [debouncedQ, setDQ] = useState('');

  useEffect(() => {
    const t = setTimeout(() => setDQ(search), 400);
    return () => clearTimeout(t);
  }, [search]);

  const { data, isLoading } = useQuery({
    queryKey: ['tindakan-by-poli', poliId, debouncedQ],
    queryFn:  async () => {
      const sp = new URLSearchParams({ limit: '30' });
      if (poliId)    sp.set('poliId', poliId);
      if (debouncedQ) sp.set('search', debouncedQ);
      const res = await fetch(`/api/masterdata/tindakan?${sp}`);
      if (!res.ok) throw new Error('Gagal memuat katalog');
      const result = await res.json();
      return (result.data ?? result) as MasterTindakanItem[];
    },
    staleTime: 60_000,
  });

  const katalog = (data ?? []).filter(i => i.isActive);
  const cartIds = new Set(cart.map(c => c.item.id));

  if (!poliId) {
    return (
      <div className="flex items-center gap-2 text-sm text-yellow-800 bg-yellow-50 border border-yellow-200 rounded px-3 py-2">
        <AlertTriangle className="h-4 w-4 flex-shrink-0" />
        Pasien tidak terdaftar ke poli manapun — tindakan tidak tersedia.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="relative">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Cari tindakan medis..." className="pl-9"
          value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {isLoading ? (
        <div className="space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-10 w-full" />)}</div>
      ) : !katalog.length ? (
        <p className="text-sm text-muted-foreground text-center py-4">
          {debouncedQ ? `Tidak ada hasil untuk "${debouncedQ}"` : 'Tidak ada tindakan tersedia untuk poli ini'}
        </p>
      ) : (
        <div className="border rounded-md divide-y max-h-56 overflow-y-auto">
          {katalog.map(item => {
            const inCart  = cartIds.has(item.id);
            const ordered = existingIds.has(item.id);
            return (
              <div key={item.id} className="flex items-center justify-between px-3 py-2 hover:bg-muted/40">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium truncate">{item.nama}</span>
                    <span className="text-xs text-muted-foreground font-mono">{item.kode}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">{formatRupiah(item.tarif)}</span>
                </div>
                <Button size="sm" variant={inCart ? 'secondary' : 'outline'}
                  className="h-7 text-xs ml-3 flex-shrink-0"
                  disabled={inCart}
                  onClick={() => onAdd(item)}
                >
                  {inCart ? 'Ditambah' : ordered ? <><Plus className="h-3 w-3 mr-1" />Tambah Lagi</> : <><Plus className="h-3 w-3 mr-1" />Pilih</>}
                </Button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Catalog Peralatan ─────────────────────────────────────────
function CatalogPeralatan({
  cart,
  onAdd,
}: {
  cart:  AlatCart[];
  onAdd: (item: PeralatanItem) => void;
}) {
  const [search, setSearch] = useState('');
  const [debouncedQ, setDQ] = useState('');

  useEffect(() => {
    const t = setTimeout(() => setDQ(search), 400);
    return () => clearTimeout(t);
  }, [search]);

  const { data, isLoading } = useQuery({
    queryKey: ['peralatan-katalog', debouncedQ],
    queryFn:  async () => {
      const sp = new URLSearchParams({ limit: '30' });
      if (debouncedQ) sp.set('search', debouncedQ);
      const res = await fetch(`/api/masterdata/peralatan?${sp}`);
      if (!res.ok) throw new Error('Gagal memuat peralatan');
      const result = await res.json();
      return (result.data ?? result) as PeralatanItem[];
    },
    staleTime: 60_000,
  });

  const katalog = (data ?? []).filter(i => i.status === 'TERSEDIA');
  const cartIds = new Set(cart.map(c => c.item.id));

  return (
    <div className="space-y-2">
      <div className="relative">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Cari peralatan / alat medis..." className="pl-9"
          value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {isLoading ? (
        <div className="space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-10 w-full" />)}</div>
      ) : !katalog.length ? (
        <p className="text-sm text-muted-foreground text-center py-4">
          {debouncedQ ? `Tidak ada hasil untuk "${debouncedQ}"` : 'Tidak ada peralatan tersedia'}
        </p>
      ) : (
        <div className="border rounded-md divide-y max-h-56 overflow-y-auto">
          {katalog.map(item => {
            const inCart = cartIds.has(item.id);
            return (
              <div key={item.id} className="flex items-center justify-between px-3 py-2 hover:bg-muted/40">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium truncate">{item.nama}</span>
                    {item.merk && <span className="text-xs text-muted-foreground">{item.merk}</span>}
                    <span className="text-xs text-muted-foreground font-mono">{item.kode}</span>
                  </div>
                  {item.tarif && <span className="text-xs text-muted-foreground">{formatRupiah(item.tarif)}</span>}
                </div>
                <Button size="sm" variant={inCart ? 'secondary' : 'outline'}
                  className="h-7 text-xs ml-3 flex-shrink-0"
                  disabled={inCart}
                  onClick={() => onAdd(item)}
                >
                  {inCart ? 'Ditambah' : <><Plus className="h-3 w-3 mr-1" />Pilih</>}
                </Button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Monitoring Table ──────────────────────────────────────────
function MonitoringTable({
  tindakanList,
  alatList,
  onDeleteTindakan,
  onDeleteAlat,
  isPending,
}: {
  tindakanList:    TindakanRow[];
  alatList:        AlatRow[];
  onDeleteTindakan:(id: string) => void;
  onDeleteAlat:    (id: string) => void;
  isPending:       boolean;
}) {
  if (!tindakanList.length && !alatList.length) {
    return (
      <p className="text-sm text-muted-foreground text-center py-4">
        Belum ada tindakan atau peralatan yang dicatat
      </p>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Jam</TableHead>
          <TableHead>Item</TableHead>
          <TableHead>Kategori</TableHead>
          <TableHead>Qty</TableHead>
          <TableHead>Tarif</TableHead>
          <TableHead className="w-16" />
        </TableRow>
      </TableHeader>
      <TableBody>
        {tindakanList.map(t => (
          <TableRow key={t.id}>
            <TableCell className="text-xs tabular-nums text-muted-foreground">
              {format(new Date(t.createdAt), 'HH:mm')}
            </TableCell>
            <TableCell>
              <div className="text-sm font-medium">{t.masterTindakan.nama}</div>
              {t.catatan && <div className="text-xs text-muted-foreground">{t.catatan}</div>}
            </TableCell>
            <TableCell>
              <Badge variant="secondary" className="text-xs bg-blue-50 text-blue-700">Tindakan</Badge>
            </TableCell>
            <TableCell className="text-sm tabular-nums">{t.jumlah}</TableCell>
            <TableCell className="text-xs text-muted-foreground">
              {formatRupiah(t.masterTindakan.tarif * t.jumlah)}
            </TableCell>
            <TableCell>
              <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive"
                disabled={isPending} onClick={() => onDeleteTindakan(t.id)}>
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </TableCell>
          </TableRow>
        ))}
        {alatList.map(a => {
          const qty     = Number(a.catatan?.match(/Qty: (\d+)/)?.[1] ?? 1);
          const catatan = a.catatan?.replace(/Qty: \d+\s*\|?\s*/, '').trim();
          return (
            <TableRow key={a.id}>
              <TableCell className="text-xs tabular-nums text-muted-foreground">
                {format(new Date(a.waktuMulai), 'HH:mm')}
              </TableCell>
              <TableCell>
                <div className="text-sm font-medium">{a.peralatan.nama}</div>
                {catatan && <div className="text-xs text-muted-foreground">{catatan}</div>}
              </TableCell>
              <TableCell>
                <Badge variant="secondary" className="text-xs bg-orange-50 text-orange-700">Peralatan</Badge>
              </TableCell>
              <TableCell className="text-sm tabular-nums">{qty}</TableCell>
              <TableCell className="text-xs text-muted-foreground">
                {a.peralatan.tarif ? formatRupiah(a.peralatan.tarif * qty) : '—'}
              </TableCell>
              <TableCell>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive"
                  disabled={isPending} onClick={() => onDeleteAlat(a.id)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}

// ── Main Module ───────────────────────────────────────────────
export function ModuleTindakan({
  kunjunganId,
  poliId,
}: {
  kunjunganId: string;
  poliId:      string | null;
}) {
  const qc = useQueryClient();
  const [cartTindakan, setCartTindakan] = useState<TindakanCart[]>([]);
  const [cartAlat,     setCartAlat]     = useState<AlatCart[]>([]);

  // ── Data ──────────────────────────────────────────────────
  const { data: tindakanList = [], isLoading: tLoading } = useQuery({
    queryKey: ['kunjungan-tindakan', kunjunganId],
    queryFn:  async () => {
      const res = await fetch(`/api/kunjungan/${kunjunganId}/tindakan`);
      if (!res.ok) throw new Error('Gagal memuat tindakan');
      return res.json() as Promise<TindakanRow[]>;
    },
    staleTime: 15_000,
  });

  const { data: alatList = [], isLoading: aLoading } = useQuery({
    queryKey: ['kunjungan-alat', kunjunganId],
    queryFn:  async () => {
      const res = await fetch(`/api/kunjungan/${kunjunganId}/alat`);
      if (!res.ok) throw new Error('Gagal memuat peralatan');
      return res.json() as Promise<AlatRow[]>;
    },
    staleTime: 15_000,
  });

  // ── Mutations ─────────────────────────────────────────────
  const { mutate: submitTindakan, isPending: tPending } = useMutation({
    mutationFn: async (items: TindakanCart[]) => {
      const results = await Promise.all(items.map(async c => {
        const res = await fetch(`/api/kunjungan/${kunjunganId}/tindakan`, {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({
            masterTindakanId: c.item.id,
            jumlah:  c.jumlah,
            catatan: c.catatan || null,
          }),
        });
        const body = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(body.error ?? 'Gagal menyimpan tindakan');
        return body;
      }));
      return results;
    },
    onSuccess: () => {
      setCartTindakan([]);
      qc.invalidateQueries({ queryKey: ['kunjungan-tindakan', kunjunganId] });
      toast.success('Tindakan berhasil disimpan');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const { mutate: submitAlat, isPending: aPending } = useMutation({
    mutationFn: async (items: AlatCart[]) => {
      const results = await Promise.all(items.map(async c => {
        const res = await fetch(`/api/kunjungan/${kunjunganId}/alat`, {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({
            peralatanId: c.item.id,
            jumlah:      c.jumlah,
            catatan:     c.catatan || null,
          }),
        });
        const body = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(body.error ?? 'Gagal menyimpan peralatan');
        return body;
      }));
      return results;
    },
    onSuccess: () => {
      setCartAlat([]);
      qc.invalidateQueries({ queryKey: ['kunjungan-alat', kunjunganId] });
      toast.success('Data peralatan berhasil disimpan');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const { mutate: deleteTindakan, isPending: dtPending } = useMutation({
    mutationFn: async (tid: string) => {
      const res = await fetch(`/api/kunjungan/${kunjunganId}/tindakan/${tid}`, { method: 'DELETE' });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error ?? 'Gagal menghapus');
      return body;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['kunjungan-tindakan', kunjunganId] });
      toast.success('Tindakan dihapus');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const { mutate: deleteAlat, isPending: daPending } = useMutation({
    mutationFn: async (eid: string) => {
      const res = await fetch(`/api/kunjungan/${kunjunganId}/alat/${eid}`, { method: 'DELETE' });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error ?? 'Gagal menghapus');
      return body;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['kunjungan-alat', kunjunganId] });
      toast.success('Peralatan dihapus');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // ── Cart Helpers ──────────────────────────────────────────
  const addTindakan = useCallback((item: MasterTindakanItem) => {
    setCartTindakan(p => [...p, { item, jumlah: 1, catatan: '' }]);
  }, []);

  const addAlat = useCallback((item: PeralatanItem) => {
    setCartAlat(p => [...p, { item, jumlah: 1, catatan: '' }]);
  }, []);

  const updateTindakanCart = (id: string, field: keyof Omit<TindakanCart, 'item'>, val: string | number) =>
    setCartTindakan(p => p.map(c => c.item.id === id ? { ...c, [field]: val } : c));

  const updateAlatCart = (id: string, field: keyof Omit<AlatCart, 'item'>, val: string | number) =>
    setCartAlat(p => p.map(c => c.item.id === id ? { ...c, [field]: val } : c));

  const existingTindakanIds = new Set(tindakanList.map(t => t.masterTindakan.id));

  const totalTindakan = cartTindakan.reduce((s, c) => s + c.item.tarif * c.jumlah, 0);
  const totalAlat     = cartAlat.reduce((s, c) => s + (c.item.tarif ?? 0) * c.jumlah, 0);

  return (
    <div className="space-y-5">
      <Tabs defaultValue="tindakan">
        <TabsList className="w-full">
          <TabsTrigger value="tindakan" className="flex-1 gap-1.5">
            <Stethoscope className="h-4 w-4" />
            Tindakan Medis
            {tindakanList.length > 0 && (
              <Badge variant="secondary" className="h-4 px-1 text-xs">{tindakanList.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="peralatan" className="flex-1 gap-1.5">
            <Wrench className="h-4 w-4" />
            Peralatan / Alat
            {alatList.length > 0 && (
              <Badge variant="secondary" className="h-4 px-1 text-xs">{alatList.length}</Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* ── Tab Tindakan ──────────────────────────────────── */}
        <TabsContent value="tindakan" className="space-y-4 mt-4">
          <div>
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
              Katalog Tindakan {poliId ? '(Difilter per Poli)' : ''}
            </h4>
            <CatalogTindakan
              poliId={poliId}
              cart={cartTindakan}
              existingIds={existingTindakanIds}
              onAdd={addTindakan}
            />
          </div>

          {cartTindakan.length > 0 && (
            <Card>
              <CardContent className="pt-3 pb-3 space-y-3">
                <h4 className="text-sm font-medium flex items-center gap-2">
                  <ShoppingCart className="h-4 w-4" /> Tindakan Dipilih ({cartTindakan.length})
                </h4>
                {cartTindakan.map(c => (
                  <div key={c.item.id} className="rounded-md border p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">{c.item.nama}</p>
                        <p className="text-xs text-muted-foreground">{formatRupiah(c.item.tarif)}</p>
                      </div>
                      <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive"
                        onClick={() => setCartTindakan(p => p.filter(x => x.item.id !== c.item.id))}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <div className="space-y-1">
                        <Label className="text-xs">Jumlah</Label>
                        <Input type="number" min={1} max={99} className="h-8 text-xs"
                          value={c.jumlah}
                          onChange={e => updateTindakanCart(c.item.id, 'jumlah', parseInt(e.target.value) || 1)}
                        />
                      </div>
                      <div className="col-span-2 space-y-1">
                        <Label className="text-xs">Pelaksana</Label>
                        <Input className="h-8 text-xs" placeholder="dr. / Ns. ..."
                          value={c.pelaksana}
                          onChange={e => updateTindakanCart(c.item.id, 'pelaksana', e.target.value)}
                        />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Catatan</Label>
                      <Input className="h-8 text-xs" placeholder="Keterangan tambahan (opsional)"
                        value={c.catatan}
                        onChange={e => updateTindakanCart(c.item.id, 'catatan', e.target.value)}
                      />
                    </div>
                  </div>
                ))}
                <div className="flex items-center justify-between pt-1 border-t">
                  <div className="text-sm">
                    <span className="text-muted-foreground">Estimasi:</span>
                    <span className="font-semibold ml-2">{formatRupiah(totalTindakan)}</span>
                  </div>
                  <Button size="sm" disabled={tPending} onClick={() => submitTindakan(cartTindakan)}>
                    {tPending ? 'Menyimpan...' : `Simpan ${cartTindakan.length} Tindakan`}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ── Tab Peralatan ─────────────────────────────────── */}
        <TabsContent value="peralatan" className="space-y-4 mt-4">
          <div>
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
              Katalog Peralatan (Status: Tersedia)
            </h4>
            <CatalogPeralatan cart={cartAlat} onAdd={addAlat} />
          </div>

          {cartAlat.length > 0 && (
            <Card>
              <CardContent className="pt-3 pb-3 space-y-3">
                <h4 className="text-sm font-medium flex items-center gap-2">
                  <ShoppingCart className="h-4 w-4" /> Peralatan Dipilih ({cartAlat.length})
                </h4>
                {cartAlat.map(c => (
                  <div key={c.item.id} className="rounded-md border p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">{c.item.nama}</p>
                        <p className="text-xs text-muted-foreground">
                          {c.item.merk && `${c.item.merk} · `}
                          {c.item.tarif ? formatRupiah(c.item.tarif) : 'Gratis'}
                        </p>
                      </div>
                      <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive"
                        onClick={() => setCartAlat(p => p.filter(x => x.item.id !== c.item.id))}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <div className="space-y-1">
                        <Label className="text-xs">Jumlah</Label>
                        <Input type="number" min={1} max={99} className="h-8 text-xs"
                          value={c.jumlah}
                          onChange={e => updateAlatCart(c.item.id, 'jumlah', parseInt(e.target.value) || 1)}
                        />
                      </div>
                      <div className="col-span-2 space-y-1">
                        <Label className="text-xs flex items-center gap-1"><User className="h-3 w-3" />Dipakai Oleh</Label>
                        <Input className="h-8 text-xs" placeholder="Nama pelaksana"
                          value={c.dipakaiOleh}
                          onChange={e => updateAlatCart(c.item.id, 'dipakaiOleh', e.target.value)}
                        />
                      </div>
                    </div>
                  </div>
                ))}
                <div className="flex items-center justify-between pt-1 border-t">
                  <div className="text-sm">
                    <span className="text-muted-foreground">Estimasi:</span>
                    <span className="font-semibold ml-2">{formatRupiah(totalAlat)}</span>
                  </div>
                  <Button size="sm" disabled={aPending} onClick={() => submitAlat(cartAlat)}>
                    {aPending ? 'Menyimpan...' : `Simpan ${cartAlat.length} Alat`}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* ── Monitoring Table ───────────────────────────────── */}
      <div className="border-t pt-4">
        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
          Monitoring Tindakan & Peralatan ({tindakanList.length + alatList.length} item)
        </h4>
        {(tLoading || aLoading) ? (
          <div className="space-y-2">{[1,2].map(i => <Skeleton key={i} className="h-10 w-full" />)}</div>
        ) : (
          <MonitoringTable
            tindakanList={tindakanList}
            alatList={alatList}
            onDeleteTindakan={deleteTindakan}
            onDeleteAlat={deleteAlat}
            isPending={dtPending || daPending}
          />
        )}
      </div>
    </div>
  );
}
