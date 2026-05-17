'use client';

import { useForm, useWatch, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import {
  createPasienSchema,
  updatePasienSchema,
  type CreatePasienDTO,
  type UpdatePasienDTO,
} from '../schemas/pasien.schema';
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from '@/components/ui/form';
import { Input }    from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button }   from '@/components/ui/button';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Badge }    from '@/components/ui/badge';
import { Plus, Trash2, Star, UserPlus, Save } from 'lucide-react';
import { useCreatePasien, useUpdatePasien } from '../hooks/usePasien';

const HUBUNGAN_OPTIONS = [
  { value: 'SUAMI',       label: 'Suami' },
  { value: 'ISTRI',       label: 'Istri' },
  { value: 'AYAH',        label: 'Ayah' },
  { value: 'IBU',         label: 'Ibu' },
  { value: 'ANAK',        label: 'Anak' },
  { value: 'KAKAK',       label: 'Kakak' },
  { value: 'ADIK',        label: 'Adik' },
  { value: 'KAKEK',       label: 'Kakek' },
  { value: 'NENEK',       label: 'Nenek' },
  { value: 'PAMAN',       label: 'Paman' },
  { value: 'BIBI',        label: 'Bibi' },
  { value: 'KEPONAKAN',   label: 'Keponakan' },
  { value: 'TEMAN',       label: 'Teman' },
  { value: 'REKAN_KERJA', label: 'Rekan Kerja' },
  { value: 'LAINNYA',     label: 'Lainnya' },
];

type PasienFormProps = {
  mode?: 'create' | 'edit';
  pasienId?: string;
  defaultValues?: Partial<CreatePasienDTO>;
};

