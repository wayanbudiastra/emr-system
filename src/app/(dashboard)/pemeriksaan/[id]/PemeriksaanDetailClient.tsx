'use client';

import { useState } from 'react';
import Link from 'next/link';
import { format, differenceInYears } from 'date-fns';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  ArrowLeft, User, Activity, FileText, FlaskConical,
  Stethoscope, Pill, AlertTriangle, CheckCircle2, XCircle,
  Scale, Ruler, Droplets, Heart, Thermometer,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button, buttonVariants } from '@/components/ui/button';
import { Badge }   from '@/components/ui/badge';
import { Input }   from '@/components/ui/input';
import { Label }   from '@/components/ui/label';
import { cn }      from '@/lib/utils';
import { useBreadcrumb } from '@/contexts/breadcrumb';
import { useEffect } from 'react';
import { ModulePenunjang } from '@/features/pemeriksaan/components/ModulePenunjang';

// ── Types ──────────────────────────────────────────────────────
type Kunjungan = {
  id:           string;
  nomorAntrean: string;
  status:       string;
  keluhan:      string | null;
  penjamin:     string | null;
  panggilAt:    string | null;
  selesaiAt:    string | null;
  tanggal:      string;
  createdAt:    string;
  pasien: {
    id:           string;
    nomorRM:      string;
    nama:         string;
    tanggalLahir: string;
    jenisKelamin: string;
    golonganDarah: string | null;
    alergi:       string | null;
    foto:         string | null;
    noBPJS:       string | null;
    tipePasien:   string;
    alamat:       string;
    telepon:      string;
    email:        string | null;
  };
  dokterProfile: { id: string; spesialisasi: string | null; user: { nama: string; telepon: string | null } } | null;
  poli:          { id: string; nama: string; kode: string; lantai: string | null } | null;
  asesmen: {
    beratBadan:   number | null;
    tinggiBadan:  number | null;
    tekananDarah: string | null;
    nadi:         number | null;
    suhu:         number | null;
    saturasi:     number | null;
    gds:          number | null;
    anamnesisAwal: string | null;
  } | null;
  soap: {
    subjektif: string | null;
    objektif:  string | null;
    asesmen:   string | null;
    plan:      string | null;
    icdCodes:  unknown;
  } | null;
  appointment: { kodeBooking: string; penjamin: string } | null;
};

// ── Sidebar Module Config ─────────────────────────────────────
const SIDEBAR_MODULES = [
  { id: 'identitas',  label: 'Data Identitas',    icon: User },
  { id: 'asesmen',    label: 'Asesmen Perawat',   icon: Activity },
  { id: 'soap',       label: 'Medical Notes',     icon: FileText },
  { id: 'penunjang',  label: 'Penunjang Medis',   icon: FlaskConical },
  { id: 'tindakan',   label: 'Procedure & Equipment', icon: Stethoscope },
  { id: 'resep',      label: 'Medication',        icon: Pill },
];

const STATUS_LABEL: Record<string, string> = {
  MENUNGGU:          'Menunggu',
  DALAM_PEMERIKSAAN: 'Diperiksa',
  SELESAI:           'Selesai',
  DIBATALKAN:        'Batal',
};

const STATUS_COLOR: Record<string, string> = {
  MENUNGGU:          'bg-yellow-100 text-yellow-800',
  DALAM_PEMERIKSAAN: 'bg-blue-100 text-blue-800',
  SELESAI:           'bg-green-100 text-green-800',
  DIBATALKAN:        'bg-red-100 text-red-800',
};

