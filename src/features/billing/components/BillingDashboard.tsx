'use client';

import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { differenceInYears, format } from 'date-fns';
import {
  Search, Lock, Unlock, CreditCard, Banknote, ShieldCheck,
  Plus, Trash2, RefreshCw, Receipt, AlertTriangle, CheckCircle2,
  User, Building2, X, Percent, ChevronDown, ChevronUp,
} from 'lucide-react';
import { Input }    from '@/components/ui/input';
import { Button }   from '@/components/ui/button';
import { Badge }    from '@/components/ui/badge';
import { Label }    from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';

// ── Types ──────────────────────────────────────────────────────
type ShiftKasir = {
  id:        string;
  modalAwal: number;
  status:    'OPEN' | 'CLOSED';
  openAt:    string;
  kasir:     { id: string; nama: string };
};

type BillingItem = {
  id:          string;
  kategori:    string;
  namaItem:    string;
  jumlah:      number;
  hargaSatuan: number;
  diskonItem:  number;
  isObat:      boolean;
  refId:       string | null;
};

type Pembayaran = {
  id:        string;
  jumlah:    number;
  metode:    string;
  namaBank:  string | null;
  tipeKartu: string | null;
  referensi: string | null;
  kembalian: number | null;
  tanggal:   string;
};

type Billing = {
  id:           string;
  nomorInvoice: string;
  status:       'BELUM_BAYAR' | 'SEBAGIAN' | 'LUNAS' | 'DIBATALKAN';
  totalTagihan: number;
  totalBayar:   number;
  sisa:         number;
  diskonGlobal: number;
  items:        BillingItem[];
  pembayaran:   Pembayaran[];
  kunjungan: {
    id:       string;
    tanggal:  string;
    penjamin: string | null;
    pasien:   { id: string; nomorRM: string; nama: string; tanggalLahir: string; jenisKelamin: string };
    poli:     { nama: string } | null;
    dokterProfile: { user: { nama: string } } | null;
    resep?:   { id: string; status: string }[];
  };
};

type KunjunganRow = {
  id:          string;
  nomorAntrean: string;
  tanggal:     string;
  status:      string;
  penjamin:    string | null;
  pasien:      { id: string; nomorRM: string; nama: string };
  poli:        { nama: string } | null;
  dokterProfile: { user: { nama: string } } | null;
  billing:     { id: string; nomorInvoice: string; status: string; totalTagihan: number; sisa: number } | null;
};

type LaporanShift = {
  modalAwal:      number;
  totalTunai:     number;
  totalNonTunai:  number;
  totalPiutang:   number;
  uangSistem:     number;
  uangFisikAkhir: number;
  selisih:        number;
};

// ── Helpers ────────────────────────────────────────────────────
const formatRupiah = (n: number) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n);

const METODE_LABELS: Record<string, string> = {
  TUNAI: 'Tunai', TRANSFER: 'Transfer', BPJS: 'BPJS', ASURANSI: 'Asuransi',
  KARTU_DEBIT: 'Kartu Debit', KARTU_KREDIT: 'Kartu Kredit',
};

const KATEGORI_COLORS: Record<string, string> = {
  TINDAKAN:    'bg-blue-50 text-blue-700',
  LAB:         'bg-purple-50 text-purple-700',
  RADIOLOGI:   'bg-indigo-50 text-indigo-700',
  PERALATAN:   'bg-orange-50 text-orange-700',
  FARMASI:     'bg-green-50 text-green-700',
  ADMINISTRASI:'bg-gray-50 text-gray-600',
  REGISTRASI:  'bg-yellow-50 text-yellow-700',
};

// ── Open Shift Dialog ──────────────────────────────────────────
function OpenShiftDialog({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const [modalAwal, setModalAwal] = useState('');

  const { mutate: openShift, isPending } = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/billing/shift/open', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ modalAwal: Number(modalAwal) || 0 }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error ?? 'Gagal membuka shift');
      return body;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['shift-aktif'] });
      toast.success('Shift berhasil dibuka');
      onClose();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Buka Shift Kasir</DialogTitle>
        <DialogDescription>Masukkan jumlah uang modal awal di laci kasir.</DialogDescription>
      </DialogHeader>
      <div className="space-y-4 py-2">
        <div className="space-y-1">
          <Label>Uang Modal Awal (Rp)</Label>
          <Input
            type="number" min={0} placeholder="0"
            value={modalAwal}
            onChange={e => setModalAwal(e.target.value)}
          />
          {modalAwal && <p className="text-xs text-muted-foreground">{formatRupiah(Number(modalAwal))}</p>}
        </div>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onClose}>Batal</Button>
        <Button onClick={() => openShift()} disabled={isPending} className="gap-1.5">
          <Unlock className="h-4 w-4" />
          {isPending ? 'Membuka...' : 'Buka Shift'}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}

