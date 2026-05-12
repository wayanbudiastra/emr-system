'use client';

import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { sharingFeeSchema, type SharingFeeFormValues } from '../schemas/dokter.schema';
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from '@/components/ui/form';
import { Input }        from '@/components/ui/input';
import { Button }       from '@/components/ui/button';
import { SharingFeeBar } from './SharingFeeBar';
import { Percent }      from 'lucide-react';
import { useSaveSharingFee } from '../hooks/useDokter';

const KATEGORI_OPTIONS = [
  { value: 'TINDAKAN',  label: 'Tindakan Medis',  desc: 'Prosedur & tindakan di poli' },
  { value: 'LAB',       label: 'Laboratorium',     desc: 'Pemeriksaan lab' },
  { value: 'RADIOLOGI', label: 'Radiologi',        desc: 'Imaging & radiologi' },
  { value: 'PERALATAN', label: 'Peralatan Medis',  desc: 'Penggunaan alat' },
] as const;

interface Props {
  dokterProfileId: string;
  defaultValues?:  SharingFeeFormValues;
}

export function SharingFeeForm({ dokterProfileId, defaultValues }: Props) {
  const { mutate: save, isPending } = useSaveSharingFee(dokterProfileId);

  const form = useForm<SharingFeeFormValues>({
    resolver: zodResolver(sharingFeeSchema),
    defaultValues: defaultValues ?? {
      fees: KATEGORI_OPTIONS.map(k => ({ kategori: k.value, persentase: 0 })),
    },
  });

  const fees = useWatch({ control: form.control, name: 'fees' });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit((d) => save(d))} className="space-y-6">
        <div className="space-y-4">
          {KATEGORI_OPTIONS.map((k, index) => (
            <div key={k.value} className="rounded-lg border p-4 space-y-3">
              <div>
                <p className="text-sm font-medium">{k.label}</p>
                <p className="text-xs text-muted-foreground">{k.desc}</p>
              </div>

              <FormField control={form.control} name={`fees.${index}.persentase`}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="sr-only">Persentase {k.label}</FormLabel>
                    <div className="flex items-center gap-3">
                      <FormControl>
                        <div className="relative w-28">
                          <Input
                            type="number" min={0} max={100} step={0.5}
                            className="pr-8 text-right"
                            {...field}
                            onChange={e => field.onChange(parseFloat(e.target.value) || 0)}
                          />
                          <Percent className="absolute right-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        </div>
                      </FormControl>
                      <div className="flex-1">
                        <SharingFeeBar
                          kategori={k.value}
                          persentase={fees?.[index]?.persentase ?? 0}
                        />
                      </div>
                    </div>
                    <FormMessage />
                  </FormItem>
                )} />
            </div>
          ))}
        </div>

        <Button type="submit" disabled={isPending}>
          <Percent className="h-4 w-4 mr-2" />
          {isPending ? 'Menyimpan...' : 'Simpan Sharing Fee'}
        </Button>
      </form>
    </Form>
  );
}
