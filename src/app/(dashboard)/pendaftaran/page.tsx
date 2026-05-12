'use client';

import { useState, useEffect } from 'react';
import { useForm }   from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { format }    from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import {
  ClipboardList, Calendar, UserPlus, List,
  Search, RefreshCw, Clock, Users, CheckCircle2,
  XCircle, Ticket, AlertCircle, Pencil,
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from '@/components/ui/form';
import {
  useJadwalTersedia, useListPendaftaran,
  useCreateAppointment, useCheckinAppointment, useWalkin,
  useCancelKunjungan, useBookingByKode,
} from '@/features/pendaftaran/hooks/usePendaftaran';
import { usePasienList } from '@/features/pasien/hooks/usePasien';
import { createAppointmentSchema, walkinSchema } from '@/features/pendaftaran/schemas/pendaftaran.schema';
import type { CreateAppointmentValues, WalkinValues } from '@/features/pendaftaran/schemas/pendaftaran.schema';
import { useQueryClient } from '@tanstack/react-query';

const TODAY = format(new Date(), 'yyyy-MM-dd');

const PENJAMIN_OPTIONS = [
  { value: 'UMUM',     label: 'Umum (Mandiri)' },
  { value: 'BPJS',     label: 'BPJS Kesehatan' },
  { value: 'ASURANSI', label: 'Asuransi Swasta' },
];

const STATUS_COLORS: Record<string, string> = {
  MENUNGGU:          'bg-yellow-100 text-yellow-800',
  DALAM_PEMERIKSAAN: 'bg-blue-100 text-blue-800',
  SELESAI:           'bg-green-100 text-green-800',
  DIBATALKAN:        'bg-red-100 text-red-800',
};

const STATUS_LABELS: Record<string, string> = {
  MENUNGGU:          'Menunggu',
  DALAM_PEMERIKSAAN: 'Diperiksa',
  SELESAI:           'Selesai',
  DIBATALKAN:        'Batal',
};

type JadwalItem = {
  id: string;
  jamMulai: string;
  jamSelesai: string;
  kuotaPasien: number;
  kuotaTerpakai: number;
  sisaKuota: number;
  tersedia: boolean;
  dokterPoli: {
    poliId: string;
    poli: { id: string; nama: string; kode: string };
    dokterProfile: { id: string; spesialisasi: string | null; user: { nama: string } };
  };
};

// ── Tab 1: Appointment ────────────────────────────────────────
function TabAppointment() {
  const [tanggal, setTanggal]           = useState(TODAY);
  const [spesialisasi, setSpesialisasi] = useState('');
  const [selectedJadwal, setSelectedJadwal] = useState<JadwalItem | null>(null);

  const { data: jadwalList, isLoading } = useJadwalTersedia({ tanggal, spesialisasi: spesialisasi || undefined });
  const jadwal: JadwalItem[] = jadwalList ?? [];

  const spesialisasiList: string[] = Array.from(
    new Set(jadwal.map(j => j.dokterPoli.dokterProfile.spesialisasi).filter((s): s is string => Boolean(s)))
  );

  const filtered = spesialisasi
    ? jadwal.filter(j => j.dokterPoli.dokterProfile.spesialisasi?.toLowerCase().includes(spesialisasi.toLowerCase()))
    : jadwal;

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="pt-4 pb-4">
          <div className="flex flex-wrap gap-3 items-end">
            <div className="space-y-1">
              <Label>Tanggal Praktek</Label>
              <Input type="date" value={tanggal} onChange={e => setTanggal(e.target.value)} className="w-44" />
            </div>
            <div className="space-y-1">
              <Label>Spesialisasi</Label>
              <Select value={spesialisasi || '__ALL__'} onValueChange={v => setSpesialisasi(v === '__ALL__' ? '' : (v ?? ''))}>
                <SelectTrigger className="w-48"><SelectValue placeholder="Semua" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__ALL__">Semua Spesialisasi</SelectItem>
                  {spesialisasiList.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[1,2,3].map(i => <Skeleton key={i} className="h-32 w-full" />)}
        </div>
      ) : !filtered.length ? (
        <div className="text-center py-12 text-muted-foreground">
          <Calendar className="mx-auto h-10 w-10 mb-2 opacity-30" />
          <p>Tidak ada jadwal tersedia pada tanggal ini.</p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map(j => (
            <Card key={j.id} className={!j.tersedia ? 'opacity-60' : 'cursor-pointer hover:border-primary transition-colors'}>
              <CardContent className="pt-4 pb-3 space-y-2">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-semibold text-sm">dr. {j.dokterPoli.dokterProfile.user.nama}</p>
                    <p className="text-xs text-muted-foreground">{j.dokterPoli.dokterProfile.spesialisasi ?? 'Umum'} · {j.dokterPoli.poli.nama}</p>
                  </div>
                  <Badge variant={j.tersedia ? 'default' : 'secondary'} className="text-xs">
                    {j.tersedia ? `${j.sisaKuota} sisa` : 'Penuh'}
                  </Badge>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Clock className="h-3.5 w-3.5" />
                  <span>{j.jamMulai} – {j.jamSelesai}</span>
                  <span>·</span>
                  <Users className="h-3.5 w-3.5" />
                  <span>{j.kuotaTerpakai}/{j.kuotaPasien}</span>
                </div>
                <Button size="sm" className="w-full" disabled={!j.tersedia} onClick={() => setSelectedJadwal(j)}>
                  Buat Appointment
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {selectedJadwal && (
        <AppointmentFormDialog jadwal={selectedJadwal} tanggal={tanggal} onClose={() => setSelectedJadwal(null)} />
      )}
    </div>
  );
}

function AppointmentFormDialog({ jadwal, tanggal, onClose }: { jadwal: JadwalItem; tanggal: string; onClose: () => void }) {
  const { mutate: create, isPending, isSuccess, data: result } = useCreateAppointment();
  const [pasienSearch, setPasienSearch] = useState('');
  const { data: pasienData } = usePasienList({ q: pasienSearch || undefined, limit: 8 });

  const form = useForm<CreateAppointmentValues>({
    resolver: zodResolver(createAppointmentSchema) as never,
    defaultValues: {
      dokterProfileId: jadwal.dokterPoli.dokterProfile.id,
      jadwalPraktekId: jadwal.id,
      tanggalPraktek:  new Date(tanggal),
      penjamin:        'UMUM',
      namaPasien:      '',
      nikSementara:    '',
      noHP:            '',
    },
  });

  const pasienId = form.watch('pasienId');

  if (isSuccess && result) {
    return (
      <Dialog open onOpenChange={o => !o && onClose()}>
        <DialogContent className="max-w-sm">
          <div className="text-center py-4 space-y-3">
            <CheckCircle2 className="h-12 w-12 text-green-600 mx-auto" />
            <p className="font-semibold text-lg">Appointment Dibuat!</p>
            <div className="rounded-lg bg-muted p-4 space-y-1">
              <p className="text-xs text-muted-foreground">Kode Booking</p>
              <p className="font-mono text-xl font-bold">{result.kodeBooking}</p>
            </div>
            <p className="text-xs text-muted-foreground">Simpan kode ini untuk check-in pada hari kunjungan</p>
            <Button className="w-full" onClick={onClose}>Selesai</Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open onOpenChange={o => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Buat Appointment</DialogTitle>
          <p className="text-sm text-muted-foreground">
            dr. {jadwal.dokterPoli.dokterProfile.user.nama} · {jadwal.dokterPoli.poli.nama} · {jadwal.jamMulai}–{jadwal.jamSelesai}
          </p>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(d => create(d))} className="space-y-4">

            <FormField control={form.control} name="pasienId" render={({ field }) => (
              <FormItem>
                <FormLabel>Cari Pasien Terdaftar</FormLabel>
                <div className="space-y-2">
                  <Input placeholder="Nama / No. RM..."
                    value={pasienSearch}
                    onChange={e => { setPasienSearch(e.target.value); field.onChange(''); }}
                  />
                  {pasienData?.data?.length > 0 && !field.value && pasienSearch && (
                    <div className="border rounded-md divide-y max-h-36 overflow-y-auto">
                      {pasienData.data.map((p: { id: string; nama: string; nomorRM: string }) => (
                        <button key={p.id} type="button"
                          className="w-full text-left px-3 py-2 text-sm hover:bg-muted"
                          onClick={() => { field.onChange(p.id); setPasienSearch(`${p.nama} (${p.nomorRM})`); }}
                        >
                          <span className="font-medium">{p.nama}</span>
                          <span className="text-muted-foreground ml-2 text-xs">{p.nomorRM}</span>
                        </button>
                      ))}
                    </div>
                  )}
                  {field.value && (
                    <div className="flex items-center gap-2 text-sm text-green-700">
                      <CheckCircle2 className="h-4 w-4" /> Pasien terpilih
                      <button type="button" className="text-muted-foreground ml-auto" onClick={() => { field.onChange(''); setPasienSearch(''); }}>× Ganti</button>
                    </div>
                  )}
                </div>
              </FormItem>
            )} />

            {!pasienId && (
              <div className="border-t pt-3 space-y-3">
                <p className="text-xs text-muted-foreground">— atau isi data pasien baru —</p>
                <FormField control={form.control} name="namaPasien" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nama Pasien Baru</FormLabel>
                    <FormControl><Input placeholder="Nama lengkap" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <div className="grid grid-cols-2 gap-3">
                  <FormField control={form.control} name="nikSementara" render={({ field }) => (
                    <FormItem>
                      <FormLabel>NIK</FormLabel>
                      <FormControl><Input placeholder="Opsional" maxLength={16} {...field} /></FormControl>
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="noHP" render={({ field }) => (
                    <FormItem>
                      <FormLabel>No. HP</FormLabel>
                      <FormControl><Input placeholder="08..." {...field} /></FormControl>
                    </FormItem>
                  )} />
                </div>
              </div>
            )}

            <FormField control={form.control} name="keluhan" render={({ field }) => (
              <FormItem>
                <FormLabel>Keluhan</FormLabel>
                <FormControl><Input placeholder="Keluhan utama (opsional)" {...field} /></FormControl>
              </FormItem>
            )} />

            <FormField control={form.control} name="penjamin" render={({ field }) => (
              <FormItem>
                <FormLabel>Penjamin</FormLabel>
                <Select value={field.value} onValueChange={v => field.onChange(v ?? 'UMUM')}>
                  <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                  <SelectContent>
                    {PENJAMIN_OPTIONS.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </FormItem>
            )} />

            <DialogFooter>
              <Button type="button" variant="ghost" onClick={onClose}>Batal</Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? 'Memproses...' : 'Buat Appointment'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

// ── Tab 2: Pendaftaran ────────────────────────────────────────
function TabPendaftaran() {
  const [mode, setMode] = useState<'booking' | 'walkin'>('booking');
  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Button variant={mode === 'booking' ? 'default' : 'outline'} onClick={() => setMode('booking')}>
          <Ticket className="h-4 w-4 mr-2" /> Via Kode Booking
        </Button>
        <Button variant={mode === 'walkin' ? 'default' : 'outline'} onClick={() => setMode('walkin')}>
          <UserPlus className="h-4 w-4 mr-2" /> Walk-in Langsung
        </Button>
      </div>
      {mode === 'booking' ? <CheckinForm /> : <WalkinForm />}
    </div>
  );
}

function CheckinForm() {
  const [kode, setKode]         = useState('');
  const [debouncedKode, setDb]  = useState('');
  const [penjamin, setPenjamin] = useState('UMUM');
  const { mutate: checkin, isPending, isSuccess, data: result, reset } = useCheckinAppointment();
  const { data: booking, isLoading, error } = useBookingByKode(debouncedKode);

  useEffect(() => {
    const t = setTimeout(() => setDb(kode.toUpperCase()), 600);
    return () => clearTimeout(t);
  }, [kode]);

  if (isSuccess && result) {
    return (
      <Card className="max-w-md">
        <CardContent className="pt-6 text-center space-y-3">
          <CheckCircle2 className="h-12 w-12 text-green-600 mx-auto" />
          <p className="font-semibold">Pasien Berhasil Check-in!</p>
          <p className="text-3xl font-bold text-primary">{result.nomorAntrean}</p>
          <p className="text-xs text-muted-foreground">Nomor Antrean</p>
          <Button className="w-full mt-2" onClick={() => { reset(); setKode(''); setDb(''); }}>
            Check-in Pasien Berikutnya
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="max-w-md">
      <CardHeader><CardTitle className="text-base">Check-in via Kode Booking</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-1">
          <Label>Kode Booking</Label>
          <Input placeholder="APPT-YYYYMMDD-XXXX" value={kode}
            onChange={e => setKode(e.target.value.toUpperCase())} className="font-mono uppercase" />
        </div>

        {isLoading && <p className="text-sm text-muted-foreground animate-pulse">Mencari...</p>}

        {error && (
          <div className="flex items-center gap-2 text-sm text-destructive bg-red-50 rounded p-2">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />{(error as Error).message}
          </div>
        )}

        {booking && !error && (
          <div className="rounded-lg border p-3 space-y-3 bg-muted/40">
            <p className="text-sm font-semibold text-green-700">✓ Data Appointment Ditemukan</p>
            <div className="text-sm space-y-1.5">
              <p><span className="text-muted-foreground w-20 inline-block">Pasien</span>{booking.pasien?.nama ?? booking.namaPasien ?? '—'}</p>
              <p><span className="text-muted-foreground w-20 inline-block">No. RM</span>{booking.pasien?.nomorRM ?? <span className="text-yellow-700">Belum terdaftar</span>}</p>
              <p><span className="text-muted-foreground w-20 inline-block">Dokter</span>dr. {booking.dokterProfile?.user?.nama}</p>
              <p><span className="text-muted-foreground w-20 inline-block">Jadwal</span>{booking.jadwalPraktek?.jamMulai}–{booking.jadwalPraktek?.jamSelesai}</p>
              {booking.keluhan && <p><span className="text-muted-foreground w-20 inline-block">Keluhan</span>{booking.keluhan}</p>}
            </div>

            {!booking.pasienId && (
              <div className="flex items-center gap-2 text-xs text-yellow-800 bg-yellow-50 border border-yellow-200 rounded px-2 py-2">
                <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
                Pasien belum terdaftar di sistem. Daftarkan terlebih dahulu di menu Pasien.
              </div>
            )}

            <div className="space-y-1">
              <Label>Penjamin</Label>
              <Select value={penjamin} onValueChange={v => setPenjamin(v ?? 'UMUM')}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PENJAMIN_OPTIONS.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        <Button className="w-full" disabled={!booking?.pasienId || isPending}
          onClick={() => checkin({ kodeBooking: debouncedKode, penjamin })}>
          {isPending ? 'Memproses...' : 'Daftarkan Pasien'}
        </Button>
      </CardContent>
    </Card>
  );
}

function WalkinForm() {
  const { mutate: walkin, isPending, isSuccess, data: result, reset } = useWalkin();
  const [pasienSearch, setPasienSearch] = useState('');
  const { data: pasienData } = usePasienList({ q: pasienSearch || undefined, limit: 8 });
  const { data: jadwalList }  = useJadwalTersedia({ tanggal: TODAY });
  const jadwal: JadwalItem[]  = (jadwalList ?? []).filter((j: JadwalItem) => j.tersedia);

  const form = useForm<WalkinValues>({
    resolver: zodResolver(walkinSchema) as never,
    defaultValues: { penjamin: 'UMUM', keluhan: '', poliId: '' },
  });

  const jadwalId = form.watch('jadwalPraktekId');

  const handleSubmit = (data: WalkinValues) => {
    const j    = jadwal.find(x => x.id === data.jadwalPraktekId);
    const poliId = j?.dokterPoli.poliId ?? data.poliId;
    const dokterId = j?.dokterPoli.dokterProfile.id ?? data.dokterProfileId;
    walkin({ ...data, poliId, dokterProfileId: dokterId });
  };

  if (isSuccess && result) {
    return (
      <Card className="max-w-md">
        <CardContent className="pt-6 text-center space-y-3">
          <CheckCircle2 className="h-12 w-12 text-green-600 mx-auto" />
          <p className="font-semibold">Pasien Terdaftar (Walk-in)!</p>
          <p className="text-3xl font-bold text-primary">{result.nomorAntrean}</p>
          <p className="text-xs text-muted-foreground">Nomor Antrean</p>
          <Button className="w-full mt-2" onClick={() => { reset(); setPasienSearch(''); }}>
            Daftar Pasien Berikutnya
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="max-w-md">
      <CardHeader><CardTitle className="text-base">Pendaftaran Walk-in</CardTitle></CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">

            <FormField control={form.control} name="pasienId" render={({ field }) => (
              <FormItem>
                <FormLabel>Pasien <span className="text-destructive">*</span></FormLabel>
                <div className="space-y-2">
                  <Input placeholder="Cari nama / no. RM..."
                    value={pasienSearch}
                    onChange={e => { setPasienSearch(e.target.value); field.onChange(''); }}
                  />
                  {pasienData?.data?.length > 0 && !field.value && pasienSearch && (
                    <div className="border rounded-md divide-y max-h-36 overflow-y-auto">
                      {pasienData.data.map((p: { id: string; nama: string; nomorRM: string }) => (
                        <button key={p.id} type="button"
                          className="w-full text-left px-3 py-2 text-sm hover:bg-muted"
                          onClick={() => { field.onChange(p.id); setPasienSearch(`${p.nama} (${p.nomorRM})`); }}
                        >
                          <span className="font-medium">{p.nama}</span>
                          <span className="ml-2 text-xs text-muted-foreground">{p.nomorRM}</span>
                        </button>
                      ))}
                    </div>
                  )}
                  {field.value && (
                    <div className="flex items-center gap-2 text-sm text-green-700">
                      <CheckCircle2 className="h-4 w-4" /> Pasien dipilih
                      <button type="button" className="text-muted-foreground ml-auto text-xs" onClick={() => { field.onChange(''); setPasienSearch(''); }}>× Ganti</button>
                    </div>
                  )}
                </div>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="jadwalPraktekId" render={({ field }) => (
              <FormItem>
                <FormLabel>Jadwal Dokter <span className="text-destructive">*</span></FormLabel>
                <Select value={field.value ?? ''} onValueChange={v => {
                  field.onChange(v ?? '');
                  const j = jadwal.find(x => x.id === v);
                  if (j) {
                    form.setValue('dokterProfileId', j.dokterPoli.dokterProfile.id);
                    form.setValue('poliId', j.dokterPoli.poliId);
                  }
                }}>
                  <FormControl><SelectTrigger><SelectValue placeholder="— Pilih jadwal —" /></SelectTrigger></FormControl>
                  <SelectContent>
                    {jadwal.length === 0
                      ? <SelectItem value="__none__" disabled>Tidak ada jadwal aktif hari ini</SelectItem>
                      : jadwal.map(j => (
                        <SelectItem key={j.id} value={j.id}>
                          dr. {j.dokterPoli.dokterProfile.user.nama} · {j.dokterPoli.poli.nama} · {j.jamMulai}–{j.jamSelesai} (sisa {j.sisaKuota})
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="keluhan" render={({ field }) => (
              <FormItem>
                <FormLabel>Keluhan</FormLabel>
                <FormControl><Input placeholder="Keluhan utama (opsional)" {...field} /></FormControl>
              </FormItem>
            )} />

            <FormField control={form.control} name="penjamin" render={({ field }) => (
              <FormItem>
                <FormLabel>Penjamin</FormLabel>
                <Select value={field.value} onValueChange={v => field.onChange(v ?? 'UMUM')}>
                  <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                  <SelectContent>
                    {PENJAMIN_OPTIONS.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </FormItem>
            )} />

            <Button type="submit" className="w-full" disabled={isPending}>
              {isPending ? 'Mendaftarkan...' : 'Daftarkan Pasien'}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}

// ── Tab 3: List Pendaftaran ───────────────────────────────────
function TabListPendaftaran() {
  const qc = useQueryClient();
  const [tanggal, setTanggal] = useState(TODAY);
  const [search,  setSearch]  = useState('');
  const [page,    setPage]    = useState(1);

  const { data, isLoading } = useListPendaftaran({ tanggal, q: search || undefined, page });
  const { mutate: cancel }  = useCancelKunjungan();

  const rows = data?.data ?? [];

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="pt-4 pb-4">
          <div className="flex flex-wrap gap-3 items-center">
            <Input type="date" value={tanggal}
              onChange={e => { setTanggal(e.target.value); setPage(1); }} className="w-44" />
            <div className="relative flex-1 min-w-48">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Cari nama / no. antrean..." className="pl-9"
                value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
            </div>
            <Button variant="outline" size="icon" onClick={() => qc.invalidateQueries({ queryKey: ['list-pendaftaran'] })}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>No. Antrean</TableHead>
                <TableHead>Pasien</TableHead>
                <TableHead>Dokter / Poli</TableHead>
                <TableHead>Jam</TableHead>
                <TableHead>Penjamin</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-20" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading
                ? Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 7 }).map((_, j) => (
                        <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                      ))}
                    </TableRow>
                  ))
                : !rows.length
                ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-10 text-muted-foreground">
                      <List className="mx-auto h-8 w-8 mb-2 opacity-30" />
                      Belum ada pendaftaran pada {format(new Date(tanggal + 'T00:00:00'), 'dd MMMM yyyy', { locale: idLocale })}
                    </TableCell>
                  </TableRow>
                )
                : rows.map((k: {
                    id: string; nomorAntrean: string; status: string; penjamin: string | null;
                    createdAt: string;
                    pasien: { nama: string; nomorRM: string } | null;
                    dokterProfile: { user: { nama: string } } | null;
                    poli: { nama: string } | null;
                    billing: { status: string } | null;
                    appointment: { kodeBooking: string } | null;
                  }) => {
                  const billingSelesai = k.billing && ['LUNAS', 'SEBAGIAN'].includes(k.billing.status);
                  const bisaBatal = k.status !== 'DIBATALKAN' && k.status !== 'SELESAI' && !billingSelesai;
                  return (
                    <TableRow key={k.id}>
                      <TableCell>
                        <div className="font-mono font-bold text-sm">{k.nomorAntrean}</div>
                        {k.appointment && <div className="text-xs text-muted-foreground">{k.appointment.kodeBooking}</div>}
                      </TableCell>
                      <TableCell>
                        <div className="font-medium text-sm">{k.pasien?.nama ?? '—'}</div>
                        <div className="text-xs text-muted-foreground">{k.pasien?.nomorRM}</div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">{k.dokterProfile ? `dr. ${k.dokterProfile.user.nama}` : '—'}</div>
                        <div className="text-xs text-muted-foreground">{k.poli?.nama ?? '—'}</div>
                      </TableCell>
                      <TableCell className="text-xs tabular-nums text-muted-foreground">
                        {format(new Date(k.createdAt), 'HH:mm')}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">{k.penjamin ?? 'UMUM'}</Badge>
                      </TableCell>
                      <TableCell>
                        <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[k.status] ?? ''}`}>
                          {STATUS_LABELS[k.status] ?? k.status}
                        </span>
                      </TableCell>
                      <TableCell>
                        {bisaBatal && (
                          <Button variant="ghost" size="sm"
                            className="text-destructive hover:text-destructive h-7 text-xs"
                            onClick={() => cancel(k.id)}
                          >
                            <XCircle className="h-3.5 w-3.5 mr-1" />Batal
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {data && data.totalPages > 1 && (
        <div className="flex justify-between text-sm text-muted-foreground">
          <span>Total: {data.total} pendaftaran</span>
          <div className="flex gap-1">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Prev</Button>
            <Button variant="outline" size="sm" disabled={page >= data.totalPages} onClick={() => setPage(p => p + 1)}>Next</Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────
export default function PendaftaranPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <ClipboardList className="h-6 w-6 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">Pendaftaran Pasien</h1>
          <p className="text-sm text-muted-foreground">Appointment, registrasi rawat jalan, dan monitoring antrean</p>
        </div>
      </div>

      <Tabs defaultValue="list">
        <TabsList className="grid grid-cols-3 w-full max-w-lg">
          <TabsTrigger value="appointment"><Calendar className="h-4 w-4 mr-1.5" />Appointment</TabsTrigger>
          <TabsTrigger value="pendaftaran"><UserPlus className="h-4 w-4 mr-1.5" />Pendaftaran</TabsTrigger>
          <TabsTrigger value="list"><List className="h-4 w-4 mr-1.5" />List</TabsTrigger>
        </TabsList>
        <TabsContent value="appointment" className="mt-4"><TabAppointment /></TabsContent>
        <TabsContent value="pendaftaran" className="mt-4"><TabPendaftaran /></TabsContent>
        <TabsContent value="list"        className="mt-4"><TabListPendaftaran /></TabsContent>
      </Tabs>
    </div>
  );
}