// ── Close Shift Dialog ─────────────────────────────────────────
function CloseShiftDialog({ shift, onClose }: { shift: ShiftKasir; onClose: () => void }) {
  const qc = useQueryClient();
  const [uangFisik, setUangFisik] = useState('');
  const [catatan,   setCatatan]   = useState('');
  const [laporan,   setLaporan]   = useState<LaporanShift | null>(null);

  const { mutate: closeShift, isPending } = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/billing/shift/close', {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ uangFisikAkhir: Number(uangFisik) || 0, catatan: catatan || null }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error ?? 'Gagal menutup shift');
      return body;
    },
    onSuccess: (data) => {
      setLaporan(data.laporan);
      qc.invalidateQueries({ queryKey: ['shift-aktif'] });
      toast.success('Shift berhasil ditutup');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (laporan) {
    return (
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-green-600" />
            Laporan Penutupan Shift
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between"><span className="text-muted-foreground">Modal Awal</span><span>{formatRupiah(laporan.modalAwal)}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Total Tunai</span><span className="font-medium text-green-700">{formatRupiah(laporan.totalTunai)}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Total Non-Tunai</span><span>{formatRupiah(laporan.totalNonTunai)}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Total Piutang (BPJS/Asuransi)</span><span>{formatRupiah(laporan.totalPiutang)}</span></div>
          <div className="border-t pt-2 flex justify-between"><span className="text-muted-foreground">Uang Sistem</span><span>{formatRupiah(laporan.uangSistem)}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Uang Fisik Akhir</span><span>{formatRupiah(laporan.uangFisikAkhir)}</span></div>
          <div className={`flex justify-between font-semibold ${laporan.selisih < 0 ? 'text-destructive' : laporan.selisih > 0 ? 'text-green-700' : 'text-foreground'}`}>
            <span>Selisih Kas</span>
            <span>{laporan.selisih >= 0 ? '+' : ''}{formatRupiah(laporan.selisih)}</span>
          </div>
        </div>
        <DialogFooter>
          <Button onClick={onClose} className="w-full">Selesai</Button>
        </DialogFooter>
      </DialogContent>
    );
  }

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Tutup Shift Kasir</DialogTitle>
        <DialogDescription>
          Shift dibuka pada {format(new Date(shift.openAt), 'HH:mm')} dengan modal awal {formatRupiah(shift.modalAwal)}.
        </DialogDescription>
      </DialogHeader>
      <div className="space-y-4 py-2">
        <div className="space-y-1">
          <Label>Uang Fisik Akhir (Rp) <span className="text-destructive">*</span></Label>
          <Input
            type="number" min={0} placeholder="0"
            value={uangFisik}
            onChange={e => setUangFisik(e.target.value)}
          />
          {uangFisik && <p className="text-xs text-muted-foreground">{formatRupiah(Number(uangFisik))}</p>}
        </div>
        <div className="space-y-1">
          <Label>Catatan (opsional)</Label>
          <Input placeholder="Keterangan penutupan shift..."
            value={catatan} onChange={e => setCatatan(e.target.value)} />
        </div>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onClose}>Batal</Button>
        <Button
          onClick={() => closeShift()}
          disabled={isPending || !uangFisik}
          variant="destructive"
          className="gap-1.5"
        >
          <Lock className="h-4 w-4" />
          {isPending ? 'Menutup...' : 'Tutup Shift'}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}

