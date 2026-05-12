'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  Search, X, Plus, CheckCircle2, AlertTriangle,
  Activity, FileText, Save, RefreshCw,
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input }   from '@/components/ui/input';
import { Button }  from '@/components/ui/button';
import { Badge }   from '@/components/ui/badge';
import { Label }   from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

// ── Types ──────────────────────────────────────────────────────
type IcdItem = { kode: string; deskripsi: string };

type AsesmenData = {
  beratBadan:   number | null;
  tinggiBadan:  number | null;
  tekananDarah: string | null;
  nadi:         number | null;
  suhu:         number | null;
  saturasi:     number | null;
  gds:          number | null;
} | null;

type SoapData = {
  subjektif: string | null;
  objektif:  string | null;
  asesmen:   string | null;
  plan:      string | null;
  icdCodes:  unknown;
};

type TindakanRow = { masterTindakan: { nama: string }; jumlah: number };
type PenunjangRow = { status: string; itemPenunjang: { nama: string; kategori: string } };

// ── ICD-10 Search Panel ───────────────────────────────────────
function ICD10Search({
  selected,
  onAdd,
  onRemove,
}: {
  selected: IcdItem[];
  onAdd:    (item: IcdItem) => void;
  onRemove: (kode: string) => void;
}) {
  const [q, setQ]         = useState('');
  const [debounced, setDb] = useState('');

  useEffect(() => {
    const t = setTimeout(() => setDb(q), 350);
    return () => clearTimeout(t);
  }, [q]);

  const { data: results = [], isFetching } = useQuery({
    queryKey: ['icd10', debounced],
    queryFn:  async () => {
      if (debounced.length < 2) return [];
      const res = await fetch(`/api/icd10?q=${encodeURIComponent(debounced)}`);
      if (!res.ok) return [];
      return res.json() as Promise<IcdItem[]>;
    },
    staleTime: 300_000,
  });

  const selectedKodes = new Set(selected.map(s => s.kode));

  return (
    <div className="space-y-3">
      {/* Selected diagnoses */}
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selected.map(item => (
            <div key={item.kode}
              className="flex items-center gap-1.5 rounded-full bg-primary/10 border border-primary/20 px-3 py-1 text-sm">
              <span className="font-mono text-xs font-semibold text-primary">{item.kode}</span>
              <span className="text-xs max-w-50 truncate">{item.deskripsi}</span>
              <button onClick={() => onRemove(item.kode)}
                className="text-muted-foreground hover:text-destructive ml-1">
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Search input */}
      <div className="relative">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Cari kode ICD-10 atau nama penyakit (min. 2 karakter)..."
          className="pl-9 pr-4"
          value={q}
          onChange={e => setQ(e.target.value)}
        />
        {isFetching && (
          <div className="absolute right-2.5 top-2.5 h-4 w-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        )}
      </div>

      {/* Results */}
      {debounced.length >= 2 && (
        <div className="border rounded-md divide-y max-h-48 overflow-y-auto">
          {results.length === 0 && !isFetching ? (
            <p className="text-sm text-muted-foreground text-center py-3">
              Tidak ditemukan untuk "{debounced}"
            </p>
          ) : (
            results.map(item => {
              const isSelected = selectedKodes.has(item.kode);
              return (
                <div key={item.kode}
                  className="flex items-center justify-between px-3 py-2 hover:bg-muted/40 transition-colors">
                  <div className="flex-1 min-w-0">
                    <span className="font-mono text-xs font-semibold text-primary mr-2">{item.kode}</span>
                    <span className="text-sm">{item.deskripsi}</span>
                  </div>
                  <Button size="sm" variant={isSelected ? 'secondary' : 'ghost'}
                    className="h-7 text-xs ml-2 flex-shrink-0"
                    disabled={isSelected}
                    onClick={() => { onAdd(item); setQ(''); setDb(''); }}>
                    {isSelected ? (
                      <><CheckCircle2 className="h-3 w-3 mr-1" />Dipilih</>
                    ) : (
                      <><Plus className="h-3 w-3 mr-1" />Tambah</>
                    )}
                  </Button>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}

// ── Vitals Summary (read-only from asesmen) ───────────────────
function VitalsSummary({ asesmen }: { asesmen: AsesmenData }) {
  if (!asesmen) {
    return (
      <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/40 rounded px-3 py-2">
        <Activity className="h-3.5 w-3.5" />
        Data vital belum diisi oleh perawat
      </div>
    );
  }

  const bmi = asesmen.beratBadan && asesmen.tinggiBadan
    ? (asesmen.beratBadan / Math.pow(asesmen.tinggiBadan / 100, 2)).toFixed(1)
    : null;

  const vitals = [
    { label: 'BB',    value: asesmen.beratBadan   ? `${asesmen.beratBadan} kg`   : null },
    { label: 'TB',    value: asesmen.tinggiBadan  ? `${asesmen.tinggiBadan} cm`  : null },
    { label: 'BMI',   value: bmi },
    { label: 'TD',    value: asesmen.tekananDarah ?? null },
    { label: 'Nadi',  value: asesmen.nadi         ? `${asesmen.nadi} bpm`        : null },
    { label: 'Suhu',  value: asesmen.suhu         ? `${asesmen.suhu}°C`          : null },
    { label: 'SpO2',  value: asesmen.saturasi     ? `${asesmen.saturasi}%`       : null },
    { label: 'GDS',   value: asesmen.gds          ? `${asesmen.gds} mg/dL`       : null },
  ].filter(v => v.value);

  return (
    <div className="flex flex-wrap gap-2">
      {vitals.map(v => (
        <div key={v.label} className="flex items-center gap-1 bg-muted/60 rounded px-2 py-1">
          <span className="text-xs text-muted-foreground">{v.label}:</span>
          <span className="text-xs font-semibold tabular-nums">{v.value}</span>
        </div>
      ))}
    </div>
  );
}

// ── Orders Summary for Planning ───────────────────────────────
function OrdersSummary({
  tindakan,
  penunjang,
}: {
  tindakan:  TindakanRow[];
  penunjang: PenunjangRow[];
}) {
  const activeOrders = penunjang.filter(p => p.status !== 'DIBATALKAN');

  if (!tindakan.length && !activeOrders.length) {
    return (
      <p className="text-xs text-muted-foreground italic">
        Belum ada tindakan atau order penunjang
      </p>
    );
  }

  return (
    <div className="space-y-1">
      {tindakan.map((t, i) => (
        <div key={i} className="flex items-center gap-2 text-xs">
          <Badge variant="secondary" className="text-xs bg-blue-50 text-blue-700 px-1.5">Tindakan</Badge>
          <span>{t.masterTindakan.nama}</span>
          {t.jumlah > 1 && <span className="text-muted-foreground">×{t.jumlah}</span>}
        </div>
      ))}
      {activeOrders.map((p, i) => (
        <div key={i} className="flex items-center gap-2 text-xs">
          <Badge variant="secondary"
            className={`text-xs px-1.5 ${p.itemPenunjang.kategori === 'LAB' ? 'bg-green-50 text-green-700' : 'bg-purple-50 text-purple-700'}`}>
            {p.itemPenunjang.kategori}
          </Badge>
          <span>{p.itemPenunjang.nama}</span>
          <Badge variant="outline" className="text-xs px-1">{p.status}</Badge>
        </div>
      ))}
    </div>
  );
}

// ── Main SOAP Module ──────────────────────────────────────────
export function ModuleSOAP({ kunjunganId, asesmen, existingSoap }: {
  kunjunganId:  string;
  asesmen:      AsesmenData;
  existingSoap: SoapData | null;
}) {
  const qc = useQueryClient();

  // Form state
  const [subjektif, setSubjektif] = useState(existingSoap?.subjektif ?? '');
  const [objektif,  setObjektif]  = useState(existingSoap?.objektif  ?? '');
  const [asesmenTeks, setAsesmenTeks] = useState(existingSoap?.asesmen ?? '');
  const [plan,      setPlan]      = useState(existingSoap?.plan      ?? '');
  const [icdCodes,  setIcdCodes]  = useState<IcdItem[]>(
    (existingSoap?.icdCodes as IcdItem[] | null) ?? []
  );

  const isExisting = Boolean(existingSoap);

  // Load tindakan & penunjang for Planning summary
  const { data: tindakanList = [] } = useQuery({
    queryKey: ['kunjungan-tindakan', kunjunganId],
    queryFn:  async () => {
      const res = await fetch(`/api/kunjungan/${kunjunganId}/tindakan`);
      if (!res.ok) return [];
      return res.json() as Promise<TindakanRow[]>;
    },
    staleTime: 30_000,
  });

  const { data: penunjangList = [] } = useQuery({
    queryKey: ['penunjang-orders', kunjunganId],
    queryFn:  async () => {
      const res = await fetch(`/api/kunjungan/${kunjunganId}/penunjang`);
      if (!res.ok) return [];
      return res.json() as Promise<PenunjangRow[]>;
    },
    staleTime: 30_000,
  });

  const { mutate: saveSoap, isPending } = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/kunjungan/${kunjunganId}/soap`, {
        method:  'PUT',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ subjektif, objektif, asesmen: asesmenTeks, plan, icdCodes }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error ?? 'Gagal menyimpan SOAP');
      return body;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pemeriksaan-detail', kunjunganId] });
      toast.success('SOAP Note berhasil disimpan');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const refreshOrders = () => {
    qc.invalidateQueries({ queryKey: ['kunjungan-tindakan', kunjunganId] });
    qc.invalidateQueries({ queryKey: ['penunjang-orders', kunjunganId] });
    toast.success('Data diperbarui');
  };

  return (
    <div className="space-y-4">
      {/* Status banner if already saved */}
      {isExisting && (
        <div className="flex items-center gap-2 text-xs text-green-800 bg-green-50 border border-green-200 rounded px-3 py-2">
          <CheckCircle2 className="h-3.5 w-3.5 flex-shrink-0" />
          SOAP sudah tersimpan — edit untuk memperbarui catatan
        </div>
      )}

      <Tabs defaultValue="subjektif">
        <TabsList className="grid grid-cols-4 w-full">
          <TabsTrigger value="subjektif" className="text-xs">S — Subjektif</TabsTrigger>
          <TabsTrigger value="objektif"  className="text-xs">O — Objektif</TabsTrigger>
          <TabsTrigger value="asesmen"   className="text-xs gap-1">
            A — Asesmen
            {icdCodes.length === 0 && (
              <span className="h-1.5 w-1.5 rounded-full bg-destructive inline-block" />
            )}
          </TabsTrigger>
          <TabsTrigger value="plan" className="text-xs">P — Planning</TabsTrigger>
        </TabsList>

        {/* ── S: Subjektif ─────────────────────────────── */}
        <TabsContent value="subjektif" className="space-y-3 mt-4">
          <div className="space-y-1">
            <Label className="text-xs font-semibold text-muted-foreground">
              CC + HPI (Chief Complaint & History of Present Illness)
            </Label>
            <textarea
              className="w-full min-h-[120px] rounded-md border px-3 py-2 text-sm resize-y focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="Keluhan utama dan riwayat penyakit sekarang..."
              value={subjektif ?? ''}
              onChange={e => setSubjektif(e.target.value)}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Catatan: riwayat alergi dan riwayat penyakit dahulu dapat diisi pada bagian ini.
          </p>
        </TabsContent>

        {/* ── O: Objektif ──────────────────────────────── */}
        <TabsContent value="objektif" className="space-y-3 mt-4">
          <div>
            <Label className="text-xs font-semibold text-muted-foreground mb-2 block">
              Tanda Vital (dari Asesmen Perawat)
              <button className="ml-2 text-primary hover:underline inline-flex items-center gap-1"
                onClick={() => qc.invalidateQueries({ queryKey: ['pemeriksaan-detail', kunjunganId] })}>
                <RefreshCw className="h-3 w-3" /> Refresh
              </button>
            </Label>
            <VitalsSummary asesmen={asesmen} />
          </div>

          <div className="space-y-1">
            <Label className="text-xs font-semibold text-muted-foreground">
              Pemeriksaan Fisik & Sistemik
            </Label>
            <textarea
              className="w-full min-h-[120px] rounded-md border px-3 py-2 text-sm resize-y focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="Hasil pemeriksaan fisik, status generalis, status lokalis..."
              value={objektif ?? ''}
              onChange={e => setObjektif(e.target.value)}
            />
          </div>
        </TabsContent>

        {/* ── A: Asesmen ───────────────────────────────── */}
        <TabsContent value="asesmen" className="space-y-4 mt-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Label className="text-xs font-semibold text-muted-foreground">
                Diagnosis ICD-10 <span className="text-destructive">*</span>
              </Label>
              {icdCodes.length === 0 && (
                <div className="flex items-center gap-1 text-xs text-destructive">
                  <AlertTriangle className="h-3 w-3" /> Wajib diisi
                </div>
              )}
            </div>
            <ICD10Search
              selected={icdCodes}
              onAdd={item => setIcdCodes(p => [...p, item])}
              onRemove={kode => setIcdCodes(p => p.filter(i => i.kode !== kode))}
            />
          </div>

          <div className="space-y-1">
            <Label className="text-xs font-semibold text-muted-foreground">
              Catatan Asesmen / Progress Note
            </Label>
            <textarea
              className="w-full min-h-[100px] rounded-md border px-3 py-2 text-sm resize-y focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="Penjelasan klinis, masalah yang teridentifikasi, perkembangan kondisi pasien..."
              value={asesmenTeks ?? ''}
              onChange={e => setAsesmenTeks(e.target.value)}
            />
          </div>
        </TabsContent>

        {/* ── P: Planning ──────────────────────────────── */}
        <TabsContent value="plan" className="space-y-4 mt-4">
          <Card className="bg-muted/30">
            <CardContent className="pt-3 pb-3">
              <div className="flex items-center justify-between mb-2">
                <Label className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
                  <FileText className="h-3.5 w-3.5" /> Ringkasan Order (Tindakan & Penunjang)
                </Label>
                <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={refreshOrders}>
                  <RefreshCw className="h-3 w-3 mr-1" /> Refresh
                </Button>
              </div>
              <OrdersSummary tindakan={tindakanList} penunjang={penunjangList} />
            </CardContent>
          </Card>

          <div className="space-y-1">
            <Label className="text-xs font-semibold text-muted-foreground">
              Advice / Instruksi & Rencana Selanjutnya
            </Label>
            <textarea
              className="w-full min-h-[120px] rounded-md border px-3 py-2 text-sm resize-y focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="Saran medis, instruksi tindak lanjut, kontrol ulang, edukasi pasien..."
              value={plan ?? ''}
              onChange={e => setPlan(e.target.value)}
            />
          </div>
        </TabsContent>
      </Tabs>

      {/* Save Button */}
      <div className="border-t pt-4 flex items-center justify-between">
        <div className="text-xs text-muted-foreground">
          {icdCodes.length === 0 ? (
            <span className="text-destructive flex items-center gap-1">
              <AlertTriangle className="h-3.5 w-3.5" /> Diagnosis ICD-10 wajib diisi sebelum simpan
            </span>
          ) : (
            <span className="text-green-700 flex items-center gap-1">
              <CheckCircle2 className="h-3.5 w-3.5" /> {icdCodes.length} diagnosis dipilih
            </span>
          )}
        </div>
        <Button
          disabled={isPending || icdCodes.length === 0}
          onClick={() => saveSoap()}
        >
          <Save className="h-4 w-4 mr-2" />
          {isPending ? 'Menyimpan...' : isExisting ? 'Perbarui SOAP' : 'Simpan SOAP'}
        </Button>
      </div>
    </div>
  );
}
