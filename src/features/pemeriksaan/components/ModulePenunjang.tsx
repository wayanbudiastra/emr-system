'use client';

import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { format } from 'date-fns';
import {
  FlaskConical, ScanLine, Search, Plus, Trash2,
  ShoppingCart, Clock, CheckCircle2, XCircle, ExternalLink,
  AlertTriangle,
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input }   from '@/components/ui/input';
import { Button }  from '@/components/ui/button';
import { Badge }   from '@/components/ui/badge';
import { Label }   from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';

// ── Types ──────────────────────────────────────────────────────
type KatalogItem = {
  id:          string;
  kode:        string;
  nama:        string;
  kategori:    string;
  tarif:       number;
  tarifBPJS:   number | null;
  satuanWaktu: string | null;
  isActive:    boolean;
};

type CartItem = {
  item:      KatalogItem;
  catatan:   string;
  prioritas: string; // 'NORMAL' | 'CITO' — for lab
};

type OrderRow = {
  id:        string;
  status:    string;
  catatan:   string | null;
  hasilUrl:  string | null;
  createdAt: string;
  itemPenunjang: {
    id:          string;
    kode:        string;
    nama:        string;
    kategori:    string;
    tarif:       number;
    satuanWaktu: string | null;
  };
};

// ── Status config ─────────────────────────────────────────────
const STATUS_LABEL: Record<string, string> = {
  DIPESAN:   'Menunggu',
  DIPROSES:  'Diproses',
  SELESAI:   'Selesai',
  DIBATALKAN:'Batal',
};
const STATUS_COLOR: Record<string, string> = {
  DIPESAN:   'bg-yellow-100 text-yellow-800',
  DIPROSES:  'bg-blue-100 text-blue-800',
  SELESAI:   'bg-green-100 text-green-800',
  DIBATALKAN:'bg-gray-100 text-gray-500',
};

const formatRupiah = (n: number) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n);

