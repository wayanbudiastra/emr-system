'use client';

import { useState }  from 'react';
import { useForm }   from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z }         from 'zod';
import { Badge }     from '@/components/ui/badge';
import { Button }    from '@/components/ui/button';
import { Switch }    from '@/components/ui/switch';
import { Input }     from '@/components/ui/input';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from '@/components/ui/form';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Trash2, CalendarPlus, Pencil } from 'lucide-react';
import { useToggleJadwal, useDeleteJadwal, useUpdateJadwal } from '../hooks/useDokter';
import { JadwalPraktekForm } from './JadwalPraktekForm';
import { jadwalPraktekSchema } from '../schemas/dokter.schema';

const HARI_OPTIONS = [
  { value: 'SENIN',  label: 'Senin' },
  { value: 'SELASA', label: 'Selasa' },
  { value: 'RABU',   label: 'Rabu' },
  { value: 'KAMIS',  label: 'Kamis' },
  { value: 'JUMAT',  label: 'Jumat' },
  { value: 'SABTU',  label: 'Sabtu' },
  { value: 'MINGGU', label: 'Minggu' },
];

const HARI_LABEL: Record<string, string> = Object.fromEntries(
  HARI_OPTIONS.map(h => [h.value, h.label])
);

type EditSchema = z.input<typeof jadwalPraktekSchema>;

interface JadwalRow {
  id:          string;
  dokterPoliId: string;
  hari:        string;
  jamMulai:    string;
  jamSelesai:  string;
  kuotaPasien: number;
  isAktif:     boolean;
  keterangan?: string | null;
}

interface DokterPoliRow {
  id:            string;
  isAktif:       boolean;
  poli:          { nama: string; kode: string };
  jadwalPraktek: JadwalRow[];
}

interface Props {
  dokterProfileId: string;
  poliMappings:    DokterPoliRow[];
}