// ── Add Item Dialog ─────────────────────────────────────────────
function AddItemDialog({ billingId, onClose }: { billingId: string; onClose: () => void }) {
  const qc = useQueryClient();
  const [namaItem,    setNamaItem]    = useState('');
  const [jumlah,      setJumlah]      = useState(1);
  const [harga,       setHarga]       = useState('');
  const [catatan,     setCatatan]     = useState('');

  const { mutate: addItem, isPending } = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/billing/${billingId}/item`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          namaItem:    namaItem.trim(),
          jumlah,
          hargaSatuan: Number(harga) || 0,
          catatan:     catatan || null,
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error ?? 'Gagal menambah item');
      return body;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['billing-detail'] });
      toast.success('Item berhasil ditambahkan');
      onClose();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const total = (Number(harga) || 0) * jumlah;

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Tambah Item Administrasi</DialogTitle>
        <DialogDescription>Tambahkan biaya administrasi atau non-klinis ke tagihan pasien.</DialogDescription>
      </DialogHeader>
      <div className="space-y-4 py-2">
        <div className="space-y-1">
          <Label>Nama Item <span className="text-destructive">*</span></Label>
          <Input placeholder="Biaya cetak kartu, administrasi, dll."
            value={namaItem} onChange={e => setNamaItem(e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label>Jumlah</Label>
            <Input type="number" min={1} value={jumlah}
              onChange={e => setJumlah(Math.max(1, parseInt(e.target.value) || 1))} />
          </div>
          <div className="space-y-1">
            <Label>Harga Satuan (Rp) <span className="text-destructive">*</span></Label>
            <Input type="number" min={0} placeholder="0"
              value={harga} onChange={e => setHarga(e.target.value)} />
          </div>
        </div>
        <div className="space-y-1">
          <Label>Keterangan (opsional)</Label>
          <Input placeholder="Catatan tambahan..."
            value={catatan} onChange={e => setCatatan(e.target.value)} />
        </div>
        {total > 0 && (
          <p className="text-sm font-medium">Subtotal: {formatRupiah(total)}</p>
        )}
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onClose}>Batal</Button>
        <Button
          onClick={() => addItem()}
          disabled={isPending || !namaItem.trim() || !harga}
        >
          {isPending ? 'Menambahkan...' : 'Tambah Item'}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}

// ── Diskon Dialog ───────────────────────────────────────────────
function DiskonDialog({ billing, onClose }: { billing: Billing; onClose: () => void }) {
  const qc = useQueryClient();
  const [tipeDiskon, setTipeDiskon] = useState<'nominal' | 'persen'>('nominal');
  const [nilai,      setNilai]      = useState(billing.diskonGlobal > 0 ? String(billing.diskonGlobal) : '');

  const subtotal = billing.items.reduce((s, i) => s + (i.hargaSatuan * i.jumlah - i.diskonItem), 0);

  const { mutate: applyDiskon, isPending } = useMutation({
    mutationFn: async () => {
      const body = tipeDiskon === 'persen'
        ? { diskonGlobal: 0, diskonPersen: Number(nilai) || 0 }
        : { diskonGlobal: Number(nilai) || 0 };

      const res = await fetch(`/api/billing/${billing.id}/diskon`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? 'Gagal menerapkan diskon');
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['billing-detail'] });
      toast.success('Diskon berhasil diterapkan');
      onClose();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const nilaiDiskon = tipeDiskon === 'persen'
    ? (Number(nilai) / 100) * subtotal
    : Number(nilai) || 0;

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Diskon Global Invoice</DialogTitle>
        <DialogDescription>Diskon akan memotong total keseluruhan tagihan.</DialogDescription>
      </DialogHeader>
      <div className="space-y-4 py-2">
        <div className="space-y-1">
          <Label>Jenis Diskon</Label>
          <Select value={tipeDiskon} onValueChange={v => { if (v) { setTipeDiskon(v as 'nominal' | 'persen'); setNilai(''); } }}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="nominal">Nominal (Rp)</SelectItem>
              <SelectItem value="persen">Persentase (%)</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label>{tipeDiskon === 'persen' ? 'Persentase Diskon (%)' : 'Nominal Diskon (Rp)'}</Label>
          <Input
            type="number" min={0} max={tipeDiskon === 'persen' ? 100 : subtotal}
            placeholder={tipeDiskon === 'persen' ? '0 – 100' : '0'}
            value={nilai}
            onChange={e => setNilai(e.target.value)}
          />
        </div>
        {nilaiDiskon > 0 && (
          <div className="rounded-md border p-3 space-y-1 text-sm">
            <div className="flex justify-between text-muted-foreground">
              <span>Subtotal</span><span>{formatRupiah(subtotal)}</span>
            </div>
            <div className="flex justify-between text-red-600">
              <span>Diskon</span><span>- {formatRupiah(nilaiDiskon)}</span>
            </div>
            <div className="flex justify-between font-semibold border-t pt-1">
              <span>Total Bayar</span><span>{formatRupiah(Math.max(0, subtotal - nilaiDiskon))}</span>
            </div>
          </div>
        )}
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onClose}>Batal</Button>
        <Button onClick={() => applyDiskon()} disabled={isPending || !nilai}>
          {isPending ? 'Menerapkan...' : 'Terapkan Diskon'}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}

// ── Payment Dialog ──────────────────────────────────────────────
function PaymentDialog({
  billing,
  shiftId,
  onClose,
}: {
  billing:  Billing;
  shiftId:  string | null;
  onClose:  () => void;
}) {
  const qc = useQueryClient();
  const [metode,        setMetode]        = useState<string>('TUNAI');
  const [jumlahDibayar, setJumlahDibayar] = useState(String(billing.sisa));
  const [namaBank,      setNamaBank]      = useState('');
  const [referensi,     setReferensi]     = useState('');
  const [tipeKartu,     setTipeKartu]     = useState('DEBIT');
  const [kembalian,     setKembalian]     = useState<number | null>(null);

  useEffect(() => {
    if (metode === 'TUNAI') {
      const jml = Number(jumlahDibayar) || 0;
      setKembalian(Math.max(0, jml - billing.sisa));
    } else {
      setKembalian(null);
    }
  }, [jumlahDibayar, metode, billing.sisa]);

  const { mutate: prosesBayar, isPending } = useMutation({
    mutationFn: async () => {
      const body: Record<string, unknown> = {
        metode,
        shiftId: shiftId ?? null,
      };
      if (metode === 'TUNAI') body.jumlahDibayar = Number(jumlahDibayar) || billing.sisa;
      if (['TRANSFER', 'KARTU_DEBIT', 'KARTU_KREDIT'].includes(metode)) {
        body.namaBank  = namaBank || null;
        body.referensi = referensi || null;
      }
      if (['KARTU_DEBIT', 'KARTU_KREDIT'].includes(metode)) {
        body.tipeKartu = metode === 'KARTU_DEBIT' ? 'Debit' : 'Kredit';
      }

      const res = await fetch(`/api/billing/${billing.id}/bayar`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? 'Gagal memproses pembayaran');
      return data;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['billing-detail'] });
      qc.invalidateQueries({ queryKey: ['billing-kunjungan'] });
      if (data.kembalian > 0) {
        toast.success(`Pembayaran berhasil. Kembalian: ${formatRupiah(data.kembalian)}`);
      } else {
        toast.success(data.message ?? 'Pembayaran berhasil');
      }
      onClose();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const isPiutang = ['BPJS', 'ASURANSI'].includes(metode);
  const isCard    = ['KARTU_DEBIT', 'KARTU_KREDIT'].includes(metode);
  const isTransfer = metode === 'TRANSFER';

  return (
    <DialogContent className="max-w-md">
      <DialogHeader>
        <DialogTitle>Proses Pembayaran</DialogTitle>
        <DialogDescription>
          {billing.kunjungan.pasien.nama} — {billing.nomorInvoice}
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-4 py-2">
        {/* Amount Summary */}
        <div className="rounded-lg bg-muted/40 p-3 space-y-1 text-sm">
          <div className="flex justify-between text-muted-foreground">
            <span>Total Tagihan</span><span>{formatRupiah(billing.totalTagihan)}</span>
          </div>
          {billing.totalBayar > 0 && (
            <div className="flex justify-between text-muted-foreground">
              <span>Sudah Dibayar</span><span>{formatRupiah(billing.totalBayar)}</span>
            </div>
          )}
          <div className="flex justify-between font-semibold text-base border-t pt-1">
            <span>Sisa Tagihan</span><span>{formatRupiah(billing.sisa)}</span>
          </div>
        </div>

        {/* Method */}
        <div className="space-y-1">
          <Label>Metode Pembayaran</Label>
          <Select value={metode} onValueChange={v => { if (v) setMetode(v); }}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="TUNAI"><span className="flex items-center gap-2"><Banknote className="h-4 w-4" />Tunai</span></SelectItem>
              <SelectItem value="TRANSFER"><span className="flex items-center gap-2"><Building2 className="h-4 w-4" />Transfer Bank</span></SelectItem>
              <SelectItem value="KARTU_DEBIT"><span className="flex items-center gap-2"><CreditCard className="h-4 w-4" />Kartu Debit</span></SelectItem>
              <SelectItem value="KARTU_KREDIT"><span className="flex items-center gap-2"><CreditCard className="h-4 w-4" />Kartu Kredit</span></SelectItem>
              <SelectItem value="BPJS"><span className="flex items-center gap-2"><ShieldCheck className="h-4 w-4" />BPJS</span></SelectItem>
              <SelectItem value="ASURANSI"><span className="flex items-center gap-2"><ShieldCheck className="h-4 w-4" />Asuransi</span></SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Piutang notice */}
        {isPiutang && (
          <div className="flex items-start gap-2 rounded-md bg-blue-50 border border-blue-200 p-3 text-sm text-blue-800">
            <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" />
            <p>Tagihan akan dialihkan ke <strong>Piutang (Account Receivable)</strong> atas nama {metode}. Tidak ada kas masuk hari ini.</p>
          </div>
        )}

        {/* Cash: amount given */}
        {metode === 'TUNAI' && (
          <div className="space-y-1">
            <Label>Jumlah Uang Diterima (Rp)</Label>
            <Input
              type="number" min={billing.sisa}
              value={jumlahDibayar}
              onChange={e => setJumlahDibayar(e.target.value)}
            />
            {kembalian !== null && kembalian > 0 && (
              <p className="text-sm font-semibold text-green-700">
                Kembalian: {formatRupiah(kembalian)}
              </p>
            )}
            {Number(jumlahDibayar) > 0 && Number(jumlahDibayar) < billing.sisa && (
              <p className="text-xs text-destructive flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" /> Jumlah kurang dari sisa tagihan
              </p>
            )}
          </div>
        )}

        {/* Bank / referensi */}
        {(isCard || isTransfer) && (
          <>
            <div className="space-y-1">
              <Label>Nama Bank</Label>
              <Input placeholder="BCA, Mandiri, BNI, dll."
                value={namaBank} onChange={e => setNamaBank(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Nomor Referensi / Kartu</Label>
              <Input placeholder="No. kartu (4 digit terakhir) atau referensi transfer"
                value={referensi} onChange={e => setReferensi(e.target.value)} />
            </div>
          </>
        )}
      </div>

      <DialogFooter>
        <Button variant="outline" onClick={onClose}>Batal</Button>
        <Button
          onClick={() => prosesBayar()}
          disabled={isPending || (metode === 'TUNAI' && Number(jumlahDibayar) < billing.sisa)}
          className="gap-1.5"
        >
          <CheckCircle2 className="h-4 w-4" />
          {isPending ? 'Memproses...' : isPiutang ? 'Simpan Piutang' : 'Konfirmasi Bayar'}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}

// ── Riwayat Pembayaran (collapsible) ───────────────────────────
function RiwayatPembayaran({ pembayaran }: { pembayaran: Pembayaran[] }) {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <Button
        variant="ghost" size="sm"
        className="gap-1.5 text-xs w-full justify-start"
        onClick={() => setOpen(o => !o)}
      >
        {open ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
        Riwayat Pembayaran ({pembayaran.length})
      </Button>
      {open && (
        <div className="border rounded-md divide-y text-sm mt-1">
          {pembayaran.map(p => (
            <div key={p.id} className="flex items-center justify-between px-3 py-2">
              <div>
                <p className="font-medium">{METODE_LABELS[p.metode] ?? p.metode}</p>
                <p className="text-xs text-muted-foreground">
                  {p.namaBank && `${p.namaBank} · `}
                  {p.referensi && `Ref: ${p.referensi} · `}
                  {format(new Date(p.tanggal), 'dd/MM HH:mm')}
                </p>
              </div>
              <div className="text-right">
                <p className="font-semibold">{formatRupiah(p.jumlah)}</p>
                {p.kembalian !== null && p.kembalian > 0 && (
                  <p className="text-xs text-green-700">Kembali: {formatRupiah(p.kembalian)}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Billing Detail ──────────────────────────────────────────────
function BillingDetail({
  billing,
  shiftId,
  onBack,
}: {
  billing:  Billing;
  shiftId:  string | null;
  onBack:   () => void;
}) {
  const qc = useQueryClient();
  const [showAddItem,   setShowAddItem]   = useState(false);
  const [showDiskon,    setShowDiskon]    = useState(false);
  const [showPayment,   setShowPayment]   = useState(false);
  const [diskonItemId,  setDiskonItemId]  = useState<string | null>(null);

  const isLocked   = ['LUNAS', 'DIBATALKAN'].includes(billing.status);
  const pendingResep = billing.kunjungan.resep?.filter(r => ['MENUNGGU', 'DIPROSES'].includes(r.status)) ?? [];
  const usia = differenceInYears(new Date(), new Date(billing.kunjungan.pasien.tanggalLahir));

  const { mutate: deleteItem, isPending: delPending } = useMutation({
    mutationFn: async (itemId: string) => {
      const res = await fetch(`/api/billing/${billing.id}/item/${itemId}`, { method: 'DELETE' });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error ?? 'Gagal menghapus');
      return body;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['billing-detail'] }); toast.success('Item dihapus'); },
    onError: (e: Error) => toast.error(e.message),
  });

  const { mutate: saveDiskonItem, isPending: diskonPending } = useMutation({
    mutationFn: async ({ itemId, diskonItem }: { itemId: string; diskonItem: number }) => {
      const res = await fetch(`/api/billing/${billing.id}/item/${itemId}`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ diskonItem }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error ?? 'Gagal simpan diskon');
      return body;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['billing-detail'] });
      setDiskonItemId(null);
      toast.success('Diskon item diterapkan');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const STATUS_BADGE: Record<string, React.ReactElement> = {
    BELUM_BAYAR: <Badge variant="outline" className="text-yellow-700 border-yellow-300 bg-yellow-50">Belum Bayar</Badge>,
    SEBAGIAN:    <Badge variant="outline" className="text-blue-700 border-blue-300 bg-blue-50">Sebagian</Badge>,
    LUNAS:       <Badge variant="outline" className="text-green-700 border-green-300 bg-green-50">Lunas</Badge>,
    DIBATALKAN:  <Badge variant="destructive">Dibatalkan</Badge>,
  };

  return (
    <div className="space-y-4">
      {/* Back + Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={onBack} className="gap-1.5">
          <X className="h-4 w-4" />
          Tutup
        </Button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="font-semibold">{billing.kunjungan.pasien.nama}</h2>
            <Badge variant="outline" className="font-mono text-xs">{billing.kunjungan.pasien.nomorRM}</Badge>
            {STATUS_BADGE[billing.status]}
          </div>
          <p className="text-xs text-muted-foreground">
            {billing.kunjungan.pasien.jenisKelamin === 'LAKI_LAKI' ? 'Laki-laki' : 'Perempuan'} · {usia} tahun
            {billing.kunjungan.poli && ` · ${billing.kunjungan.poli.nama}`}
            {billing.kunjungan.dokterProfile && ` · dr. ${billing.kunjungan.dokterProfile.user.nama}`}
          </p>
        </div>
        <div className="text-right flex-shrink-0">
          <p className="text-xs font-mono text-muted-foreground">{billing.nomorInvoice}</p>
          <p className="text-xs text-muted-foreground">{billing.kunjungan.penjamin ?? 'UMUM'}</p>
        </div>
      </div>

      {/* Pharmacy warning */}
      {pendingResep.length > 0 && (
        <div className="flex items-center gap-2 rounded-md bg-yellow-50 border border-yellow-200 p-3 text-sm text-yellow-800">
          <AlertTriangle className="h-4 w-4 flex-shrink-0" />
          <p>
            <strong>{pendingResep.length} resep</strong> masih menunggu konfirmasi apoteker.
            Pembayaran tidak dapat diproses hingga semua resep dikonfirmasi.
          </p>
        </div>
      )}

      {/* Items Table */}
      <Card>
        <CardHeader className="pb-2 pt-3 px-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold">Rincian Tagihan</CardTitle>
            {!isLocked && (
              <Button size="sm" variant="outline" className="h-7 text-xs gap-1.5" onClick={() => setShowAddItem(true)}>
                <Plus className="h-3.5 w-3.5" /> Tambah Item
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {billing.items.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">Belum ada item tagihan</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item</TableHead>
                  <TableHead className="w-12">Qty</TableHead>
                  <TableHead>Harga</TableHead>
                  <TableHead>Diskon</TableHead>
                  <TableHead>Subtotal</TableHead>
                  {!isLocked && <TableHead className="w-20" />}
                </TableRow>
              </TableHeader>
              <TableBody>
                {billing.items.map(item => {
                  const subtotal = item.hargaSatuan * item.jumlah - item.diskonItem;
                  const isEditing = diskonItemId === item.id;
                  return (
                    <TableRow key={item.id}>
                      <TableCell>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-medium">{item.namaItem}</span>
                          <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${KATEGORI_COLORS[item.kategori] ?? 'bg-gray-50 text-gray-600'}`}>
                            {item.kategori}
                          </span>
                          {item.isObat && (
                            <span className="text-xs text-muted-foreground">(Obat)</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="tabular-nums text-sm">{item.jumlah}</TableCell>
                      <TableCell className="text-sm tabular-nums">{formatRupiah(item.hargaSatuan)}</TableCell>
                      <TableCell className="text-sm">
                        {isEditing ? (
                          <div className="flex items-center gap-1">
                            <Input
                              type="number" min={0} max={item.hargaSatuan * item.jumlah}
                              className="h-7 w-24 text-xs"
                              defaultValue={item.diskonItem}
                              id={`diskon-${item.id}`}
                            />
                            <Button size="sm" variant="outline" className="h-7 text-xs"
                              disabled={diskonPending}
                              onClick={() => {
                                const el = document.getElementById(`diskon-${item.id}`) as HTMLInputElement;
                                saveDiskonItem({ itemId: item.id, diskonItem: Number(el?.value) || 0 });
                              }}>OK</Button>
                            <Button size="sm" variant="ghost" className="h-7 text-xs"
                              onClick={() => setDiskonItemId(null)}>✕</Button>
                          </div>
                        ) : (
                          <span
                            className={`${item.diskonItem > 0 ? 'text-red-600' : 'text-muted-foreground'} cursor-pointer hover:underline`}
                            onClick={() => { if (!isLocked && !item.isObat) { setDiskonItemId(item.id); setDiskonItemVal(String(item.diskonItem)); }}}
                          >
                            {item.diskonItem > 0 ? `- ${formatRupiah(item.diskonItem)}` : '—'}
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="tabular-nums text-sm font-medium">{formatRupiah(subtotal)}</TableCell>
                      {!isLocked && (
                        <TableCell>
                          {!item.isObat && (
                            <Button
                              variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive"
                              disabled={delPending}
                              onClick={() => deleteItem(item.id)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </TableCell>
                      )}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Totals */}
      <Card>
        <CardContent className="p-4 space-y-2 text-sm">
          {(() => {
            const subtotal = billing.items.reduce((s, i) => s + (i.hargaSatuan * i.jumlah - i.diskonItem), 0);
            return (
              <>
                <div className="flex justify-between text-muted-foreground">
                  <span>Subtotal</span><span>{formatRupiah(subtotal)}</span>
                </div>
                {billing.diskonGlobal > 0 && (
                  <div className="flex justify-between text-red-600">
                    <span>Diskon Invoice</span><span>- {formatRupiah(billing.diskonGlobal)}</span>
                  </div>
                )}
                <div className="flex justify-between font-semibold text-base border-t pt-2">
                  <span>Total Tagihan</span><span>{formatRupiah(billing.totalTagihan)}</span>
                </div>
                {billing.totalBayar > 0 && (
                  <div className="flex justify-between text-green-700">
                    <span>Sudah Dibayar</span><span>{formatRupiah(billing.totalBayar)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-lg">
                  <span>Sisa Tagihan</span><span className={billing.sisa > 0 ? 'text-destructive' : 'text-green-700'}>{formatRupiah(billing.sisa)}</span>
                </div>
              </>
            );
          })()}
        </CardContent>
      </Card>

      {/* Riwayat Pembayaran */}
      {billing.pembayaran.length > 0 && (
        <RiwayatPembayaran pembayaran={billing.pembayaran} />
      )}

      {/* Action Buttons */}
      {!isLocked && (
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="outline" className="gap-1.5" onClick={() => setShowDiskon(true)}>
            <Percent className="h-4 w-4" />
            Diskon Invoice
          </Button>
          <Button
            className="flex-1 gap-1.5 bg-green-600 hover:bg-green-700 text-white"
            disabled={billing.sisa <= 0 || pendingResep.length > 0}
            onClick={() => setShowPayment(true)}
          >
            <Receipt className="h-4 w-4" />
            Proses Pembayaran
          </Button>
        </div>
      )}

      {/* Dialogs */}
      {showAddItem && (
        <Dialog open onOpenChange={() => setShowAddItem(false)}>
          <AddItemDialog billingId={billing.id} onClose={() => setShowAddItem(false)} />
        </Dialog>
      )}
      {showDiskon && (
        <Dialog open onOpenChange={() => setShowDiskon(false)}>
          <DiskonDialog billing={billing} onClose={() => setShowDiskon(false)} />
        </Dialog>
      )}
      {showPayment && (
        <Dialog open onOpenChange={() => setShowPayment(false)}>
          <PaymentDialog billing={billing} shiftId={shiftId} onClose={() => setShowPayment(false)} />
        </Dialog>
      )}
    </div>
  );
}

// ── Main Dashboard ──────────────────────────────────────────────
export function BillingDashboard() {
  const qc = useQueryClient();
  const [showOpenShift,  setShowOpenShift]  = useState(false);
  const [showCloseShift, setShowCloseShift] = useState(false);
  const [search,         setSearch]         = useState('');
  const [debouncedQ,     setDQ]             = useState('');
  const [tanggal,        setTanggal]        = useState(new Date().toISOString().split('T')[0]);
  const [selectedKunjunganId, setSelectedKunjunganId] = useState<string | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setDQ(search), 400);
    return () => clearTimeout(t);
  }, [search]);

  // Active shift
  const { data: shiftData, isLoading: shiftLoading } = useQuery({
    queryKey:  ['shift-aktif'],
    queryFn:   async () => {
      const res = await fetch('/api/billing/shift/active');
      if (!res.ok) throw new Error('Gagal memuat shift');
      return res.json() as Promise<{ data: ShiftKasir | null }>;
    },
    refetchInterval: 60_000,
    staleTime:        30_000,
  });

  const shift = shiftData?.data ?? null;
  const shiftOpen = shift !== null;

  // Kunjungan list
  const { data: kunjunganData, isLoading: kvLoading, isFetching: kvFetching } = useQuery({
    queryKey:  ['billing-kunjungan', debouncedQ, tanggal],
    queryFn:   async () => {
      const sp = new URLSearchParams({ tanggal });
      if (debouncedQ) sp.set('search', debouncedQ);
      const res = await fetch(`/api/billing/kunjungan?${sp}`);
      if (!res.ok) throw new Error('Gagal memuat data');
      return res.json() as Promise<{ data: KunjunganRow[] }>;
    },
    enabled:      shiftOpen,
    refetchInterval: 30_000,
    staleTime:    15_000,
  });

  const kunjunganList = kunjunganData?.data ?? [];

  // Fetch billing when kunjungan selected
  const { data: billingData, isLoading: billingLoading } = useQuery({
    queryKey:  ['billing-detail', selectedKunjunganId],
    queryFn:   async () => {
      const res = await fetch(`/api/billing/fetch/${selectedKunjunganId}`);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? 'Gagal memuat billing');
      }
      return res.json() as Promise<{ data: Billing }>;
    },
    enabled:   !!selectedKunjunganId,
    staleTime: 0,
  });

  const billing = billingData?.data ?? null;

  const handleSelectKunjungan = (id: string) => {
    setSelectedKunjunganId(id);
    qc.invalidateQueries({ queryKey: ['billing-detail', id] });
  };

  // Status badge for kunjungan list
  const billingStatusBadge = (b: KunjunganRow['billing']) => {
    if (!b) return <Badge variant="outline" className="text-xs">Belum Ditagih</Badge>;
    const map: Record<string, string> = {
      BELUM_BAYAR: 'text-yellow-700 border-yellow-300 bg-yellow-50',
      SEBAGIAN:    'text-blue-700 border-blue-300 bg-blue-50',
      LUNAS:       'text-green-700 border-green-300 bg-green-50',
      DIBATALKAN:  'text-red-700 border-red-300 bg-red-50',
    };
    const labels: Record<string, string> = {
      BELUM_BAYAR: 'Belum Bayar', SEBAGIAN: 'Sebagian', LUNAS: 'Lunas', DIBATALKAN: 'Dibatalkan',
    };
    return (
      <Badge variant="outline" className={`text-xs ${map[b.status] ?? ''}`}>
        {labels[b.status] ?? b.status}
      </Badge>
    );
  };

  return (
    <div className="space-y-5">
      {/* ── Shift Banner ──────────────────────────────────── */}
      <div className={`rounded-lg border p-4 flex items-center justify-between ${
        shiftOpen
          ? 'bg-green-50 border-green-200'
          : 'bg-yellow-50 border-yellow-200'
      }`}>
        {shiftLoading ? (
          <Skeleton className="h-8 w-48" />
        ) : shiftOpen ? (
          <>
            <div>
              <div className="flex items-center gap-2">
                <Unlock className="h-4 w-4 text-green-700" />
                <span className="font-semibold text-green-800 text-sm">Shift Aktif</span>
              </div>
              <p className="text-xs text-green-700 mt-0.5">
                Dibuka {format(new Date(shift.openAt), 'HH:mm')} · Modal Awal {formatRupiah(shift.modalAwal)}
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="border-red-200 text-red-700 hover:bg-red-50 gap-1.5"
              onClick={() => setShowCloseShift(true)}
            >
              <Lock className="h-3.5 w-3.5" />
              Tutup Shift
            </Button>
          </>
        ) : (
          <>
            <div>
              <div className="flex items-center gap-2">
                <Lock className="h-4 w-4 text-yellow-700" />
                <span className="font-semibold text-yellow-800 text-sm">Shift Belum Dibuka</span>
              </div>
              <p className="text-xs text-yellow-700 mt-0.5">Buka shift terlebih dahulu untuk memulai transaksi.</p>
            </div>
            <Button size="sm" className="gap-1.5" onClick={() => setShowOpenShift(true)}>
              <Unlock className="h-3.5 w-3.5" />
              Buka Shift
            </Button>
          </>
        )}
      </div>

      {/* ── Main Content ──────────────────────────────────── */}
      {!shiftOpen ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Lock className="h-10 w-10 mx-auto mb-3 text-muted-foreground opacity-40" />
            <p className="font-medium text-muted-foreground">Fitur terkunci</p>
            <p className="text-sm text-muted-foreground mt-1">Buka shift kasir untuk mengakses modul billing.</p>
          </CardContent>
        </Card>
      ) : selectedKunjunganId && (billingLoading || billing) ? (
        /* ── Billing Detail View ── */
        billingLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-48 w-full" />
          </div>
        ) : billing ? (
          <BillingDetail
            billing={billing}
            shiftId={shift?.id ?? null}
            onBack={() => setSelectedKunjunganId(null)}
          />
        ) : null
      ) : (
        /* ── Patient Search & List ── */
        <div className="space-y-4">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Cari nama / nomor RM pasien..."
                className="pl-9"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            <Input
              type="date"
              className="w-40"
              value={tanggal}
              onChange={e => setTanggal(e.target.value)}
            />
            <Button
              variant="outline" size="icon"
              disabled={kvFetching}
              onClick={() => qc.invalidateQueries({ queryKey: ['billing-kunjungan'] })}
            >
              <RefreshCw className={`h-4 w-4 ${kvFetching ? 'animate-spin' : ''}`} />
            </Button>
          </div>

          {kvLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-16 w-full" />)}
            </div>
          ) : kunjunganList.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <User className="h-10 w-10 mx-auto mb-3 text-muted-foreground opacity-40" />
                <p className="font-medium text-muted-foreground">Tidak ada pasien</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {debouncedQ
                    ? `Tidak ditemukan pasien dengan "${debouncedQ}"`
                    : 'Belum ada pasien yang selesai diperiksa hari ini.'}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="border rounded-md divide-y">
              {kunjunganList.map(kv => (
                <div
                  key={kv.id}
                  className="flex items-center justify-between px-4 py-3 hover:bg-muted/40 cursor-pointer transition-colors"
                  onClick={() => handleSelectKunjungan(kv.id)}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 text-sm font-bold text-primary">
                      {kv.pasien.nama.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-semibold">{kv.pasien.nama}</p>
                        <Badge variant="outline" className="text-xs font-mono">{kv.pasien.nomorRM}</Badge>
                        {kv.penjamin && kv.penjamin !== 'UMUM' && (
                          <Badge variant="secondary" className="text-xs">{kv.penjamin}</Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {kv.poli?.nama ?? '—'}
                        {kv.dokterProfile && ` · dr. ${kv.dokterProfile.user.nama}`}
                        {' · '}{format(new Date(kv.tanggal), 'HH:mm')}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {billingStatusBadge(kv.billing)}
                    {kv.billing && (
                      <span className="text-xs text-muted-foreground tabular-nums">
                        {formatRupiah(kv.billing.sisa)}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Shift Dialogs ─────────────────────────────────── */}
      {showOpenShift && (
        <Dialog open onOpenChange={() => setShowOpenShift(false)}>
          <OpenShiftDialog onClose={() => setShowOpenShift(false)} />
        </Dialog>
      )}
      {showCloseShift && shift && (
        <Dialog open onOpenChange={() => setShowCloseShift(false)}>
          <CloseShiftDialog shift={shift} onClose={() => setShowCloseShift(false)} />
        </Dialog>
      )}
    </div>
  );
}