// ── Catalog Panel ─────────────────────────────────────────────
function CatalogPanel({
  kategori,
  cart,
  orders,
  onAddToCart,
}: {
  kategori:   'LAB' | 'RADIOLOGI';
  cart:       CartItem[];
  orders:     OrderRow[];
  onAddToCart: (item: KatalogItem) => void;
}) {
  const [search, setSearch] = useState('');
  const [debouncedQ, setDebouncedQ] = useState('');

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(search), 400);
    return () => clearTimeout(t);
  }, [search]);

  const { data, isLoading } = useQuery({
    queryKey: ['penunjang-katalog', kategori, debouncedQ],
    queryFn:  async () => {
      const sp = new URLSearchParams({ kategori, limit: '30' });
      if (debouncedQ) sp.set('search', debouncedQ);
      const res = await fetch(`/api/masterdata/penunjang?${sp}`);
      if (!res.ok) throw new Error('Gagal memuat katalog');
      const result = await res.json();
      return (result.data ?? result) as KatalogItem[];
    },
    staleTime: 60_000,
  });

  const katalog: KatalogItem[] = (data ?? []).filter(i => i.isActive);

  // IDs sudah dalam cart atau order aktif
  const cartIds  = new Set(cart.map(c => c.item.id));
  const orderIds = new Set(orders.filter(o => o.status !== 'DIBATALKAN').map(o => o.itemPenunjang.id));

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder={`Cari ${kategori === 'LAB' ? 'pemeriksaan lab' : 'tindakan radiologi'}...`}
          className="pl-9"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[1,2,3].map(i => <Skeleton key={i} className="h-12 w-full" />)}
        </div>
      ) : !katalog.length ? (
        <p className="text-sm text-muted-foreground text-center py-4">
          {debouncedQ ? `Tidak ada hasil untuk "${debouncedQ}"` : 'Tidak ada item tersedia'}
        </p>
      ) : (
        <div className="border rounded-md divide-y max-h-60 overflow-y-auto">
          {katalog.map(item => {
            const inCart  = cartIds.has(item.id);
            const ordered = orderIds.has(item.id);
            return (
              <div key={item.id} className="flex items-center justify-between px-3 py-2 hover:bg-muted/40 transition-colors">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium truncate">{item.nama}</span>
                    <span className="text-xs text-muted-foreground font-mono">{item.kode}</span>
                    {item.satuanWaktu && (
                      <span className="text-xs text-muted-foreground flex items-center gap-0.5">
                        <Clock className="h-3 w-3" /> {item.satuanWaktu}
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground">{formatRupiah(item.tarif)}</span>
                </div>
                <Button
                  size="sm" variant={inCart || ordered ? 'secondary' : 'outline'}
                  className="h-7 text-xs ml-3 flex-shrink-0"
                  disabled={inCart || ordered}
                  onClick={() => onAddToCart(item)}
                >
                  {ordered ? (
                    <><CheckCircle2 className="h-3 w-3 mr-1 text-green-600" /> Dipesan</>
                  ) : inCart ? (
                    <><CheckCircle2 className="h-3 w-3 mr-1" /> Ditambah</>
                  ) : (
                    <><Plus className="h-3 w-3 mr-1" /> Pilih</>
                  )}
                </Button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Cart Panel ────────────────────────────────────────────────
function CartPanel({
  cart,
  kategori,
  onUpdate,
  onRemove,
  onSubmit,
  isPending,
}: {
  cart:      CartItem[];
  kategori:  'LAB' | 'RADIOLOGI';
  onUpdate:  (id: string, field: 'catatan' | 'prioritas', value: string) => void;
  onRemove:  (id: string) => void;
  onSubmit:  () => void;
  isPending: boolean;
}) {
  if (!cart.length) {
    return (
      <div className="text-center py-6 text-muted-foreground">
        <ShoppingCart className="h-8 w-8 mx-auto mb-2 opacity-30" />
        <p className="text-sm">Pilih item dari katalog di atas</p>
      </div>
    );
  }

  const total = cart.reduce((sum, c) => sum + c.item.tarif, 0);

  return (
    <div className="space-y-3">
      <h4 className="text-sm font-medium text-muted-foreground">Item Dipilih ({cart.length})</h4>
      <div className="space-y-3">
        {cart.map(c => (
          <div key={c.item.id} className="rounded-lg border p-3 space-y-2">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-sm font-medium">{c.item.nama}</p>
                <p className="text-xs text-muted-foreground">{formatRupiah(c.item.tarif)}</p>
              </div>
              <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive flex-shrink-0"
                onClick={() => onRemove(c.item.id)}>
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>

            {kategori === 'LAB' && (
              <div className="space-y-1.5">
                <Label className="text-xs">Prioritas</Label>
                <RadioGroup
                  value={c.prioritas}
                  onValueChange={v => onUpdate(c.item.id, 'prioritas', v ?? 'NORMAL')}
                  className="flex gap-4 grid-cols-none"
                >
                  {[
                    { value: 'NORMAL', label: 'Normal' },
                    { value: 'CITO',   label: 'CITO (Segera)' },
                  ].map(opt => (
                    <label key={opt.value} className="flex items-center gap-1.5 cursor-pointer">
                      <RadioGroupItem value={opt.value} />
                      <span className={`text-xs ${opt.value === 'CITO' ? 'text-red-600 font-medium' : ''}`}>
                        {opt.label}
                      </span>
                    </label>
                  ))}
                </RadioGroup>
              </div>
            )}

            <div className="space-y-1">
              <Label className="text-xs">
                {kategori === 'LAB' ? 'Catatan Klinis' : 'Indikasi Klinis / Lokasi Tubuh'}
              </Label>
              <Input
                className="h-8 text-xs"
                placeholder={kategori === 'LAB'
                  ? 'Instruksi khusus untuk petugas lab...'
                  : 'Contoh: Thorax AP, Indikasi: Sesak nafas'}
                value={c.catatan}
                onChange={e => onUpdate(c.item.id, 'catatan', e.target.value)}
              />
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between pt-2 border-t">
        <div className="text-sm">
          <span className="text-muted-foreground">Total estimasi:</span>
          <span className="font-semibold ml-2">{formatRupiah(total)}</span>
        </div>
        <Button size="sm" onClick={onSubmit} disabled={isPending}>
          {isPending ? 'Mengirim...' : `Kirim ${cart.length} Order`}
        </Button>
      </div>
    </div>
  );
}

// ── History Table ─────────────────────────────────────────────
function HistoryTable({
  orders,
  onCancel,
  cancelPending,
}: {
  orders:        OrderRow[];
  onCancel:      (id: string) => void;
  cancelPending: boolean;
}) {
  if (!orders.length) {
    return (
      <p className="text-sm text-muted-foreground text-center py-4">
        Belum ada riwayat pemeriksaan penunjang
      </p>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Tanggal Order</TableHead>
          <TableHead>Pemeriksaan</TableHead>
          <TableHead>Kategori</TableHead>
          <TableHead>Catatan</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Hasil</TableHead>
          <TableHead className="w-20" />
        </TableRow>
      </TableHeader>
      <TableBody>
        {orders.map(o => (
          <TableRow key={o.id} className={o.status === 'DIBATALKAN' ? 'opacity-50' : ''}>
            <TableCell className="text-xs text-muted-foreground tabular-nums">
              {format(new Date(o.createdAt), 'dd/MM HH:mm')}
            </TableCell>
            <TableCell>
              <div className="text-sm font-medium">{o.itemPenunjang.nama}</div>
              <div className="text-xs text-muted-foreground font-mono">{o.itemPenunjang.kode}</div>
            </TableCell>
            <TableCell>
              <Badge variant="outline" className="text-xs">
                {o.itemPenunjang.kategori}
              </Badge>
            </TableCell>
            <TableCell className="text-xs text-muted-foreground max-w-[140px] truncate">
              {o.catatan ?? '—'}
            </TableCell>
            <TableCell>
              <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLOR[o.status] ?? ''}`}>
                {STATUS_LABEL[o.status] ?? o.status}
              </span>
            </TableCell>
            <TableCell>
              {o.hasilUrl ? (
                <a href={o.hasilUrl} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1 text-xs text-primary hover:underline">
                  <ExternalLink className="h-3 w-3" /> Lihat
                </a>
              ) : o.status === 'SELESAI' ? (
                <span className="text-xs text-muted-foreground">—</span>
              ) : null}
            </TableCell>
            <TableCell>
              {o.status === 'DIPESAN' && (
                <Button variant="ghost" size="sm" className="h-6 text-xs text-destructive hover:text-destructive"
                  disabled={cancelPending} onClick={() => onCancel(o.id)}>
                  <XCircle className="h-3 w-3 mr-1" /> Batal
                </Button>
              )}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

// ── Main Module ───────────────────────────────────────────────
export function ModulePenunjang({ kunjunganId }: { kunjunganId: string }) {
  const qc = useQueryClient();
  const [cartLab, setCartLab]  = useState<CartItem[]>([]);
  const [cartRad, setCartRad]  = useState<CartItem[]>([]);
  const [activeTab, setActiveTab] = useState<'LAB' | 'RADIOLOGI'>('LAB');

  const { data: orders = [], isLoading: ordersLoading } = useQuery({
    queryKey: ['penunjang-orders', kunjunganId],
    queryFn:  async () => {
      const res = await fetch(`/api/kunjungan/${kunjunganId}/penunjang`);
      if (!res.ok) throw new Error('Gagal memuat order');
      return res.json() as Promise<OrderRow[]>;
    },
    staleTime: 15_000,
  });

  const ordersLab  = orders.filter(o => o.itemPenunjang.kategori === 'LAB');
  const ordersRad  = orders.filter(o => o.itemPenunjang.kategori === 'RADIOLOGI');

  const { mutate: submitOrder, isPending: submitPending } = useMutation({
    mutationFn: async (items: CartItem[]) => {
      const res = await fetch(`/api/kunjungan/${kunjunganId}/penunjang`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          items: items.map(c => ({
            itemPenunjangId: c.item.id,
            catatan: [
              c.prioritas !== 'NORMAL' ? `[${c.prioritas}]` : '',
              c.catatan,
            ].filter(Boolean).join(' ') || null,
          })),
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error ?? 'Gagal mengirim order');
      return body;
    },
    onSuccess: (_, items) => {
      const kategori = items[0]?.item.kategori as 'LAB' | 'RADIOLOGI';
      if (kategori === 'LAB')       setCartLab([]);
      else if (kategori === 'RADIOLOGI') setCartRad([]);
      qc.invalidateQueries({ queryKey: ['penunjang-orders', kunjunganId] });
      toast.success(`${items.length} order penunjang berhasil dikirim`);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const { mutate: cancelOrder, isPending: cancelPending } = useMutation({
    mutationFn: async (pid: string) => {
      const res = await fetch(`/api/kunjungan/${kunjunganId}/penunjang/${pid}`, { method: 'DELETE' });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error ?? 'Gagal membatalkan');
      return body;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['penunjang-orders', kunjunganId] });
      toast.success('Order dibatalkan');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const addToCart = useCallback((kategori: 'LAB' | 'RADIOLOGI') => (item: KatalogItem) => {
    const newItem: CartItem = { item, catatan: '', prioritas: 'NORMAL' };
    if (kategori === 'LAB')       setCartLab(p => [...p, newItem]);
    else if (kategori === 'RADIOLOGI') setCartRad(p => [...p, newItem]);
  }, []);

  const updateCart = useCallback((kategori: 'LAB' | 'RADIOLOGI') => (
    id: string, field: 'catatan' | 'prioritas', value: string
  ) => {
    const setter = kategori === 'LAB' ? setCartLab : setCartRad;
    setter(p => p.map(c => c.item.id === id ? { ...c, [field]: value } : c));
  }, []);

  const removeFromCart = useCallback((kategori: 'LAB' | 'RADIOLOGI') => (id: string) => {
    const setter = kategori === 'LAB' ? setCartLab : setCartRad;
    setter(p => p.filter(c => c.item.id !== id));
  }, []);

  return (
    <div className="space-y-5">
      <Tabs value={activeTab} onValueChange={v => setActiveTab(v as 'LAB' | 'RADIOLOGI')}>
        <TabsList className="w-full">
          <TabsTrigger value="LAB" className="flex-1 gap-1.5">
            <FlaskConical className="h-4 w-4" />
            Laboratorium
            {ordersLab.filter(o => o.status !== 'DIBATALKAN').length > 0 && (
              <Badge variant="secondary" className="h-4 px-1 text-xs">
                {ordersLab.filter(o => o.status !== 'DIBATALKAN').length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="RADIOLOGI" className="flex-1 gap-1.5">
            <ScanLine className="h-4 w-4" />
            Radiologi
            {ordersRad.filter(o => o.status !== 'DIBATALKAN').length > 0 && (
              <Badge variant="secondary" className="h-4 px-1 text-xs">
                {ordersRad.filter(o => o.status !== 'DIBATALKAN').length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {(['LAB', 'RADIOLOGI'] as const).map(kat => {
          const cart   = kat === 'LAB' ? cartLab : cartRad;
          const orders_ = kat === 'LAB' ? ordersLab : ordersRad;
          return (
            <TabsContent key={kat} value={kat} className="space-y-4 mt-4">
              {/* Katalog */}
              <div>
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                  Katalog {kat === 'LAB' ? 'Laboratorium' : 'Radiologi'}
                </h4>
                <CatalogPanel
                  kategori={kat}
                  cart={cart}
                  orders={orders_}
                  onAddToCart={addToCart(kat)}
                />
              </div>

              {/* Cart */}
              {cart.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                    Order Baru
                  </h4>
                  <Card>
                    <CardContent className="pt-3 pb-3">
                      <CartPanel
                        cart={cart}
                        kategori={kat}
                        onUpdate={updateCart(kat)}
                        onRemove={removeFromCart(kat)}
                        onSubmit={() => submitOrder(cart)}
                        isPending={submitPending}
                      />
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* Duplicate warning */}
              {cart.some(c =>
                orders_.some(o => o.itemPenunjang.id === c.item.id && o.status !== 'DIBATALKAN')
              ) && (
                <div className="flex items-center gap-2 text-xs text-yellow-800 bg-yellow-50 border border-yellow-200 rounded px-3 py-2">
                  <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0" />
                  Beberapa item sudah ada dalam order aktif untuk kunjungan ini
                </div>
              )}
            </TabsContent>
          );
        })}
      </Tabs>

      {/* History */}
      <div className="border-t pt-4">
        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
          Riwayat Order Penunjang ({orders.length})
        </h4>
        {ordersLoading ? (
          <div className="space-y-2">{[1,2].map(i => <Skeleton key={i} className="h-10 w-full" />)}</div>
        ) : (
          <HistoryTable
            orders={orders}
            onCancel={cancelOrder}
            cancelPending={cancelPending}
          />
        )}
      </div>
    </div>
  );
}
