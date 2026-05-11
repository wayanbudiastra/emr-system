import { z } from "zod";

export const createTindakanSchema = z.object({
  kode:      z.string().min(2, "Kode minimal 2 karakter"),
  nama:      z.string().min(3, "Nama minimal 3 karakter"),
  tarif:     z.number().positive("Tarif harus lebih dari 0"),
  tarifBPJS: z.number().positive().optional(),
  deskripsi: z.string().optional(),
  poliIds:   z.array(z.string()).min(1, "Pilih minimal satu Poli"),
});

export const updateTindakanSchema = z.object({
  nama:      z.string().min(3).optional(),
  tarif:     z.number().positive().optional(),
  tarifBPJS: z.number().positive().optional(),
  deskripsi: z.string().optional(),
  isActive:  z.boolean().optional(),
});

export const updateMappingSchema = z.object({
  poliIds: z.array(z.string()).min(1, "Minimal satu Poli wajib dipilih"),
});

export const createPenunjangSchema = z.object({
  kode:        z.string().min(2),
  nama:        z.string().min(3),
  kategori:    z.enum(["LAB", "RADIOLOGI"]),
  tarif:       z.number().positive(),
  tarifBPJS:   z.number().positive().optional(),
  deskripsi:   z.string().optional(),
  satuanWaktu: z.string().optional(),
});

export const updatePenunjangSchema = z.object({
  nama:        z.string().min(3).optional(),
  tarif:       z.number().positive().optional(),
  tarifBPJS:   z.number().positive().optional(),
  deskripsi:   z.string().optional(),
  satuanWaktu: z.string().optional(),
  isActive:    z.boolean().optional(),
});

export const createPeralatanSchema = z.object({
  kode:      z.string().min(2),
  nama:      z.string().min(3),
  merk:      z.string().optional(),
  nomorSeri: z.string().optional(),
  deskripsi: z.string().optional(),
});

export const updatePeralatanSchema = z.object({
  nama:              z.string().min(3).optional(),
  merk:              z.string().optional(),
  deskripsi:         z.string().optional(),
  status:            z.enum(["TERSEDIA", "DIGUNAKAN", "MAINTENANCE", "RUSAK"]).optional(),
  lokasiTerakhir:    z.string().optional(),
  tanggalKalibrasi:  z.string().optional(),
});

export const createPoliSchema = z.object({
  nama:      z.string().min(3, "Nama minimal 3 karakter"),
  kode:      z.string().min(2, "Kode minimal 2 karakter"),
  deskripsi: z.string().optional(),
  lantai:    z.string().optional(),
});

export const updatePoliSchema = createPoliSchema.partial().extend({
  isActive: z.boolean().optional(),
});

export const permintaanPenunjangSchema = z.object({
  kunjunganId: z.string(),
  items: z.array(z.object({
    itemPenunjangId: z.string(),
    jumlah:          z.number().int().positive().default(1),
    catatan:         z.string().optional(),
  })).min(1),
});

export type CreateTindakanInput  = z.infer<typeof createTindakanSchema>;
export type CreatePenunjangInput = z.infer<typeof createPenunjangSchema>;
export type CreatePeralatanInput = z.infer<typeof createPeralatanSchema>;
export type CreatePoliInput      = z.infer<typeof createPoliSchema>;
