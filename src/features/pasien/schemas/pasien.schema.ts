import { z } from 'zod';

const rNama    = /^[a-zA-Z\s\-'.]+$/;
const rTelepon = /^(\+62|62|0)[0-9]{8,13}$/;
const rNIK     = /^\d{16}$/;
const rPaspor  = /^[A-Za-z0-9]{5,20}$/;
const rBPJS    = /^\d{13}$/;

// ── Kontak Darurat ─────────────────────────────────────────────
export const kontakDaruratSchema = z.object({
  id:        z.string().optional(),
  nama:      z.string().min(3, 'Nama kontak minimal 3 karakter')
               .regex(rNama, 'Nama hanya huruf dan spasi'),
  nomorHP:   z.string().regex(rTelepon, 'Format nomor HP tidak valid'),
  hubungan:  z.enum([
    'SUAMI','ISTRI','AYAH','IBU','ANAK','KAKAK','ADIK',
    'KAKEK','NENEK','PAMAN','BIBI','KEPONAKAN',
    'TEMAN','REKAN_KERJA','LAINNYA',
  ] as const, { error: 'Hubungan wajib dipilih' }),
  alamat:    z.string().optional(),
  isPrimary: z.boolean().default(false),
});

// ── Pasien base object (tanpa refinements, agar bisa .partial()) ─
const pasienBaseSchema = z.object({
  nama: z
    .string({ error: 'Nama wajib diisi' })
    .min(3, 'Nama minimal 3 karakter').max(100)
    .regex(rNama, 'Nama hanya huruf, spasi, atau tanda hubung (-)'),

  tempatLahir: z
    .string({ error: 'Tempat lahir wajib diisi' })
    .min(2, 'Tempat lahir minimal 2 karakter').max(100),

  tanggalLahir: z
    .coerce.date({ error: 'Tanggal lahir wajib diisi' })
    .max(new Date(), 'Tanggal lahir tidak boleh di masa depan')
    .min(new Date('1875-01-01'), 'Tanggal lahir tidak valid'),

  jenisKelamin: z.enum(['LAKI_LAKI', 'PEREMPUAN'] as const, {
    error: 'Jenis kelamin wajib dipilih',
  }),

  tipePasien: z.enum(['WNI', 'WNA'] as const, {
    error: 'Tipe pasien wajib dipilih (WNI / WNA)',
  }),

  nik:        z.string().optional(),
  noPaspor:   z.string().optional(),
  negaraAsal: z.string().optional(),

  alamat: z
    .string({ error: 'Alamat wajib diisi' })
    .min(10, 'Alamat minimal 10 karakter').max(500),

  telepon: z
    .string({ error: 'No. HP wajib diisi' })
    .regex(rTelepon, 'Format: 08xxxxxxxx atau +628xxxxxxxx'),

  email:         z.string().email('Format email tidak valid').optional()
                  .or(z.literal('')),
  golonganDarah: z.enum(['A','B','AB','O','TIDAK_DIKETAHUI'] as const).optional(),
  alergi:        z.string().max(1000).optional(),
  noBPJS:        z.string().regex(rBPJS, 'Nomor BPJS harus 13 digit')
                  .optional().or(z.literal('')),
  noAsuransi:    z.string().optional(),
  kontakDarurat: z.array(kontakDaruratSchema).optional().default([]),
});

// ── Shared refinement helpers ───────────────────────────────────
function refineKontak(
  data: { telepon?: string; kontakDarurat?: { nomorHP?: string; isPrimary?: boolean }[] },
  ctx: z.RefinementCtx,
) {
  data.kontakDarurat?.forEach((k, i) => {
    if (k.nomorHP && data.telepon && k.nomorHP === data.telepon) {
      ctx.addIssue({ code: 'custom',
        path: ['kontakDarurat', i, 'nomorHP'],
        message: 'Nomor HP kontak tidak boleh sama dengan nomor HP pasien',
      });
    }
  });
  const primaries = data.kontakDarurat?.filter(k => k.isPrimary) ?? [];
  if (primaries.length > 1) {
    ctx.addIssue({ code: 'custom', path: ['kontakDarurat'],
      message: 'Hanya boleh satu kontak utama (primary)' });
  }
}

// ── createPasienSchema: base + semua validasi kondisional ───────
export const createPasienSchema = pasienBaseSchema.superRefine((data, ctx) => {
  if (data.tipePasien === 'WNI') {
    if (!data.nik) {
      ctx.addIssue({ code: 'custom', path: ['nik'],
        message: 'NIK wajib diisi untuk pasien WNI' });
    } else if (!rNIK.test(data.nik)) {
      ctx.addIssue({ code: 'custom', path: ['nik'],
        message: 'NIK harus tepat 16 digit angka' });
    }
  }

  if (data.tipePasien === 'WNA') {
    if (!data.noPaspor) {
      ctx.addIssue({ code: 'custom', path: ['noPaspor'],
        message: 'Nomor paspor wajib untuk pasien WNA' });
    } else if (!rPaspor.test(data.noPaspor)) {
      ctx.addIssue({ code: 'custom', path: ['noPaspor'],
        message: 'Format paspor tidak valid (5–20 karakter alfanumerik)' });
    }
    if (!data.negaraAsal) {
      ctx.addIssue({ code: 'custom', path: ['negaraAsal'],
        message: 'Negara asal wajib untuk pasien WNA' });
    }
  }

  refineKontak(data, ctx);
});

// ── updatePasienSchema: partial dari base, tipePasien dihilangkan
// .partial() dipanggil pada ZodObject (bukan ZodEffects) agar tidak error
export const updatePasienSchema = pasienBaseSchema
  .omit({ tipePasien: true })
  .partial()
  .superRefine(refineKontak);

export type CreatePasienDTO  = z.infer<typeof createPasienSchema>;
export type UpdatePasienDTO  = z.infer<typeof updatePasienSchema>;
export type KontakDaruratDTO = z.infer<typeof kontakDaruratSchema>;