export function PasienForm({ mode = 'create', pasienId, defaultValues }: PasienFormProps) {
  const router = useRouter();
  const { mutate: createPasien, isPending: isCreating } = useCreatePasien();
  const { mutate: updatePasien, isPending: isUpdating } = useUpdatePasien(pasienId ?? '');
  const isPending = isCreating || isUpdating;

  const schema = mode === 'edit' ? updatePasienSchema : createPasienSchema;

  const form = useForm<CreatePasienDTO>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(schema as any),
    defaultValues: {
      tipePasien:   'WNI',
      jenisKelamin: '' as 'LAKI_LAKI' | 'PEREMPUAN',
      nama:         '',
      tempatLahir:  '',
      alamat:       '',
      telepon:      '',
      email:        '',
      nik:          '',
      noBPJS:       '',
      noPaspor:     '',
      negaraAsal:   '',
      noAsuransi:   '',
      alergi:       '',
      kontakDarurat: [],
      ...defaultValues,
    },
  });

  // Reactive WNI/WNA switching
  const tipePasien = useWatch({ control: form.control, name: 'tipePasien' });

  // Dynamic kontak darurat
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'kontakDarurat',
  });

  const setPrimary = (index: number) => {
    fields.forEach((_, i) =>
      form.setValue(`kontakDarurat.${i}.isPrimary`, i === index)
    );
  };

  function onSubmit(data: CreatePasienDTO) {
    if (mode === 'edit' && pasienId) {
      updatePasien(data as UpdatePasienDTO);
    } else {
      createPasien(data);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">

        {/* ── Section 1: Identitas Utama ── */}
        <div className="rounded-lg border p-4 space-y-4">
          <p className="text-sm font-medium text-muted-foreground">Identitas Utama</p>

          {/* Tipe Pasien */}
          {mode === 'create' && (
            <FormField control={form.control} name="tipePasien" render={({ field }) => (
              <FormItem>
                <FormLabel>Tipe Pasien <span className="text-destructive">*</span></FormLabel>
                <div className="flex gap-3">
                  {(['WNI', 'WNA'] as const).map((t) => (
                    <button key={t} type="button" onClick={() => field.onChange(t)}
                      className={`flex-1 py-2 px-4 rounded-md border text-sm font-medium transition-colors
                        ${field.value === t
                          ? t === 'WNI'
                            ? 'bg-blue-50 border-blue-500 text-blue-700 dark:bg-blue-950/40 dark:border-blue-400 dark:text-blue-300'
                            : 'bg-purple-50 border-purple-500 text-purple-700 dark:bg-purple-950/40 dark:border-purple-400 dark:text-purple-300'
                          : 'border-input hover:bg-muted'}`}>
                      {t === 'WNI' ? '🇮🇩 WNI' : '🌐 WNA'}
                    </button>
                  ))}
                </div>
                <FormMessage />
              </FormItem>
            )} />
          )}

          {/* Nama */}
          <FormField control={form.control} name="nama" render={({ field }) => (
            <FormItem>
              <FormLabel>Nama Lengkap <span className="text-destructive">*</span></FormLabel>
              <FormControl><Input placeholder="Sesuai KTP / Paspor" {...field} value={field.value ?? ''} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />

          <div className="grid grid-cols-2 gap-4">
            {/* Tempat Lahir */}
            <FormField control={form.control} name="tempatLahir" render={({ field }) => (
              <FormItem>
                <FormLabel>Tempat Lahir <span className="text-destructive">*</span></FormLabel>
                <FormControl><Input placeholder="Kota / Kabupaten" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            {/* Tanggal Lahir */}
            <FormField control={form.control} name="tanggalLahir" render={({ field }) => (
              <FormItem>
                <FormLabel>Tanggal Lahir <span className="text-destructive">*</span></FormLabel>
                <FormControl>
                  <Input type="date"
                    value={field.value instanceof Date
                      ? field.value.toISOString().split('T')[0]
                      : (field.value ? new Date(field.value as string).toISOString().split('T')[0] : '')}
                    onChange={e => field.onChange(new Date(e.target.value))}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Jenis Kelamin */}
            <FormField control={form.control} name="jenisKelamin" render={({ field }) => (
              <FormItem>
                <FormLabel>Jenis Kelamin <span className="text-destructive">*</span></FormLabel>
                <FormControl>
                  <RadioGroup value={field.value ?? ''} onValueChange={field.onChange}
                    className="flex gap-4 pt-1">
                    {[{ v: 'LAKI_LAKI', l: 'Laki-laki' }, { v: 'PEREMPUAN', l: 'Perempuan' }].map(o => (
                      <div key={o.v} className="flex items-center gap-2">
                        <RadioGroupItem value={o.v} id={`jk-${o.v}`} />
                        <label htmlFor={`jk-${o.v}`} className="text-sm cursor-pointer">{o.l}</label>
                      </div>
                    ))}
                  </RadioGroup>
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />

            {/* Golongan Darah */}
            <FormField control={form.control} name="golonganDarah" render={({ field }) => (
              <FormItem>
                <FormLabel>Golongan Darah</FormLabel>
                <Select onValueChange={field.onChange} value={field.value ?? ''}>
                  <FormControl><SelectTrigger><SelectValue placeholder="— Pilih —" /></SelectTrigger></FormControl>
                  <SelectContent>
                    {['A', 'B', 'AB', 'O'].map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                    <SelectItem value="TIDAK_DIKETAHUI">Tidak diketahui</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />
          </div>
        </div>

        {/* ── Section 2: Identifikasi & Kontak ── */}
        <div className="rounded-lg border p-4 space-y-4">
          <p className="text-sm font-medium text-muted-foreground">Identifikasi Legal & Kontak</p>

          {/* WNI: NIK + BPJS */}
          {(tipePasien === 'WNI' || mode === 'edit') && (
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="nik" render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    NIK {tipePasien === 'WNI' && <span className="text-destructive">*</span>}
                    {tipePasien === 'WNI' && (
                      <Badge variant="outline" className="ml-2 text-xs">Wajib WNI</Badge>
                    )}
                  </FormLabel>
                  <FormControl>
                    <Input placeholder="16 digit" maxLength={16}
                      {...field}
                      value={field.value ?? ''}
                      onChange={e => field.onChange(e.target.value.replace(/\D/g, ''))}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="noBPJS" render={({ field }) => (
                <FormItem>
                  <FormLabel>Nomor BPJS</FormLabel>
                  <FormControl><Input placeholder="13 digit" maxLength={13} {...field} value={field.value ?? ''} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>
          )}

          {/* WNA: Paspor + Negara */}
          {tipePasien === 'WNA' && mode === 'create' && (
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="noPaspor" render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    No. Paspor <span className="text-destructive">*</span>
                    <Badge variant="outline" className="ml-2 text-xs text-purple-700 border-purple-300">
                      Wajib WNA
                    </Badge>
                  </FormLabel>
                  <FormControl>
                    <Input placeholder="Contoh: B1234567"
                      {...field}
                      value={field.value ?? ''}
                      onChange={e => field.onChange(e.target.value.toUpperCase())}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="negaraAsal" render={({ field }) => (
                <FormItem>
                  <FormLabel>Negara Asal <span className="text-destructive">*</span></FormLabel>
                  <FormControl><Input placeholder="Amerika Serikat" {...field} value={field.value ?? ''} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>
          )}

          {/* Asuransi opsional (edit mode atau WNA) */}
          {(mode === 'edit' || tipePasien === 'WNA') && (
            <FormField control={form.control} name="noAsuransi" render={({ field }) => (
              <FormItem>
                <FormLabel>No. Asuransi Swasta</FormLabel>
                <FormControl><Input placeholder="Nomor asuransi swasta" {...field} value={field.value ?? ''} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
          )}

          {/* Alamat */}
          <FormField control={form.control} name="alamat" render={({ field }) => (
            <FormItem>
              <FormLabel>Alamat Domisili <span className="text-destructive">*</span></FormLabel>
              <FormControl>
                <Textarea placeholder="Jl. Nama Jalan No. xx, Kelurahan, Kecamatan, Kota" rows={2} {...field} value={field.value ?? ''} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )} />

          <div className="grid grid-cols-2 gap-4">
            {/* Telepon */}
            <FormField control={form.control} name="telepon" render={({ field }) => (
              <FormItem>
                <FormLabel>No. HP <span className="text-destructive">*</span></FormLabel>
                <FormControl><Input placeholder="08xxxxxxxxxx" type="tel" {...field} value={field.value ?? ''} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            {/* Email */}
            <FormField control={form.control} name="email" render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl><Input placeholder="contoh@email.com" type="email" {...field} value={field.value ?? ''} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
          </div>

          {/* Alergi */}
          <FormField control={form.control} name="alergi" render={({ field }) => (
            <FormItem>
              <FormLabel>Riwayat Alergi</FormLabel>
              <FormControl>
                <Input placeholder="Penisilin, Seafood — kosongkan jika tidak ada" {...field} value={field.value ?? ''} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )} />
        </div>

        {/* ── Section 3: Kontak Darurat ── */}
        <div className="rounded-lg border p-4 space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-muted-foreground">Kontak Darurat</p>
            <Button type="button" variant="outline" size="sm"
              onClick={() => append({ nama: '', nomorHP: '', hubungan: 'LAINNYA', isPrimary: fields.length === 0 })}>
              <Plus className="h-4 w-4 mr-1" /> Tambah Kontak
            </Button>
          </div>

          {fields.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-3">
              Belum ada kontak darurat. Disarankan menambahkan minimal 1 kontak.
            </p>
          )}

          {fields.map((field, index) => {
            const isPrimary = form.watch(`kontakDarurat.${index}.isPrimary`);
            return (
              <div key={field.id}
                className={`rounded-md border p-3 space-y-3 ${isPrimary ? 'border-blue-300 bg-blue-50/30 dark:border-blue-700 dark:bg-blue-950/20' : ''}`}>
                <div className="flex items-center justify-between">
                  <span className={`text-xs font-medium ${isPrimary ? 'text-blue-700 dark:text-blue-400' : 'text-muted-foreground'}`}>
                    {isPrimary ? '★ Kontak Utama' : `Kontak ${index + 1}`}
                  </span>
                  <div className="flex gap-2">
                    {!isPrimary && (
                      <Button type="button" variant="ghost" size="sm"
                        className="h-7 text-xs" onClick={() => setPrimary(index)}>
                        <Star className="h-3 w-3 mr-1" /> Jadikan Primary
                      </Button>
                    )}
                    <Button type="button" variant="ghost" size="sm"
                      className="h-7 text-destructive hover:text-destructive"
                      onClick={() => remove(index)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <FormField control={form.control} name={`kontakDarurat.${index}.nama`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs">Nama <span className="text-destructive">*</span></FormLabel>
                        <FormControl><Input className="h-8 text-sm" placeholder="Nama lengkap" {...field} /></FormControl>
                        <FormMessage className="text-xs" />
                      </FormItem>
                    )} />

                  <FormField control={form.control} name={`kontakDarurat.${index}.hubungan`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs">Hubungan <span className="text-destructive">*</span></FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger className="h-8 text-sm">
                              <SelectValue placeholder="— Pilih —" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {HUBUNGAN_OPTIONS.map(o => (
                              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage className="text-xs" />
                      </FormItem>
                    )} />

                  <FormField control={form.control} name={`kontakDarurat.${index}.nomorHP`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs">No. HP <span className="text-destructive">*</span></FormLabel>
                        <FormControl><Input className="h-8 text-sm" type="tel" placeholder="08xxxxxxxxxx" {...field} /></FormControl>
                        <FormMessage className="text-xs" />
                      </FormItem>
                    )} />
                </div>
              </div>
            );
          })}
        </div>

        {/* Submit */}
        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={() => router.back()}>Batal</Button>
          <Button type="submit" disabled={isPending}>
            {mode === 'edit'
              ? <><Save className="h-4 w-4 mr-2" />{isPending ? 'Menyimpan...' : 'Simpan Perubahan'}</>
              : <><UserPlus className="h-4 w-4 mr-2" />{isPending ? 'Menyimpan...' : 'Daftarkan Pasien'}</>
            }
          </Button>
        </div>

      </form>
    </Form>
  );
}