function EditJadwalDialog({
  jadwal,
  dokterProfileId,
  onClose,
}: {
  jadwal: JadwalRow;
  dokterProfileId: string;
  onClose: () => void;
}) {
  const { mutate: update, isPending } = useUpdateJadwal(dokterProfileId);

  const form = useForm<EditSchema>({
    resolver: zodResolver(jadwalPraktekSchema) as never,
    defaultValues: {
      dokterPoliId: jadwal.dokterPoliId,
      hari:         jadwal.hari as EditSchema['hari'],
      jamMulai:     jadwal.jamMulai,
      jamSelesai:   jadwal.jamSelesai,
      kuotaPasien:  jadwal.kuotaPasien,
      keterangan:   jadwal.keterangan ?? '',
      isAktif:      jadwal.isAktif,
    },
  });

  const handleSubmit = (values: EditSchema) => {
    update(
      { jadwalId: jadwal.id, data: values },
      { onSuccess: onClose }
    );
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Jadwal Praktek</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">

            <FormField control={form.control} name="hari" render={({ field }) => (
              <FormItem>
                <FormLabel>Hari <span className="text-destructive">*</span></FormLabel>
                <Select onValueChange={(v) => field.onChange(v ?? '')} value={field.value ?? ''}>
                  <FormControl>
                    <SelectTrigger><SelectValue placeholder="— Pilih Hari —" /></SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {HARI_OPTIONS.map(h => (
                      <SelectItem key={h.value} value={h.value}>{h.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />

            <div className="grid grid-cols-3 gap-3">
              <FormField control={form.control} name="jamMulai" render={({ field }) => (
                <FormItem>
                  <FormLabel>Jam Mulai <span className="text-destructive">*</span></FormLabel>
                  <FormControl><Input type="time" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="jamSelesai" render={({ field }) => (
                <FormItem>
                  <FormLabel>Jam Selesai <span className="text-destructive">*</span></FormLabel>
                  <FormControl><Input type="time" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="kuotaPasien" render={({ field }) => (
                <FormItem>
                  <FormLabel>Kuota</FormLabel>
                  <FormControl>
                    <Input
                      type="number" min={1} max={200}
                      {...field}
                      onChange={e => field.onChange(parseInt(e.target.value) || 1)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            <FormField control={form.control} name="keterangan" render={({ field }) => (
              <FormItem>
                <FormLabel>Keterangan</FormLabel>
                <FormControl>
                  <Input placeholder="Opsional: Khusus BPJS, Konsultasi Umum, dst." {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <DialogFooter>
              <Button type="button" variant="ghost" onClick={onClose}>Batal</Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? 'Menyimpan...' : 'Simpan Perubahan'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

export function JadwalPraktekTable({ dokterProfileId, poliMappings }: Props) {
  const [showForm,   setShowForm]   = useState(false);
  const [editJadwal, setEditJadwal] = useState<JadwalRow | null>(null);

  const { mutate: toggle } = useToggleJadwal(dokterProfileId);
  const { mutate: del }    = useDeleteJadwal(dokterProfileId);

  const aktifMappings = poliMappings.filter(m => m.isAktif);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">
          Jadwal per poli, diurutkan hari &amp; jam mulai.
        </p>
        <Button size="sm" onClick={() => setShowForm(v => !v)}>
          <CalendarPlus className="h-4 w-4 mr-2" />
          Tambah Jadwal
        </Button>
      </div>

      {showForm && (
        <div className="rounded-lg border p-4">
          <h3 className="text-sm font-medium mb-4">Form Jadwal Baru</h3>
          <JadwalPraktekForm
            dokterProfileId={dokterProfileId}
            dokterPoliList={aktifMappings}
            onSuccess={() => setShowForm(false)}
          />
        </div>
      )}

      {aktifMappings.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-4">
          Dokter belum memiliki mapping poli. Tambahkan mapping poli terlebih dahulu.
        </p>
      ) : (
        <div className="space-y-4">
          {aktifMappings.map(mapping => (
            <div key={mapping.id} className="rounded-lg border">
              <div className="flex items-center gap-2 px-4 py-3 border-b bg-muted/40">
                <Badge variant="secondary" className="text-xs font-mono">
                  {mapping.poli.kode}
                </Badge>
                <span className="text-sm font-medium">{mapping.poli.nama}</span>
                <Badge variant="outline" className="ml-auto text-xs">
                  {mapping.jadwalPraktek.length} jadwal
                </Badge>
              </div>

              <div className="p-3">
                {mapping.jadwalPraktek.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-1 px-1">
                    Belum ada jadwal untuk poli ini.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {mapping.jadwalPraktek.map(j => (
                      <div
                        key={j.id}
                        className="flex items-center justify-between rounded-md border px-3 py-2"
                      >
                        <div className="flex items-center gap-3 flex-wrap">
                          <Badge
                            variant={j.isAktif ? 'default' : 'secondary'}
                            className="w-20 justify-center text-xs"
                          >
                            {HARI_LABEL[j.hari] ?? j.hari}
                          </Badge>
                          <span className="text-sm tabular-nums font-medium">
                            {j.jamMulai} – {j.jamSelesai}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            Kuota: {j.kuotaPasien}
                          </span>
                          {j.keterangan && (
                            <span className="text-xs text-muted-foreground italic">
                              · {j.keterangan}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-1">
                          <Switch
                            checked={j.isAktif}
                            onCheckedChange={v => toggle({ jadwalId: j.id, isAktif: v })}
                          />
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            title="Edit jadwal"
                            onClick={() => setEditJadwal(j)}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-destructive hover:text-destructive"
                            title="Hapus jadwal"
                            onClick={() => del(j.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {editJadwal && (
        <EditJadwalDialog
          jadwal={editJadwal}
          dokterProfileId={dokterProfileId}
          onClose={() => setEditJadwal(null)}
        />
      )}
    </div>
  );
}