// ── Vitals Panel ───────────────────────────────────────────────
function VitalsPanel({ asesmen }: { asesmen: Kunjungan['asesmen'] }) {
  const bmi = asesmen?.beratBadan && asesmen?.tinggiBadan
    ? (asesmen.beratBadan / Math.pow(asesmen.tinggiBadan / 100, 2)).toFixed(1)
    : null;

  const vitals = [
    { icon: Scale,       label: 'BB',     value: asesmen?.beratBadan  ? `${asesmen.beratBadan} kg`  : '—' },
    { icon: Ruler,       label: 'TB',     value: asesmen?.tinggiBadan ? `${asesmen.tinggiBadan} cm` : '—' },
    { icon: Activity,    label: 'BMI',    value: bmi ?? '—' },
    { icon: Droplets,    label: 'T. Darah', value: asesmen?.tekananDarah ?? '—' },
    { icon: Heart,       label: 'Nadi',   value: asesmen?.nadi       ? `${asesmen.nadi} bpm`      : '—' },
    { icon: Thermometer, label: 'Suhu',   value: asesmen?.suhu       ? `${asesmen.suhu}°C`        : '—' },
    { icon: Activity,    label: 'SpO2',   value: asesmen?.saturasi   ? `${asesmen.saturasi}%`     : '—' },
    { icon: Droplets,    label: 'GDS',    value: asesmen?.gds        ? `${asesmen.gds} mg/dL`     : '—' },
  ];

  return (
    <div className="grid grid-cols-4 gap-2">
      {vitals.map(v => {
        const Icon = v.icon;
        return (
          <div key={v.label} className="text-center bg-muted/50 rounded-lg p-2">
            <Icon className="h-3.5 w-3.5 mx-auto mb-1 text-muted-foreground" />
            <div className="text-xs text-muted-foreground">{v.label}</div>
            <div className="text-sm font-semibold tabular-nums">{v.value}</div>
          </div>
        );
      })}
    </div>
  );
}

