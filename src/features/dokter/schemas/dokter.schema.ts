import { z } from 'zod';

const rNIK = /^\d{16}$/;
const rJam = /^([01]\d|2[0-3]):([0-5]\d)$/;

export const dokterProfileSchema = z.object({
  nik: z
    .string()
    .regex(rNIK, 'NIK harus tepat 16 digit angka')
    .optional()
    .or(z.literal('')),
  noSIP: z
    .string()
    .min(5, 'Nomor SIP minimal 5 karakter')
    .max(50, 'Nomor SIP terlalu panjang')
    .optional()
    .or(z.literal('')),
  tglExpiredSIP: z.coerce.date().optional().nullable(),
  spesialisasi: z
    .string()
    .max(100, 'Spesialisasi terlalu panjang')
    .optional(),
});

export const mappingPoliSchema = z.object({
  poliId: z.string().min(1, 'Poli wajib dipilih'),
});

export const sharingFeeItemSchema = z.object({
  kategori: z.enum(['TINDAKAN', 'LAB', 'RADIOLOGI', 'PERALATAN']),
  persentase: z
    .number()
    .min(0, 'Persentase minimal 0%')
    .max(100, 'Persentase maksimal 100%'),
});

export const sharingFeeSchema = z.object({
  fees: z.array(sharingFeeItemSchema).length(4, 'Harus mengisi 4 kategori sharing fee'),
});

export const jadwalPraktekSchema = z
  .object({
    dokterPoliId: z.string().min(1, 'Mapping poli wajib dipilih'),
    hari: z.enum(['SENIN', 'SELASA', 'RABU', 'KAMIS', 'JUMAT', 'SABTU', 'MINGGU']),
    jamMulai:   z.string().regex(rJam, 'Format jam tidak valid (HH:MM)'),
    jamSelesai: z.string().regex(rJam, 'Format jam tidak valid (HH:MM)'),
    kuotaPasien: z
      .number()
      .int('Kuota harus bilangan bulat')
      .min(1, 'Kuota minimal 1 pasien')
      .max(200, 'Kuota maksimal 200 pasien')
      .default(20),
    keterangan: z.string().max(200).optional(),
    isAktif: z.boolean().default(true),
  })
  .superRefine((data, ctx) => {
    if (data.jamMulai && data.jamSelesai) {
      const [hM, mM] = data.jamMulai.split(':').map(Number);
      const [hS, mS] = data.jamSelesai.split(':').map(Number);
      if (hS * 60 + mS <= hM * 60 + mM) {
        ctx.addIssue({
          code: 'custom',
          path: ['jamSelesai'],
          message: 'Jam selesai harus setelah jam mulai',
        });
      }
    }
  });

export type DokterProfileValues  = z.infer<typeof dokterProfileSchema>;
export type MappingPoliValues    = z.infer<typeof mappingPoliSchema>;
export type SharingFeeFormValues = z.infer<typeof sharingFeeSchema>;
export type JadwalPraktekValues  = z.output<typeof jadwalPraktekSchema>;
