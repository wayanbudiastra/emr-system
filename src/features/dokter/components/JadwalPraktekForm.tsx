'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { jadwalPraktekSchema } from '../schemas/dokter.schema';

type JadwalFormInput = z.input<typeof jadwalPraktekSchema>;
type JadwalFormOutput = z.output<typeof jadwalPraktekSchema>;
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from '@/components/ui/form';
import { Input }  from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { CalendarPlus } from 'lucide-react';
import { useCreateJadwal } from '../hooks/useDokter';

const HARI_OPTIONS = [
  { value: 'SENIN',  label: 'Senin' },
  { value: 'SELASA', label: 'Selasa' },
  { value: 'RABU',   label: 'Rabu' },
  { value: 'KAMIS',  label: 'Kamis' },
  { value: 'JUMAT',  label: 'Jumat' },
  { value: 'SABTU',  label: 'Sabtu' },
  { value: 'MINGGU', label: 'Minggu' },
];

interface DokterPoliOption {
  id:   string;
  poli: { nama: string; kode: string };
}

interface Props {
  dokterProfileId: string;
  dokterPoliList:  DokterPoliOption[];
  onSuccess?:      () => void;
}

export function JadwalPraktekForm({ dokterProfileId, dokterPoliList, onSuccess }: Props) {
  const { mutate: create, isPending } = useCreateJadwal(dokterProfileId);

  const form = useForm<JadwalPraktekValues>({
    resolver: zodResolver(jadwalPraktekSchema),
    defaultValues: { kuotaPasien: 20, isAktif: true },
  });

  const handleSubmit = (data: JadwalPraktekValues) => {
    create(data, { onSuccess: () => { form.reset(); onSuccess?.(); } });
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">

        <FormField control={form.control} name="dokterPoliId" render={({ field }) => (
          <FormItem>
            <FormLabel>Poli <span className="text-destructive">*</span></FormLabel>
            <Select onValueChange={field.onChange} value={field.value ?? ''}>
              <FormControl>
                <SelectTrigger><SelectValue placeholder="— Pilih Poli —" /></SelectTrigger>
              </FormControl>
              <SelectContent>
                {dokterPoliList.map(dp => (
                  <SelectItem key={dp.id} value={dp.id}>
                    [{dp.poli.kode}] {dp.poli.nama}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )} />

        <FormField control={form.control} name="hari" render={({ field }) => (
          <FormItem>
            <FormLabel>Hari Praktek <span className="text-destructive">*</span></FormLabel>
            <Select onValueChange={field.onChange} value={field.value ?? ''}>
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

        <div className="grid grid-cols-3 gap-4">
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
              <FormLabel>Kuota Pasien</FormLabel>
              <FormControl>
                <Input
                  type="number" min={1} max={200}
                  {...field}
                  onChange={e => field.onChange(parseInt(e.target.value) || 20)}
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

        <Button type="submit" disabled={isPending}>
          <CalendarPlus className="h-4 w-4 mr-2" />
          {isPending ? 'Menyimpan...' : 'Tambah Jadwal'}
        </Button>
      </form>
    </Form>
  );
}