// ── Module: Data Identitas ─────────────────────────────────────
function ModuleIdentitas({ pasien }: { pasien: Kunjungan['pasien'] }) {
  const usia = differenceInYears(new Date(), new Date(pasien.tanggalLahir));
  return (
    <div className="space-y-4">
      <h3 className="font-semibold">Profil Sosial Pasien</h3>
      <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
        {[
          ['Nama Lengkap', pasien.nama],
          ['No. Rekam Medis', pasien.nomorRM],
          ['Jenis Kelamin', pasien.jenisKelamin === 'LAKI_LAKI' ? 'Laki-laki' : 'Perempuan'],
          ['Tanggal Lahir', `${format(new Date(pasien.tanggalLahir), 'dd MMMM yyyy')} (${usia} tahun)`],
          ['Golongan Darah', pasien.golonganDarah ?? '—'],
          ['Tipe Pasien', pasien.tipePasien],
          ['No. BPJS', pasien.noBPJS ?? '—'],
          ['Telepon', pasien.telepon],
          ['Email', pasien.email ?? '—'],
          ['Alamat', pasien.alamat],
        ].map(([label, value]) => (
          <div key={label}>
            <p className="text-muted-foreground text-xs">{label}</p>
            <p className="font-medium">{value}</p>
          </div>
        ))}
      </div>
      {pasien.alergi && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 flex items-start gap-2">
          <AlertTriangle className="h-4 w-4 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-red-800">Riwayat Alergi</p>
            <p className="text-sm text-red-700">{pasien.alergi}</p>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Module: Asesmen Perawat ────────────────────────────────────
function ModuleAsesmen({ kunjunganId, asesmen: initialAsesmen }: {
  kunjunganId: string;
  asesmen:     Kunjungan['asesmen'];
}) {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    beratBadan:   initialAsesmen?.beratBadan   ?? '',
    tinggiBadan:  initialAsesmen?.tinggiBadan  ?? '',
    tekananDarah: initialAsesmen?.tekananDarah ?? '',
    nadi:         initialAsesmen?.nadi         ?? '',
    suhu:         initialAsesmen?.suhu         ?? '',
    saturasi:     initialAsesmen?.saturasi     ?? '',
    gds:          initialAsesmen?.gds          ?? '',
    anamnesisAwal: initialAsesmen?.anamnesisAwal ?? '',
  });

  const { mutate: save, isPending } = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/asesmen/${kunjunganId}`, {
        method:  'PUT',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          beratBadan:    form.beratBadan   !== '' ? Number(form.beratBadan)  : null,
          tinggiBadan:   form.tinggiBadan  !== '' ? Number(form.tinggiBadan) : null,
          tekananDarah:  form.tekananDarah || null,
          nadi:          form.nadi         !== '' ? Number(form.nadi)        : null,
          suhu:          form.suhu         !== '' ? Number(form.suhu)        : null,
          saturasi:      form.saturasi     !== '' ? Number(form.saturasi)    : null,
          gds:           form.gds          !== '' ? Number(form.gds)         : null,
          anamnesisAwal: form.anamnesisAwal || null,
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error ?? 'Gagal menyimpan');
      return body;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pemeriksaan-detail', kunjunganId] });
      toast.success('Asesmen berhasil disimpan');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));

  const bmi = (Number(form.beratBadan) && Number(form.tinggiBadan))
    ? (Number(form.beratBadan) / Math.pow(Number(form.tinggiBadan) / 100, 2)).toFixed(1)
    : '—';

  return (
    <div className="space-y-5">
      <h3 className="font-semibold">Data Asesmen Perawat</h3>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <Label className="text-xs">Berat Badan (kg)</Label>
          <Input type="number" step="0.1" placeholder="70.5" value={form.beratBadan}
            onChange={e => set('beratBadan', e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Tinggi Badan (cm)</Label>
          <Input type="number" placeholder="170" value={form.tinggiBadan}
            onChange={e => set('tinggiBadan', e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">BMI (otomatis)</Label>
          <div className="h-9 flex items-center px-3 rounded-md border bg-muted text-sm font-semibold">
            {bmi}
          </div>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Tekanan Darah (mmHg)</Label>
          <Input placeholder="120/80" value={form.tekananDarah}
            onChange={e => set('tekananDarah', e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Nadi (bpm)</Label>
          <Input type="number" placeholder="80" value={form.nadi}
            onChange={e => set('nadi', e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Suhu (°C)</Label>
          <Input type="number" step="0.1" placeholder="36.5" value={form.suhu}
            onChange={e => set('suhu', e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Saturasi SpO2 (%)</Label>
          <Input type="number" placeholder="98" value={form.saturasi}
            onChange={e => set('saturasi', e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">GDS (mg/dL)</Label>
          <Input type="number" placeholder="90" value={form.gds}
            onChange={e => set('gds', e.target.value)} />
        </div>
      </div>

      <div className="space-y-1">
        <Label className="text-xs">Anamnesis Awal / Keluhan Utama</Label>
        <textarea
          className="w-full min-h-[80px] rounded-md border px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
          placeholder="Keluhan yang disampaikan pasien saat datang..."
          value={form.anamnesisAwal}
          onChange={e => set('anamnesisAwal', e.target.value)}
        />
      </div>

      <Button onClick={() => save()} disabled={isPending}>
        {isPending ? 'Menyimpan...' : 'Simpan Asesmen'}
      </Button>
    </div>
  );
}

// ── Module: SOAP Preview ───────────────────────────────────────
function ModuleSOAP({ soap }: { soap: Kunjungan['soap'] }) {
  if (!soap) {
    return (
      <div className="text-center py-10 text-muted-foreground">
        <FileText className="mx-auto h-8 w-8 mb-2 opacity-30" />
        <p className="text-sm">Belum ada catatan SOAP dari dokter</p>
      </div>
    );
  }
  return (
    <div className="space-y-4">
      <h3 className="font-semibold">SOAP Note</h3>
      {[
        { label: 'S — Subjektif',  value: soap.subjektif },
        { label: 'O — Objektif',   value: soap.objektif },
        { label: 'A — Asesmen',    value: soap.asesmen },
        { label: 'P — Plan',       value: soap.plan },
      ].map(({ label, value }) => (
        <div key={label}>
          <p className="text-xs text-muted-foreground font-medium mb-1">{label}</p>
          <div className="rounded-md bg-muted/50 px-3 py-2 text-sm min-h-[40px]">
            {value ?? <span className="text-muted-foreground italic">Belum diisi</span>}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Coming Soon Placeholder ────────────────────────────────────
function ComingSoon({ label }: { label: string }) {
  return (
    <div className="text-center py-10 text-muted-foreground">
      <div className="mx-auto h-10 w-10 mb-2 rounded-full bg-muted flex items-center justify-center">
        <span className="text-lg">🚧</span>
      </div>
      <p className="font-medium text-sm">{label}</p>
      <p className="text-xs mt-1">Akan tersedia pada update berikutnya</p>
    </div>
  );
}

// ── Main Client Component ──────────────────────────────────────
export function PemeriksaanDetailClient({ id }: { id: string }) {
  const qc = useQueryClient();
  const { setSegments } = useBreadcrumb();
  const [activeModule, setActiveModule] = useState('identitas');

  const { data: kunjungan, isLoading } = useQuery({
    queryKey: ['pemeriksaan-detail', id],
    queryFn: async () => {
      const res = await fetch(`/api/pemeriksaan/${id}`);
      if (!res.ok) throw new Error('Data tidak ditemukan');
      return res.json() as Promise<Kunjungan>;
    },
  });

  useEffect(() => {
    if (kunjungan?.pasien?.nama) {
      setSegments([{ label: kunjungan.pasien.nama }]);
    }
    return () => setSegments([]);
  }, [kunjungan?.pasien?.nama, setSegments]);

  const { mutate: selesai, isPending: selesaiPending } = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/kunjungan/${id}/selesai`, { method: 'PATCH' });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error ?? 'Gagal menyelesaikan');
      return body;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pemeriksaan-detail', id] });
      qc.invalidateQueries({ queryKey: ['pemeriksaan-list'] });
      toast.success('Pemeriksaan selesai');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const { mutate: cancel } = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/kunjungan/${id}/cancel`, { method: 'PATCH' });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error ?? 'Gagal membatalkan');
      return body;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pemeriksaan-detail', id] });
      qc.invalidateQueries({ queryKey: ['pemeriksaan-list'] });
      toast.success('Registrasi dibatalkan');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 bg-muted rounded animate-pulse" />
        <div className="h-40 bg-muted rounded animate-pulse" />
        <div className="h-96 bg-muted rounded animate-pulse" />
      </div>
    );
  }

  if (!kunjungan) {
    return (
      <div className="text-center py-16">
        <p className="text-muted-foreground">Kunjungan tidak ditemukan.</p>
        <Link href="/pemeriksaan" className={cn(buttonVariants({ variant: 'outline' }), 'mt-4')}>
          Kembali
        </Link>
      </div>
    );
  }

  const usia        = differenceInYears(new Date(), new Date(kunjungan.pasien.tanggalLahir));
  const hasAlergi   = Boolean(kunjungan.pasien.alergi);
  const bisaSelesai = ['MENUNGGU', 'DALAM_PEMERIKSAAN'].includes(kunjungan.status);
  const bisaBatal   = ['MENUNGGU', 'DALAM_PEMERIKSAAN'].includes(kunjungan.status);

  return (
    <div className="space-y-4">
      {/* Back */}
      <div className="flex items-center gap-2">
        <Link href="/pemeriksaan" className={cn(buttonVariants({ variant: 'ghost', size: 'icon' }))}>
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <span className="text-sm text-muted-foreground">Kembali ke Waiting Area</span>
      </div>

      {/* Patient Header */}
      <Card>
        <CardContent className="pt-4 pb-4">
          <div className="flex items-start gap-4">
            {/* Avatar */}
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 text-xl font-bold text-primary">
              {kunjungan.pasien.nama.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
            </div>

            {/* Identity */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg font-bold">{kunjungan.pasien.nama}</h2>
                <Badge variant="outline" className="text-xs font-mono">{kunjungan.pasien.nomorRM}</Badge>
                <span className={cn('inline-flex rounded-full px-2 py-0.5 text-xs font-medium', STATUS_COLOR[kunjungan.status])}>
                  {STATUS_LABEL[kunjungan.status]}
                </span>
                {hasAlergi && (
                  <Badge className="bg-red-100 text-red-800 border-red-200 gap-1 text-xs">
                    <AlertTriangle className="h-3 w-3" /> Alergi
                  </Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground mt-0.5">
                {kunjungan.pasien.jenisKelamin === 'LAKI_LAKI' ? 'Laki-laki' : 'Perempuan'} · {usia} tahun ·
                Gol. Darah: {kunjungan.pasien.golonganDarah ?? '—'}
              </p>

              {/* Registration Info */}
              <div className="flex flex-wrap gap-4 mt-2 text-xs text-muted-foreground">
                <span>📋 No. Antrean: <strong className="text-foreground">{kunjungan.nomorAntrean}</strong></span>
                <span>👨‍⚕️ {kunjungan.dokterProfile ? `dr. ${kunjungan.dokterProfile.user.nama}` : 'Belum ada dokter'}</span>
                <span>🏥 {kunjungan.poli?.nama ?? '—'}</span>
                {kunjungan.penjamin && (
                  <span>💳 {kunjungan.penjamin}</span>
                )}
                <span>🕐 {format(new Date(kunjungan.tanggal), 'HH:mm')} WIB</span>
              </div>
            </div>
          </div>

          {/* Alergi Alert */}
          {hasAlergi && (
            <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-600 flex-shrink-0" />
              <p className="text-sm text-red-800">
                <strong>PERHATIAN ALERGI:</strong> {kunjungan.pasien.alergi}
              </p>
            </div>
          )}

          {/* Vitals Summary */}
          {kunjungan.asesmen && (
            <div className="mt-4">
              <p className="text-xs text-muted-foreground mb-2 font-medium">TANDA VITAL</p>
              <VitalsPanel asesmen={kunjungan.asesmen} />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Main Layout: Sidebar + Content */}
      <div className="flex gap-4">
        {/* Sidebar */}
        <div className="w-52 flex-shrink-0 space-y-1">
          {SIDEBAR_MODULES.map(m => {
            const Icon = m.icon;
            return (
              <button
                key={m.id}
                onClick={() => setActiveModule(m.id)}
                className={cn(
                  'w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-left transition-colors',
                  activeModule === m.id
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                )}
              >
                <Icon className="h-4 w-4 flex-shrink-0" />
                {m.label}
              </button>
            );
          })}

          {/* Action Buttons */}
          <div className="pt-4 space-y-2 border-t mt-4">
            {bisaSelesai && (
              <Button size="sm" className="w-full bg-green-600 hover:bg-green-700 text-white"
                disabled={selesaiPending} onClick={() => selesai()}>
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Pasien Keluar
              </Button>
            )}
            {bisaBatal && (
              <Button size="sm" variant="outline" className="w-full text-destructive border-destructive hover:bg-destructive/10"
                onClick={() => cancel()}>
                <XCircle className="h-4 w-4 mr-2" />
                Batal Registrasi
              </Button>
            )}
          </div>
        </div>

        {/* Content */}
        <Card className="flex-1 min-w-0">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">
              {SIDEBAR_MODULES.find(m => m.id === activeModule)?.label}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {activeModule === 'identitas'  && <ModuleIdentitas pasien={kunjungan.pasien} />}
            {activeModule === 'asesmen'    && (
              <ModuleAsesmen kunjunganId={kunjungan.id} asesmen={kunjungan.asesmen} />
            )}
            {activeModule === 'soap'       && <ModuleSOAP soap={kunjungan.soap} />}
            {activeModule === 'penunjang'  && <ComingSoon label="Penunjang Medis" />}
            {activeModule === 'tindakan'   && <ComingSoon label="Procedure & Equipment" />}
            {activeModule === 'resep'      && <ComingSoon label="Medication" />}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
