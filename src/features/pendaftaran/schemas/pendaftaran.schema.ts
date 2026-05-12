import { z } from 'zod';

export const createAppointmentSchema = z.object({
  dokterProfileId: z.string().min(1, 'Dokter wajib dipilih'),
  jadwalPraktekId: z.string().min(1, 'Jadwal wajib dipilih'),
  tanggalPraktek:  z.coerce.date({ error: 'Tanggal tidak valid' }),
  keluhan:         z.string().max(500).optional(),
  penjamin:        z.enum(['UMUM', 'BPJS', 'ASURANSI']).default('UMUM'),

  // Pasien lama
  pasienId:        z.string().optional(),

  // Pasien baru (jika pasienId kosong)
  namaPasien:      z.string().max(100).optional(),
  nikSementara:    z.string().optional(),
  noHP:            z.string().optional(),
}).superRefine((d, ctx) => {
  if (!d.pasienId && !d.namaPasien) {
    ctx.addIssue({ code: 'custom', path: ['namaPasien'], message: 'Pilih pasien atau isi nama pasien baru' });
  }
});

export const checkinAppointmentSchema = z.object({
  kodeBooking: z.string().min(1, 'Kode booking wajib diisi'),
  pasienId:    z.string().optional(),
  penjamin:    z.enum(['UMUM', 'BPJS', 'ASURANSI']).default('UMUM'),
});

export const walkinSchema = z.object({
  pasienId:       z.string().min(1, 'Pasien wajib dipilih'),
  dokterProfileId: z.string().min(1, 'Dokter wajib dipilih'),
  jadwalPraktekId: z.string().min(1, 'Jadwal wajib dipilih'),
  poliId:          z.string().min(1, 'Poli wajib dipilih'),
  keluhan:         z.string().max(500).optional(),
  penjamin:        z.enum(['UMUM', 'BPJS', 'ASURANSI']).default('UMUM'),
});

export type CreateAppointmentValues  = z.infer<typeof createAppointmentSchema>;
export type CheckinAppointmentValues = z.infer<typeof checkinAppointmentSchema>;
export type WalkinValues             = z.infer<typeof walkinSchema>;
