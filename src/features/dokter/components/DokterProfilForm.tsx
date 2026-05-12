'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { dokterProfileSchema } from '../schemas/dokter.schema';

type DokterProfileFormValues = z.infer<typeof dokterProfileSchema>;
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from '@/components/ui/form';
import { Input }  from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { BadgeCheck } from 'lucide-react';
import { useSaveProfilDokter } from '../hooks/useDokter';

interface Props {
  userId: string;
  defaultValues?: Partial<DokterProfileFormValues & { tglExpiredSIP: Date | string | null }>;
}

export function DokterProfilForm({ userId, defaultValues }: Props) {
  const { mutate: save, isPending } = useSaveProfilDokter(userId);

  const form = useForm<DokterProfileFormValues>({
    resolver: zodResolver(dokterProfileSchema) as never,
    defaultValues: {
      nik:           defaultValues?.nik          ?? '',
      noSIP:         defaultValues?.noSIP         ?? '',
      tglExpiredSIP: defaultValues?.tglExpiredSIP
        ? new Date(defaultValues.tglExpiredSIP)
        : null,
      spesialisasi:  defaultValues?.spesialisasi  ?? '',
    },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit((d) => save(d))} className="space-y-4">

        <FormField control={form.control} name="nik" render={({ field }) => (
          <FormItem>
            <FormLabel>NIK Dokter</FormLabel>
            <FormControl>
              <Input
                placeholder="16 digit angka"
                maxLength={16}
                {...field}
                onChange={e => field.onChange(e.target.value.replace(/\D/g, ''))}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )} />

        <div className="grid grid-cols-2 gap-4">
          <FormField control={form.control} name="noSIP" render={({ field }) => (
            <FormItem>
              <FormLabel>Nomor SIP</FormLabel>
              <FormControl>
                <Input placeholder="Contoh: 446/SIP-DU/2024" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )} />

          <FormField control={form.control} name="tglExpiredSIP" render={({ field }) => (
            <FormItem>
              <FormLabel>Tanggal Expired SIP</FormLabel>
              <FormControl>
                <Input
                  type="date"
                  value={field.value instanceof Date
                    ? field.value.toISOString().split('T')[0]
                    : field.value ?? ''}
                  onChange={e => field.onChange(e.target.value ? new Date(e.target.value) : null)}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )} />
        </div>

        <FormField control={form.control} name="spesialisasi" render={({ field }) => (
          <FormItem>
            <FormLabel>Spesialisasi</FormLabel>
            <FormControl>
              <Input placeholder="Umum / Penyakit Dalam / Mata / Bedah / ..." {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )} />

        <Button type="submit" disabled={isPending}>
          <BadgeCheck className="h-4 w-4 mr-2" />
          {isPending ? 'Menyimpan...' : 'Simpan Profil'}
        </Button>
      </form>
    </Form>
  );
}
