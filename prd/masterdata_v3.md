# masterdata_v3.md
# Master Data V3 — Data Dokter

| Info | Detail |
|:-----|:-------|
| **Versi** | 3.0.0 |
| **Status** | Final Draft |
| **Depends On** | `setup_awal.md` · `PRD_EMR_System.md` · `masterdata_v1.md v1.1.0` · `masterdata_v2.md` · `setup_pasien.md v1.1.0` |
| **Tech Stack** | Next.js App Router · Prisma · PostgreSQL (Neon.tech) · shadcn/ui · React Hook Form · Zod · TanStack Query · Tailwind CSS · TypeScript · Lucide React |
| **Scope** | Manajemen profil dokter, mapping poli, sharing fee, dan jadwal praktek |

---

## Daftar Isi

1. [Konteks & Posisi dalam Project](#1-konteks--posisi-dalam-project)
2. [Modul yang Dicakup](#2-modul-yang-dicakup)
3. [Business Rules](#3-business-rules)
4. [Prisma Schema — Addendum](#4-prisma-schema--addendum)
5. [Zod Validation Schema](#5-zod-validation-schema)
6. [Repository Layer](#6-repository-layer)
7. [Service Layer](#7-service-layer)
8. [API Endpoints — Route Handlers](#8-api-endpoints--route-handlers)
9. [Komponen UI — shadcn/ui + Lucide React](#9-komponen-ui--shadcnui--lucide-react)
10. [Form — React Hook Form + Zod](#10-form--react-hook-form--zod)
11. [Data Fetching — TanStack Query](#11-data-fetching--tanstack-query)
12. [Hak Akses — RBAC](#12-hak-akses--rbac)
13. [Struktur Folder](#13-struktur-folder)
14. [Navigasi Menu — Posisi Link](#14-navigasi-menu--posisi-link)
15. [User Stories & Business Rules](#15-user-stories--business-rules)
16. [Seed Data Awal](#16-seed-data-awal)

---

## 1. Konteks & Posisi dalam Project

### Rantai Dokumen

```
setup_awal.md
│  Next.js App Router · Prisma · Neon.tech · shadcn/ui
│  React Hook Form · Zod · TanStack Query · Lucide React
│
├── PRD_EMR_System.md      → Model Dokter dasar (sip String?, jadwalPraktek Json?)
├── masterdata_v1.md       → User management · RBAC · Role DOKTER
├── masterdata_v2.md       → Poli · Tindakan (lokal) · Lab/Rad/Peralatan (global)
├── setup_pasien.md        → Model Pasien, NoRM auto-generate, Kontak Darurat
└── masterdata_v3.md (ini) → Data Dokter:
                              - Profil klinis (NIK, SIP, Expired SIP)
                              - Mapping Dokter ↔ Poli (many-to-many)
                              - Sharing Fee per kategori (%)
                              - Jadwal Praktek per poli per hari
```

### Gap yang Diselesaikan V3

Model `Dokter` di `PRD_EMR_System.md` sudah ada tetapi sangat minimal:

| Field / Fitur | PRD_EMR (lama) | masterdata_v3 |
|---|---|---|
| `nik` | `nip String?` — tidak terstruktur | ✅ NIK 16 digit, unik, tervalidasi |
| `sip` | `String?` — teks bebas | ✅ Nomor SIP terstruktur |
| `tglExpiredSIP` | ❌ Belum ada | ✅ Mandatori, alert 30 hari sebelum expired |
| `spesialisasi` | `String?` | ✅ Dipertahankan + diperkuat |
| **Mapping ke Poli** | Satu poli saja (`poliId`) | ✅ **Many-to-many** via `DokterPoli` |
| **Sharing Fee** | ❌ Belum ada | ✅ Model baru, per kategori (%) |
| **Jadwal Praktek** | `jadwalPraktek Json?` — tidak terstruktur | ✅ Model relasional `JadwalPraktek` |
| Sumber data user | Manual input | ✅ **Auto-link dari User dengan role DOKTER** |

---

## 2. Modul yang Dicakup

| # | Modul | Deskripsi |
|---|-------|-----------|
| 1 | **Profil Dokter** | NIK, No. SIP, Tgl Expired SIP, Spesialisasi — diambil dari User role DOKTER |
| 2 | **Mapping Poli** | Satu dokter bisa dipetakan ke banyak poli (many-to-many) |
| 3 | **Sharing Fee** | Kesepakatan persentase fee per kategori: Tindakan, Lab, Radiologi, Peralatan |
| 4 | **Jadwal Praktek** | Jadwal per poli per hari, dengan slot jam mulai dan jam selesai |

---

## 3. Business Rules

### 3.1 Profil Dokter — Relasi ke User

```
User (role = DOKTER)
    ↓
Saat user DOKTER dibuat (masterdata_v1.md) → DokterProfile dibuat otomatis
Jika belum ada → Super Admin/Admin bisa setup dari halaman "Data Dokter"

Aturan:
  ✓ Satu User DOKTER tepat satu DokterProfile (1-to-1)
  ✓ Nama, email, telepon diambil dari User — tidak diinput ulang
  ✓ NIK, SIP, Expired SIP, Spesialisasi diinput di DokterProfile
  ✗ NIK dokter = unik di tabel DokterProfile (beda dengan NIK pasien)
  ✗ Nomor SIP = unik
```

### 3.2 SIP — Alert Expired

```
SIP expired ≤ 30 hari → Badge "Segera Expired" (kuning)
SIP sudah expired      → Badge "SIP Expired" (merah) + dokter tidak bisa terima kunjungan baru
SIP masih berlaku      → Badge "Aktif" (hijau)

Sistem menolak pembuatan kunjungan baru jika SIP dokter sudah expired.
```

### 3.3 Mapping Dokter ↔ Poli

```
Satu dokter WAJIB memiliki minimal 1 mapping poli.
Satu dokter bisa mapping ke banyak poli (many-to-many via DokterPoli).
Satu poli bisa memiliki banyak dokter.

Aturan:
  ✓ Dokter wajib mapping ke ≥ 1 poli sebelum bisa menerima kunjungan
  ✓ Admin bisa tambah / hapus mapping kapan saja
  ✓ Jika mapping dihapus, kunjungan existing tidak terpengaruh
  ✓ Jadwal Praktek hanya bisa dibuat untuk poli yang sudah di-mapping
  ✗ Dokter tanpa mapping poli tidak muncul di dropdown form pendaftaran pasien
```

### 3.4 Sharing Fee

```
Setiap dokter memiliki kesepakatan sharing fee yang bersifat individual.
Sharing fee dihitung sebagai PERSENTASE (%) dari total tarif item.

4 kategori sharing fee (sesuai KategoriItem dari masterdata_v2.md):
  ├── TINDAKAN   : 0–100% (default 0%)
  ├── LAB        : 0–100% (default 0%)
  ├── RADIOLOGI  : 0–100% (default 0%)
  └── PERALATAN  : 0–100% (default 0%)

Aturan:
  ✓ Setiap kategori bisa memiliki persentase berbeda
  ✓ Persentase 0% = tidak ada sharing fee untuk kategori tersebut
  ✓ Max 100% per kategori
  ✓ Fee dihitung saat billing: fee = tarif_item × (persen / 100)
  ✗ Total sharing fee tidak boleh melebihi 100% per kategori
  ✗ Sharing fee berlaku per dokter — bukan per tindakan spesifik
```

### 3.5 Jadwal Praktek

```
Jadwal Praktek TERIKAT pada kombinasi Dokter + Poli.
Satu dokter bisa punya jadwal berbeda di poli yang berbeda.

Model:
  DokterPoli (dokter + poli) → JadwalPraktek (hari + jam_mulai + jam_selesai + kuota)

Aturan:
  ✓ Jadwal hanya bisa dibuat untuk mapping DokterPoli yang sudah ada
  ✓ Satu DokterPoli bisa punya banyak jadwal (beda hari)
  ✓ Satu hari bisa punya ≥ 1 slot jadwal (pagi & sore)
  ✗ Tidak boleh ada jadwal tumpang tindih (overlap jam) pada DokterPoli yang sama di hari yang sama
  ✓ kuotaPasien = max pasien per sesi (default 20)
  ✓ isAktif = bisa di-toggle tanpa hapus jadwal
```

---

## 4. Prisma Schema — Addendum

> Semua model berikut adalah **addendum** ke `prisma/schema.prisma`. Menggantikan model `Dokter` lama dari `PRD_EMR_System.md`.

```prisma
// ─────────────────────────────────────────────────────────
// ENUM TAMBAHAN
// ─────────────────────────────────────────────────────────

enum HariKerja {
  SENIN
  SELASA
  RABU
  KAMIS
  JUMAT
  SABTU
  MINGGU
}

// ─────────────────────────────────────────────────────────
// MODEL DOKTER PROFILE
// Menggantikan model Dokter dari PRD_EMR_System.md
// ─────────────────────────────────────────────────────────

model DokterProfile {
  id             String    @id @default(cuid())
  userId         String    @unique

  // Data klinis — dari User role DOKTER
  nik            String?   @unique    // NIK 16 digit dokter
  noSIP          String?   @unique    // Nomor Surat Izin Praktik
  tglExpiredSIP  DateTime?            // Tanggal expired SIP
  spesialisasi   String?              // Umum / Penyakit Dalam / Mata / dll

  // Status
  isActive       Boolean   @default(true)

  createdAt      DateTime  @default(now())
  updatedAt      DateTime  @updatedAt

  // Relasi ke User (existing — dari masterdata_v1.md)
  user           User      @relation(fields: [userId], references: [id], onDelete: Cascade)

  // Relasi baru (v3)
  poliMapping    DokterPoli[]
  sharingFee     SharingFee[]

  // Relasi existing ke Kunjungan dan Resep
  kunjungan      Kunjungan[]
  resep          Resep[]

  @@map("dokter_profile")
}

// ─────────────────────────────────────────────────────────
// MODEL MAPPING DOKTER ↔ POLI (many-to-many)
// ─────────────────────────────────────────────────────────

model DokterPoli {
  id              String    @id @default(cuid())
  dokterProfileId String
  poliId          String
  isAktif         Boolean   @default(true)
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt

  dokterProfile   DokterProfile @relation(fields: [dokterProfileId], references: [id], onDelete: Cascade)
  poli            Poli          @relation(fields: [poliId],          references: [id], onDelete: Cascade)

  // Relasi ke jadwal praktek
  jadwalPraktek   JadwalPraktek[]

  @@unique([dokterProfileId, poliId])   // Satu dokter, satu poli, satu kali mapping
  @@map("dokter_poli")
}

// ─────────────────────────────────────────────────────────
// MODEL JADWAL PRAKTEK
// Terikat pada kombinasi DokterPoli
// ─────────────────────────────────────────────────────────

model JadwalPraktek {
  id           String    @id @default(cuid())
  dokterPoliId String
  hari         HariKerja
  jamMulai     String    // Format "HH:MM", contoh: "08:00"
  jamSelesai   String    // Format "HH:MM", contoh: "12:00"
  kuotaPasien  Int       @default(20)
  isAktif      Boolean   @default(true)
  keterangan   String?   // Opsional: "Khusus BPJS", "Konsultasi Umum", dll

  createdAt    DateTime  @default(now())
  updatedAt    DateTime  @updatedAt

  dokterPoli   DokterPoli @relation(fields: [dokterPoliId], references: [id], onDelete: Cascade)

  @@map("jadwal_praktek")
}

// ─────────────────────────────────────────────────────────
// MODEL SHARING FEE
// Satu record per dokter per kategori
// ─────────────────────────────────────────────────────────

model SharingFee {
  id              String       @id @default(cuid())
  dokterProfileId String
  kategori        KategoriItem // TINDAKAN | LAB | RADIOLOGI | PERALATAN (dari masterdata_v2)
  persentase      Float        // 0.00 – 100.00

  createdAt       DateTime     @default(now())
  updatedAt       DateTime     @updatedAt

  dokterProfile   DokterProfile @relation(fields: [dokterProfileId], references: [id], onDelete: Cascade)

  @@unique([dokterProfileId, kategori])  // Satu dokter, satu kategori, satu record
  @@map("sharing_fee")
}

// ─────────────────────────────────────────────────────────
// EXTEND MODEL Poli (tambah relasi DokterPoli)
// Tambahkan baris ini ke model Poli yang sudah ada di masterdata_v2
// ─────────────────────────────────────────────────────────

// model Poli {
//   ... field existing ...
//   dokterMapping   DokterPoli[]   // ← tambahkan baris ini
// }
```

### Perintah Migrasi

```bash
# Setelah update schema.prisma:
npx prisma migrate dev --name add_dokter_v3

npx prisma generate
```

---

## 5. Zod Validation Schema

```typescript
// src/features/dokter/schemas/dokter.schema.ts

import { z } from 'zod';

// ── Helper ─────────────────────────────────────────────────
const rNIK  = /^\d{16}$/;
const rJam  = /^([01]\d|2[0-3]):([0-5]\d)$/;  // HH:MM

// ── Profil Dokter ──────────────────────────────────────────
export const dokterProfileSchema = z.object({
  nik: z
    .string()
    .regex(rNIK, 'NIK harus tepat 16 digit angka')
    .optional()
    .or(z.literal('')),

  noSIP: z
    .string()
    .min(5,  'Nomor SIP minimal 5 karakter')
    .max(50, 'Nomor SIP terlalu panjang')
    .optional()
    .or(z.literal('')),

  tglExpiredSIP: z
    .coerce.date()
    .min(new Date(), 'Tanggal expired SIP tidak boleh di masa lalu')
    .optional()
    .nullable(),

  spesialisasi: z
    .string()
    .max(100, 'Spesialisasi terlalu panjang')
    .optional(),
});

// ── Mapping Poli ───────────────────────────────────────────
export const mappingPoliSchema = z.object({
  poliIds: z
    .array(z.string().min(1))
    .min(1, 'Minimal satu poli wajib dipilih'),
});

// ── Sharing Fee ────────────────────────────────────────────
export const sharingFeeItemSchema = z.object({
  kategori: z.enum(['TINDAKAN', 'LAB', 'RADIOLOGI', 'PERALATAN'], {
    required_error: 'Kategori wajib dipilih',
  }),
  persentase: z
    .number({ required_error: 'Persentase wajib diisi' })
    .min(0,   'Persentase minimal 0%')
    .max(100, 'Persentase maksimal 100%'),
});

export const sharingFeeSchema = z.object({
  fees: z.array(sharingFeeItemSchema).length(4, 'Harus mengisi 4 kategori sharing fee'),
});

export type SharingFeeFormValues = z.infer<typeof sharingFeeSchema>;

// ── Jadwal Praktek ─────────────────────────────────────────
export const jadwalPraktekSchema = z
  .object({
    dokterPoliId: z.string().min(1, 'Mapping poli wajib dipilih'),
    hari: z.enum([
      'SENIN','SELASA','RABU','KAMIS','JUMAT','SABTU','MINGGU',
    ], { required_error: 'Hari wajib dipilih' }),
    jamMulai:    z.string().regex(rJam, 'Format jam tidak valid (HH:MM)'),
    jamSelesai:  z.string().regex(rJam, 'Format jam tidak valid (HH:MM)'),
    kuotaPasien: z
      .number()
      .int('Kuota harus bilangan bulat')
      .min(1,   'Kuota minimal 1 pasien')
      .max(200, 'Kuota maksimal 200 pasien')
      .default(20),
    keterangan: z.string().max(200).optional(),
    isAktif:    z.boolean().default(true),
  })
  .superRefine((data, ctx) => {
    // Validasi jam selesai harus setelah jam mulai
    if (data.jamMulai && data.jamSelesai) {
      const [hM, mM] = data.jamMulai.split(':').map(Number);
      const [hS, mS] = data.jamSelesai.split(':').map(Number);
      const menit_mulai   = hM * 60 + mM;
      const menit_selesai = hS * 60 + mS;
      if (menit_selesai <= menit_mulai) {
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
export type JadwalPraktekValues  = z.infer<typeof jadwalPraktekSchema>;
```

---

## 6. Repository Layer

```typescript
// src/repositories/dokter.repository.ts

import { prisma } from '@/lib/prisma';
import type {
  DokterProfileValues,
  JadwalPraktekValues,
} from '@/features/dokter/schemas/dokter.schema';

export const dokterRepository = {

  // ── List semua dokter (dari User role = DOKTER) ─────────
  async findAll(params?: {
    search?: string; isActive?: boolean;
    page?: number;  limit?: number;
  }) {
    const { search, isActive, page = 1, limit = 20 } = params ?? {};

    const where = {
      user: {
        role:   'DOKTER' as const,
        ...(isActive !== undefined ? { isActive } : {}),
        ...(search ? {
          OR: [
            { nama:  { contains: search, mode: 'insensitive' as const } },
            { email: { contains: search, mode: 'insensitive' as const } },
          ],
        } : {}),
      },
    };

    const [data, total] = await Promise.all([
      prisma.dokterProfile.findMany({
        where,
        include: {
          user: {
            select: { id: true, nama: true, email: true, telepon: true, isActive: true },
          },
          poliMapping: {
            where:   { isAktif: true },
            include: { poli: { select: { id: true, nama: true, kode: true } } },
          },
          sharingFee: true,
        },
        orderBy: { user: { nama: 'asc' } },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.dokterProfile.count({ where }),
    ]);

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  },

  // ── Detail satu dokter (lengkap dengan jadwal) ──────────
  async findById(id: string) {
    return prisma.dokterProfile.findUnique({
      where: { id },
      include: {
        user: {
          select: { id: true, nama: true, email: true, telepon: true, nip: true, isActive: true },
        },
        poliMapping: {
          include: {
            poli:          { select: { id: true, nama: true, kode: true, lantai: true } },
            jadwalPraktek: { orderBy: [{ hari: 'asc' }, { jamMulai: 'asc' }] },
          },
          orderBy: { createdAt: 'asc' },
        },
        sharingFee: {
          orderBy: { kategori: 'asc' },
        },
      },
    });
  },

  // ── Cari DokterProfile by userId ─────────────────────────
  async findByUserId(userId: string) {
    return prisma.dokterProfile.findUnique({
      where: { userId },
      include: {
        user:       { select: { nama: true, email: true } },
        poliMapping:{ include: { poli: true } },
        sharingFee: true,
      },
    });
  },

  // ── Semua User role DOKTER yang belum punya DokterProfile ─
  async findUsersWithoutProfile() {
    return prisma.user.findMany({
      where: {
        role:          'DOKTER',
        isActive:      true,
        dokterProfile: null,
      },
      select: { id: true, nama: true, email: true, nip: true },
      orderBy: { nama: 'asc' },
    });
  },

  // ── Update profil klinis ─────────────────────────────────
  async upsertProfile(userId: string, data: DokterProfileValues) {
    return prisma.dokterProfile.upsert({
      where:  { userId },
      create: { userId, ...data, nik: data.nik || null, noSIP: data.noSIP || null },
      update: {          ...data, nik: data.nik || null, noSIP: data.noSIP || null },
    });
  },

  // ── Mapping Poli ─────────────────────────────────────────
  async getMappingByDokter(dokterProfileId: string) {
    return prisma.dokterPoli.findMany({
      where:   { dokterProfileId },
      include: {
        poli:          { select: { id: true, nama: true, kode: true } },
        jadwalPraktek: { orderBy: [{ hari: 'asc' }, { jamMulai: 'asc' }] },
      },
      orderBy: { createdAt: 'asc' },
    });
  },

  async addPoliMapping(dokterProfileId: string, poliId: string) {
    return prisma.dokterPoli.upsert({
      where:  { dokterProfileId_poliId: { dokterProfileId, poliId } },
      create: { dokterProfileId, poliId },
      update: { isAktif: true },
    });
  },

  async removePoliMapping(dokterProfileId: string, poliId: string) {
    return prisma.dokterPoli.update({
      where: { dokterProfileId_poliId: { dokterProfileId, poliId } },
      data:  { isAktif: false },
    });
  },

  // ── Sharing Fee ──────────────────────────────────────────
  async getSharingFee(dokterProfileId: string) {
    return prisma.sharingFee.findMany({
      where:   { dokterProfileId },
      orderBy: { kategori: 'asc' },
    });
  },

  async upsertSharingFee(
    dokterProfileId: string,
    fees: Array<{ kategori: string; persentase: number }>
  ) {
    return prisma.$transaction(
      fees.map(f =>
        prisma.sharingFee.upsert({
          where: {
            dokterProfileId_kategori: {
              dokterProfileId,
              kategori: f.kategori as any,
            },
          },
          create: { dokterProfileId, kategori: f.kategori as any, persentase: f.persentase },
          update: { persentase: f.persentase },
        })
      )
    );
  },

  // ── Jadwal Praktek ───────────────────────────────────────
  async getJadwalByDokterPoli(dokterPoliId: string) {
    return prisma.jadwalPraktek.findMany({
      where:   { dokterPoliId },
      orderBy: [{ hari: 'asc' }, { jamMulai: 'asc' }],
    });
  },

  async createJadwal(data: JadwalPraktekValues) {
    return prisma.jadwalPraktek.create({ data });
  },

  async updateJadwal(id: string, data: Partial<JadwalPraktekValues>) {
    return prisma.jadwalPraktek.update({ where: { id }, data });
  },

  async toggleJadwal(id: string, isAktif: boolean) {
    return prisma.jadwalPraktek.update({ where: { id }, data: { isAktif } });
  },

  async deleteJadwal(id: string) {
    return prisma.jadwalPraktek.delete({ where: { id } });
  },

  // ── Cek overlap jadwal ───────────────────────────────────
  async checkJadwalOverlap(params: {
    dokterPoliId: string;
    hari:         string;
    jamMulai:     string;
    jamSelesai:   string;
    excludeId?:   string;
  }) {
    const jadwal = await prisma.jadwalPraktek.findMany({
      where: {
        dokterPoliId: params.dokterPoliId,
        hari:         params.hari as any,
        isAktif:      true,
        ...(params.excludeId ? { id: { not: params.excludeId } } : {}),
      },
    });

    const [hM, mM] = params.jamMulai.split(':').map(Number);
    const [hS, mS] = params.jamSelesai.split(':').map(Number);
    const newMulai   = hM * 60 + mM;
    const newSelesai = hS * 60 + mS;

    return jadwal.some(j => {
      const [ehM, emM] = j.jamMulai.split(':').map(Number);
      const [ehS, emS] = j.jamSelesai.split(':').map(Number);
      const existMulai   = ehM * 60 + emM;
      const existSelesai = ehS * 60 + emS;
      return newMulai < existSelesai && newSelesai > existMulai;
    });
  },
};
```

---

## 7. Service Layer

```typescript
// src/services/dokter.service.ts

import { dokterRepository } from '@/repositories/dokter.repository';
import type {
  DokterProfileValues,
  JadwalPraktekValues,
} from '@/features/dokter/schemas/dokter.schema';

// ── Helper: status SIP ─────────────────────────────────────
export function getSIPStatus(tglExpired: Date | null | undefined): {
  status: 'AKTIF' | 'SEGERA_EXPIRED' | 'EXPIRED' | 'TIDAK_ADA';
  sisaHari?: number;
} {
  if (!tglExpired) return { status: 'TIDAK_ADA' };

  const now      = new Date();
  const expired  = new Date(tglExpired);
  const selisih  = Math.ceil((expired.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  if (selisih < 0)  return { status: 'EXPIRED',        sisaHari: selisih };
  if (selisih <= 30) return { status: 'SEGERA_EXPIRED', sisaHari: selisih };
  return               { status: 'AKTIF',              sisaHari: selisih };
}

export const dokterService = {

  async getAll(params?: Parameters<typeof dokterRepository.findAll>[0]) {
    const result = await dokterRepository.findAll(params);
    return {
      ...result,
      data: result.data.map(d => ({
        ...d,
        sipStatus: getSIPStatus(d.tglExpiredSIP),
      })),
    };
  },

  async getById(id: string) {
    const dokter = await dokterRepository.findById(id);
    if (!dokter) throw new Error('Data dokter tidak ditemukan');
    return { ...dokter, sipStatus: getSIPStatus(dokter.tglExpiredSIP) };
  },

  async getByUserId(userId: string) {
    const dokter = await dokterRepository.findByUserId(userId);
    if (!dokter) throw new Error('Profil dokter tidak ditemukan');
    return { ...dokter, sipStatus: getSIPStatus(dokter.tglExpiredSIP) };
  },

  async getUsersWithoutProfile() {
    return dokterRepository.findUsersWithoutProfile();
  },

  // ── Profil ────────────────────────────────────────────────
  async saveProfile(userId: string, data: DokterProfileValues) {
    // Cek duplikat NIK
    if (data.nik) {
      const existing = await dokterRepository.findByUserId(userId);
      const dup = await dokterRepository.findAll({ search: data.nik });
      const nikDup = dup.data.find(d => d.nik === data.nik && d.userId !== userId);
      if (nikDup) {
        throw new Error(`NIK sudah digunakan dokter lain: ${nikDup.user.nama}`);
      }
    }

    // Cek duplikat SIP
    if (data.noSIP) {
      const allDokter = await dokterRepository.findAll({});
      const sipDup = allDokter.data.find(d => d.noSIP === data.noSIP && d.userId !== userId);
      if (sipDup) {
        throw new Error(`Nomor SIP sudah digunakan dokter lain: ${sipDup.user.nama}`);
      }
    }

    return dokterRepository.upsertProfile(userId, data);
  },

  // ── Mapping Poli ──────────────────────────────────────────
  async addPoliMapping(dokterProfileId: string, poliId: string) {
    return dokterRepository.addPoliMapping(dokterProfileId, poliId);
  },

  async removePoliMapping(dokterProfileId: string, poliId: string) {
    // Cek apakah ada jadwal aktif di mapping ini — jika ya, tolak
    const mapping = await dokterRepository.getMappingByDokter(dokterProfileId);
    const targetMapping = mapping.find(m => m.poliId === poliId);

    if (targetMapping) {
      const jadwalAktif = targetMapping.jadwalPraktek.filter(j => j.isAktif);
      if (jadwalAktif.length > 0) {
        throw new Error(
          `Tidak bisa hapus mapping — masih ada ${jadwalAktif.length} jadwal aktif di poli ini. ` +
          `Nonaktifkan jadwal terlebih dahulu.`
        );
      }
    }

    return dokterRepository.removePoliMapping(dokterProfileId, poliId);
  },

  // ── Sharing Fee ───────────────────────────────────────────
  async saveSharingFee(
    dokterProfileId: string,
    fees: Array<{ kategori: string; persentase: number }>
  ) {
    // Validasi semua persentase 0–100
    for (const f of fees) {
      if (f.persentase < 0 || f.persentase > 100) {
        throw new Error(`Persentase kategori ${f.kategori} harus antara 0 dan 100`);
      }
    }
    return dokterRepository.upsertSharingFee(dokterProfileId, fees);
  },

  // ── Jadwal Praktek ────────────────────────────────────────
  async createJadwal(data: JadwalPraktekValues) {
    // Cek overlap jadwal
    const overlap = await dokterRepository.checkJadwalOverlap({
      dokterPoliId: data.dokterPoliId,
      hari:         data.hari,
      jamMulai:     data.jamMulai,
      jamSelesai:   data.jamSelesai,
    });

    if (overlap) {
      throw new Error(
        `Jadwal pada hari ${data.hari} pukul ${data.jamMulai}–${data.jamSelesai} ` +
        `tumpang tindih dengan jadwal yang sudah ada.`
      );
    }

    return dokterRepository.createJadwal(data);
  },

  async updateJadwal(id: string, data: Partial<JadwalPraktekValues>) {
    if (data.jamMulai || data.jamSelesai || data.hari || data.dokterPoliId) {
      const existing = await dokterRepository.getJadwalByDokterPoli(data.dokterPoliId ?? '');
      const currentJadwal = existing.find(j => j.id === id);
      if (currentJadwal) {
        const overlap = await dokterRepository.checkJadwalOverlap({
          dokterPoliId: currentJadwal.dokterPoliId,
          hari:         (data.hari ?? currentJadwal.hari) as string,
          jamMulai:     data.jamMulai    ?? currentJadwal.jamMulai,
          jamSelesai:   data.jamSelesai  ?? currentJadwal.jamSelesai,
          excludeId:    id,
        });
        if (overlap) throw new Error('Jadwal bertabrakan dengan jadwal lain di hari yang sama.');
      }
    }
    return dokterRepository.updateJadwal(id, data);
  },

  async toggleJadwal(id: string, isAktif: boolean) {
    return dokterRepository.toggleJadwal(id, isAktif);
  },

  async deleteJadwal(id: string) {
    return dokterRepository.deleteJadwal(id);
  },

  // ── Kalkulasi sharing fee untuk billing ──────────────────
  async hitungSharingFee(params: {
    dokterProfileId: string;
    items: Array<{ kategori: string; totalTarif: number }>;
  }) {
    const fees = await dokterRepository.getSharingFee(params.dokterProfileId);
    const feeMap = Object.fromEntries(fees.map(f => [f.kategori, f.persentase]));

    return params.items.map(item => ({
      kategori:    item.kategori,
      totalTarif:  item.totalTarif,
      persentase:  feeMap[item.kategori] ?? 0,
      nominalFee:  item.totalTarif * ((feeMap[item.kategori] ?? 0) / 100),
    }));
  },
};
```

---

## 8. API Endpoints — Route Handlers

| Method | Endpoint | Deskripsi | Role |
|--------|----------|-----------|------|
| `GET` | `/api/dokter` | List dokter + filter + paginate | `SUPER_ADMIN` `ADMISSION` `KASIR` |
| `GET` | `/api/dokter/[id]` | Detail dokter + mapping + jadwal + fee | `SUPER_ADMIN` |
| `GET` | `/api/dokter/tanpa-profil` | User DOKTER belum punya profil klinis | `SUPER_ADMIN` |
| `PUT` | `/api/dokter/[id]/profil` | Update NIK, SIP, Expired SIP, Spesialisasi | `SUPER_ADMIN` |
| `GET` | `/api/dokter/[id]/mapping-poli` | List poli yang di-mapping | `SUPER_ADMIN` |
| `POST` | `/api/dokter/[id]/mapping-poli` | Tambah mapping poli | `SUPER_ADMIN` |
| `DELETE` | `/api/dokter/[id]/mapping-poli/[poliId]` | Hapus mapping poli | `SUPER_ADMIN` |
| `GET` | `/api/dokter/[id]/sharing-fee` | Get sharing fee semua kategori | `SUPER_ADMIN` `KASIR` |
| `PUT` | `/api/dokter/[id]/sharing-fee` | Update semua sharing fee sekaligus | `SUPER_ADMIN` |
| `GET` | `/api/dokter/[id]/jadwal` | List jadwal praktek per poli | `SUPER_ADMIN` `ADMISSION` |
| `POST` | `/api/dokter/[id]/jadwal` | Tambah jadwal praktek | `SUPER_ADMIN` |
| `PUT` | `/api/dokter/[id]/jadwal/[jid]` | Update jadwal | `SUPER_ADMIN` |
| `PATCH` | `/api/dokter/[id]/jadwal/[jid]/toggle` | Aktifkan / nonaktifkan jadwal | `SUPER_ADMIN` |
| `DELETE` | `/api/dokter/[id]/jadwal/[jid]` | Hapus jadwal | `SUPER_ADMIN` |
| `POST` | `/api/dokter/[id]/sharing-fee/hitung` | Kalkulasi fee untuk billing | `SUPER_ADMIN` `KASIR` |

### Contoh Route Handler — GET /api/dokter

```typescript
// src/app/api/dokter/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { dokterService } from '@/services/dokter.service';

const CAN_READ = ['SUPER_ADMIN', 'ADMISSION', 'KASIR', 'DOKTER'];

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user)                         return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!CAN_READ.includes(session.user.role))  return NextResponse.json({ error: 'Forbidden' },   { status: 403 });

  const sp = new URL(req.url).searchParams;
  const result = await dokterService.getAll({
    search:   sp.get('q')    ?? undefined,
    isActive: sp.get('aktif') !== 'false',
    page:     Number(sp.get('page')  ?? 1),
    limit:    Number(sp.get('limit') ?? 20),
  });

  return NextResponse.json(result);
}
```

```typescript
// src/app/api/dokter/[id]/sharing-fee/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { dokterService } from '@/services/dokter.service';
import { sharingFeeSchema } from '@/features/dokter/schemas/dokter.schema';

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (session?.user?.role !== 'SUPER_ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body   = await req.json();
  const parsed = sharingFeeSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validasi gagal', details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  try {
    const result = await dokterService.saveSharingFee(params.id, parsed.data.fees);
    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 422 });
  }
}
```

---

## 9. Komponen UI — shadcn/ui + Lucide React

```bash
# Komponen shadcn/ui yang dibutuhkan (tambahan dari setup_pasien.md)
npx shadcn@latest add tabs progress alert accordion
```

```typescript
// src/features/dokter/components/SIPStatusBadge.tsx

import { Badge }  from '@/components/ui/badge';
import { ShieldCheck, ShieldAlert, ShieldX, Shield } from 'lucide-react';
import { getSIPStatus } from '@/services/dokter.service';

interface Props { tglExpired?: Date | null }

export function SIPStatusBadge({ tglExpired }: Props) {
  const { status, sisaHari } = getSIPStatus(tglExpired);

  if (status === 'TIDAK_ADA') return (
    <Badge variant="outline" className="gap-1 text-muted-foreground">
      <Shield className="h-3 w-3" /> Belum diisi
    </Badge>
  );

  if (status === 'EXPIRED') return (
    <Badge className="bg-red-100 text-red-800 gap-1">
      <ShieldX className="h-3 w-3" /> SIP Expired
    </Badge>
  );

  if (status === 'SEGERA_EXPIRED') return (
    <Badge className="bg-yellow-100 text-yellow-800 gap-1">
      <ShieldAlert className="h-3 w-3" /> Expired {sisaHari} hari lagi
    </Badge>
  );

  return (
    <Badge className="bg-green-100 text-green-800 gap-1">
      <ShieldCheck className="h-3 w-3" /> Aktif ({sisaHari} hari)
    </Badge>
  );
}

// src/features/dokter/components/SharingFeeBar.tsx

import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

interface Props {
  kategori:   string;
  persentase: number;
}

const KATEGORI_COLOR: Record<string, string> = {
  TINDAKAN:  '[&>div]:bg-blue-500',
  LAB:       '[&>div]:bg-green-500',
  RADIOLOGI: '[&>div]:bg-purple-500',
  PERALATAN: '[&>div]:bg-orange-500',
};

const KATEGORI_LABEL: Record<string, string> = {
  TINDAKAN:  'Tindakan',
  LAB:       'Laboratorium',
  RADIOLOGI: 'Radiologi',
  PERALATAN: 'Peralatan',
};

export function SharingFeeBar({ kategori, persentase }: Props) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-muted-foreground">{KATEGORI_LABEL[kategori] ?? kategori}</span>
        <span className="font-medium tabular-nums">{persentase}%</span>
      </div>
      <Progress
        value={persentase}
        className={cn('h-2', KATEGORI_COLOR[kategori])}
      />
    </div>
  );
}
```

---

## 10. Form — React Hook Form + Zod

### Form Profil Dokter

```tsx
// src/features/dokter/components/DokterProfilForm.tsx
'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { dokterProfileSchema, type DokterProfileValues } from '../schemas/dokter.schema';
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from '@/components/ui/form';
import { Input }  from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { BadgeCheck, Stethoscope } from 'lucide-react';  // ← Lucide React
import { useSaveProfilDokter } from '../hooks/useDokter';

export function DokterProfilForm({
  userId,
  defaultValues,
}: {
  userId: string;
  defaultValues?: Partial<DokterProfileValues>;
}) {
  const { mutate: save, isPending } = useSaveProfilDokter(userId);

  const form = useForm<DokterProfileValues>({
    resolver: zodResolver(dokterProfileSchema),
    defaultValues: defaultValues ?? {},
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit((d) => save(d))} className="space-y-4">

        {/* NIK */}
        <FormField control={form.control} name="nik" render={({ field }) => (
          <FormItem>
            <FormLabel>NIK Dokter</FormLabel>
            <FormControl>
              <Input placeholder="16 digit angka" maxLength={16}
                {...field}
                onChange={e => field.onChange(e.target.value.replace(/\D/g, ''))}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )} />

        <div className="grid grid-cols-2 gap-4">
          {/* Nomor SIP */}
          <FormField control={form.control} name="noSIP" render={({ field }) => (
            <FormItem>
              <FormLabel>Nomor SIP</FormLabel>
              <FormControl>
                <Input placeholder="Contoh: 446/SIP-DU/2024" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )} />

          {/* Tanggal Expired SIP */}
          <FormField control={form.control} name="tglExpiredSIP" render={({ field }) => (
            <FormItem>
              <FormLabel>Tanggal Expired SIP</FormLabel>
              <FormControl>
                <Input type="date"
                  value={field.value instanceof Date
                    ? field.value.toISOString().split('T')[0] : field.value ?? ''}
                  onChange={e => field.onChange(e.target.value ? new Date(e.target.value) : null)}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )} />
        </div>

        {/* Spesialisasi */}
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
```

### Form Sharing Fee

```tsx
// src/features/dokter/components/SharingFeeForm.tsx
'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { sharingFeeSchema, type SharingFeeFormValues } from '../schemas/dokter.schema';
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from '@/components/ui/form';
import { Input }         from '@/components/ui/input';
import { Button }        from '@/components/ui/button';
import { SharingFeeBar } from './SharingFeeBar';
import { Percent }       from 'lucide-react';
import { useWatch }      from 'react-hook-form';
import { useSaveSharingFee } from '../hooks/useDokter';

const KATEGORI_OPTIONS = [
  { value: 'TINDAKAN',  label: 'Tindakan Medis',  desc: 'Prosedur & tindakan di poli' },
  { value: 'LAB',       label: 'Laboratorium',     desc: 'Pemeriksaan lab' },
  { value: 'RADIOLOGI', label: 'Radiologi',        desc: 'Imaging & radiologi' },
  { value: 'PERALATAN', label: 'Peralatan Medis',  desc: 'Penggunaan alat' },
] as const;

export function SharingFeeForm({
  dokterProfileId,
  defaultValues,
}: {
  dokterProfileId: string;
  defaultValues?:  SharingFeeFormValues;
}) {
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
```

### Form Jadwal Praktek

```tsx
// src/features/dokter/components/JadwalPraktekForm.tsx
'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { jadwalPraktekSchema, type JadwalPraktekValues } from '../schemas/dokter.schema';
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
  { value: 'SENIN',   label: 'Senin' },
  { value: 'SELASA',  label: 'Selasa' },
  { value: 'RABU',    label: 'Rabu' },
  { value: 'KAMIS',   label: 'Kamis' },
  { value: 'JUMAT',   label: 'Jumat' },
  { value: 'SABTU',   label: 'Sabtu' },
  { value: 'MINGGU',  label: 'Minggu' },
];

interface DokterPoliOption { id: string; poli: { nama: string; kode: string } }

export function JadwalPraktekForm({
  dokterProfileId,
  dokterPoliList,
}: {
  dokterProfileId: string;
  dokterPoliList:  DokterPoliOption[];
}) {
  const { mutate: create, isPending } = useCreateJadwal(dokterProfileId);

  const form = useForm<JadwalPraktekValues>({
    resolver: zodResolver(jadwalPraktekSchema),
    defaultValues: { kuotaPasien: 20, isAktif: true },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit((d) => create(d))} className="space-y-4">

        {/* Pilih Poli (dari mapping yang sudah ada) */}
        <FormField control={form.control} name="dokterPoliId" render={({ field }) => (
          <FormItem>
            <FormLabel>Poli <span className="text-destructive">*</span></FormLabel>
            <Select onValueChange={field.onChange} value={field.value ?? ''}>
              <FormControl><SelectTrigger><SelectValue placeholder="— Pilih Poli —" /></SelectTrigger></FormControl>
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

        {/* Hari */}
        <FormField control={form.control} name="hari" render={({ field }) => (
          <FormItem>
            <FormLabel>Hari Praktek <span className="text-destructive">*</span></FormLabel>
            <Select onValueChange={field.onChange} value={field.value ?? ''}>
              <FormControl><SelectTrigger><SelectValue placeholder="— Pilih Hari —" /></SelectTrigger></FormControl>
              <SelectContent>
                {HARI_OPTIONS.map(h => (
                  <SelectItem key={h.value} value={h.value}>{h.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )} />

        {/* Jam Mulai & Jam Selesai */}
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
                <Input type="number" min={1} max={200}
                  {...field}
                  onChange={e => field.onChange(parseInt(e.target.value) || 20)}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )} />
        </div>

        {/* Keterangan */}
        <FormField control={form.control} name="keterangan" render={({ field }) => (
          <FormItem>
            <FormLabel>Keterangan</FormLabel>
            <FormControl>
              <Input placeholder="Contoh: Khusus BPJS, Konsultasi Umum (opsional)" {...field} />
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
```

---

## 11. Data Fetching — TanStack Query

```typescript
// src/features/dokter/hooks/useDokter.ts
'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from '@/hooks/use-toast';
import type {
  DokterProfileValues,
  JadwalPraktekValues,
  SharingFeeFormValues,
} from '../schemas/dokter.schema';

// ── Query Keys ─────────────────────────────────────────────
export const dokterKeys = {
  all:    ['dokter'] as const,
  lists:  () => [...dokterKeys.all, 'list'] as const,
  list:   (p: object) => [...dokterKeys.lists(), p] as const,
  detail: (id: string) => [...dokterKeys.all, 'detail', id] as const,
  fee:    (id: string) => [...dokterKeys.all, 'fee', id] as const,
  jadwal: (id: string) => [...dokterKeys.all, 'jadwal', id] as const,
};

// ── List Dokter ────────────────────────────────────────────
export function useDokterList(params?: {
  q?: string; page?: number; limit?: number;
}) {
  return useQuery({
    queryKey: dokterKeys.list(params ?? {}),
    queryFn:  async () => {
      const sp = new URLSearchParams();
      if (params?.q)     sp.set('q',     params.q);
      if (params?.page)  sp.set('page',  String(params.page));
      if (params?.limit) sp.set('limit', String(params.limit));
      const res = await fetch(`/api/dokter?${sp}`);
      if (!res.ok) throw new Error('Gagal memuat data dokter');
      return res.json();
    },
    staleTime: 30_000,
  });
}

// ── Detail Dokter ──────────────────────────────────────────
export function useDokterDetail(id: string) {
  return useQuery({
    queryKey: dokterKeys.detail(id),
    queryFn:  async () => {
      const res = await fetch(`/api/dokter/${id}`);
      if (!res.ok) throw new Error('Dokter tidak ditemukan');
      return res.json();
    },
    enabled: !!id,
  });
}

// ── Save Profil ────────────────────────────────────────────
export function useSaveProfilDokter(userId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: DokterProfileValues) => {
      const res = await fetch(`/api/dokter/${userId}/profil`, {
        method:  'PUT',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(data),
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error ?? 'Gagal menyimpan profil'); }
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: dokterKeys.lists() });
      toast({ title: 'Profil dokter berhasil disimpan' });
    },
    onError: (e: Error) => toast({ title: 'Gagal', description: e.message, variant: 'destructive' }),
  });
}

// ── Mapping Poli ───────────────────────────────────────────
export function useAddPoliMapping(dokterProfileId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (poliId: string) => {
      const res = await fetch(`/api/dokter/${dokterProfileId}/mapping-poli`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ poliId }),
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error ?? 'Gagal mapping poli'); }
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: dokterKeys.detail(dokterProfileId) });
      toast({ title: 'Poli berhasil ditambahkan' });
    },
    onError: (e: Error) => toast({ title: 'Gagal', description: e.message, variant: 'destructive' }),
  });
}

export function useRemovePoliMapping(dokterProfileId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (poliId: string) => {
      const res = await fetch(`/api/dokter/${dokterProfileId}/mapping-poli/${poliId}`, {
        method: 'DELETE',
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error ?? 'Gagal hapus mapping'); }
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: dokterKeys.detail(dokterProfileId) });
      toast({ title: 'Mapping poli dihapus' });
    },
    onError: (e: Error) => toast({ title: 'Gagal', description: e.message, variant: 'destructive' }),
  });
}

// ── Sharing Fee ────────────────────────────────────────────
export function useSaveSharingFee(dokterProfileId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: SharingFeeFormValues) => {
      const res = await fetch(`/api/dokter/${dokterProfileId}/sharing-fee`, {
        method:  'PUT',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(data),
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error ?? 'Gagal simpan fee'); }
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: dokterKeys.fee(dokterProfileId) });
      toast({ title: 'Sharing fee berhasil disimpan' });
    },
    onError: (e: Error) => toast({ title: 'Gagal', description: e.message, variant: 'destructive' }),
  });
}

// ── Jadwal ─────────────────────────────────────────────────
export function useCreateJadwal(dokterProfileId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: JadwalPraktekValues) => {
      const res = await fetch(`/api/dokter/${dokterProfileId}/jadwal`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(data),
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error ?? 'Gagal buat jadwal'); }
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: dokterKeys.detail(dokterProfileId) });
      toast({ title: 'Jadwal praktek berhasil ditambahkan' });
    },
    onError: (e: Error) => toast({ title: 'Gagal', description: e.message, variant: 'destructive' }),
  });
}

export function useToggleJadwal(dokterProfileId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ jadwalId, isAktif }: { jadwalId: string; isAktif: boolean }) => {
      const res = await fetch(
        `/api/dokter/${dokterProfileId}/jadwal/${jadwalId}/toggle`,
        { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ isAktif }) }
      );
      if (!res.ok) throw new Error('Gagal mengubah status jadwal');
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: dokterKeys.detail(dokterProfileId) });
    },
  });
}
```

---

## 12. Hak Akses — RBAC

Tambahkan ke `rolePermissions` di `src/config/rbac.config.ts`:

```typescript
SUPER_ADMIN: {
  'dokter:profil':  ['create', 'read', 'update', 'delete'],
  'dokter:mapping': ['create', 'read', 'update', 'delete'],
  'dokter:fee':     ['create', 'read', 'update', 'delete'],
  'dokter:jadwal':  ['create', 'read', 'update', 'delete'],
},
ADMISSION: {
  'dokter:profil':  ['read'],      // Lihat daftar dokter untuk pilihan kunjungan
  'dokter:jadwal':  ['read'],      // Lihat jadwal untuk penentuan antrean
},
KASIR: {
  'dokter:profil':  ['read'],
  'dokter:fee':     ['read'],      // Baca fee untuk kalkulasi billing
},
DOKTER: {
  'dokter:profil':  ['read'],      // Lihat profil sendiri
  'dokter:jadwal':  ['read'],      // Lihat jadwal sendiri
},
```

```typescript
// Tambahkan ke src/config/route-permissions.ts

'/data-dokter':                          ['SUPER_ADMIN'],
'/data-dokter/[id]':                     ['SUPER_ADMIN'],
'/data-dokter/[id]/profil':              ['SUPER_ADMIN'],
'/data-dokter/[id]/mapping-poli':        ['SUPER_ADMIN'],
'/data-dokter/[id]/sharing-fee':         ['SUPER_ADMIN'],
'/data-dokter/[id]/jadwal':              ['SUPER_ADMIN'],
'/api/dokter':                           ['SUPER_ADMIN','ADMISSION','KASIR','DOKTER'],
'/api/dokter/*/jadwal':                  ['SUPER_ADMIN'],
'/api/dokter/*/sharing-fee':             ['SUPER_ADMIN','KASIR'],
'/api/dokter/*/mapping-poli':            ['SUPER_ADMIN'],
```

---

## 13. Struktur Folder

> Mengikuti `setup_awal.md` — `src/app`, `src/features`, `src/repositories`, `src/services`.

```
src/
├── app/
│   ├── (dashboard)/
│   │   └── data-dokter/                     # ← Modul baru
│   │       ├── page.tsx                     # List dokter
│   │       └── [id]/
│   │           ├── page.tsx                 # Detail — tab: Profil | Mapping | Fee | Jadwal
│   │           ├── profil/
│   │           │   └── page.tsx             # Form edit profil klinis
│   │           ├── mapping-poli/
│   │           │   └── page.tsx             # Kelola mapping poli
│   │           ├── sharing-fee/
│   │           │   └── page.tsx             # Setup sharing fee per kategori
│   │           └── jadwal/
│   │               └── page.tsx             # Kelola jadwal praktek
│   │
│   └── api/
│       └── dokter/
│           ├── route.ts                     # GET list
│           ├── tanpa-profil/
│           │   └── route.ts                 # GET user DOKTER tanpa profil
│           └── [id]/
│               ├── route.ts                 # GET detail
│               ├── profil/
│               │   └── route.ts             # PUT update profil
│               ├── mapping-poli/
│               │   ├── route.ts             # GET · POST
│               │   └── [poliId]/
│               │       └── route.ts         # DELETE
│               ├── sharing-fee/
│               │   ├── route.ts             # GET · PUT
│               │   └── hitung/
│               │       └── route.ts         # POST kalkulasi fee
│               └── jadwal/
│                   ├── route.ts             # GET · POST
│                   └── [jid]/
│                       ├── route.ts         # PUT · DELETE
│                       └── toggle/
│                           └── route.ts     # PATCH
│
├── features/
│   └── dokter/
│       ├── components/
│       │   ├── DokterTable.tsx              # shadcn Table + badge SIP status
│       │   ├── DokterProfilForm.tsx         # Form NIK, SIP, Expired, Spesialisasi
│       │   ├── MappingPoliPanel.tsx         # Checklist poli + tambah/hapus
│       │   ├── SharingFeeForm.tsx           # 4 kategori + Progress bar
│       │   ├── SharingFeeBar.tsx            # Progress bar per kategori
│       │   ├── JadwalPraktekForm.tsx        # Form tambah jadwal
│       │   ├── JadwalPraktekTable.tsx       # Tabel per poli + toggle aktif
│       │   ├── JadwalCalendarView.tsx       # View kalender mingguan (opsional)
│       │   └── SIPStatusBadge.tsx           # Badge Aktif/Segera Expired/Expired
│       ├── hooks/
│       │   └── useDokter.ts                 # TanStack Query hooks
│       ├── schemas/
│       │   └── dokter.schema.ts             # Zod schemas
│       └── types/
│           └── dokter.types.ts              # TypeScript interfaces
│
├── repositories/
│   └── dokter.repository.ts                 # Prisma queries
│
└── services/
    └── dokter.service.ts                    # Business logic + kalkulasi fee
```

---

## 14. Navigasi Menu — Posisi Link

> Sesuai permintaan: link "Data Dokter" **setelah Data Klinis** (Poli, Tindakan, Lab, Rad, Peralatan dari `masterdata_v2.md`).

```typescript
// src/config/nav.config.ts — update navigasi sidebar

export const navItems = [
  // ... menu utama existing ...
  {
    section: 'Master Data',
    items: [
      { label: 'Poliklinik',      href: '/pengaturan/masterdata/poli',      icon: 'Building2',      roles: ['SUPER_ADMIN'] },
      { label: 'Tindakan',        href: '/pengaturan/masterdata/tindakan',   icon: 'Stethoscope',    roles: ['SUPER_ADMIN'] },
      { label: 'Laboratorium',    href: '/pengaturan/masterdata/penunjang?kategori=LAB',       icon: 'FlaskConical',   roles: ['SUPER_ADMIN'] },
      { label: 'Radiologi',       href: '/pengaturan/masterdata/penunjang?kategori=RADIOLOGI', icon: 'ScanLine',       roles: ['SUPER_ADMIN'] },
      { label: 'Peralatan Medis', href: '/pengaturan/masterdata/peralatan',  icon: 'Wrench',         roles: ['SUPER_ADMIN'] },
      // ↓ Link Data Dokter — SETELAH data klinis ↓
      {
        label: 'Data Dokter',
        href:  '/data-dokter',
        icon:  'UserRoundCheck',    // ← Lucide React icon
        roles: ['SUPER_ADMIN'],
        badge: 'sipAlert',          // Badge dinamis jika ada SIP yang segera expired
      },
    ],
  },
];
```

### Tampilan Sidebar

```
Master Data
├── Poliklinik
├── Tindakan
├── Laboratorium
├── Radiologi
├── Peralatan Medis
└── Data Dokter          ← posisi setelah data klinis
     └── [Badge merah jika ada SIP expired]
```

### Halaman Detail Dokter — Tab Layout

```
/data-dokter/[id]
├── Tab 1: Profil Klinis     → NIK, No. SIP, Tgl Expired, Spesialisasi + SIPStatusBadge
├── Tab 2: Mapping Poli      → Checklist poli + daftar poli aktif + tombol hapus
├── Tab 3: Sharing Fee       → 4 form persentase + progress bar real-time
└── Tab 4: Jadwal Praktek    → Tabel per poli per hari + tambah/hapus/toggle
```

---

## 15. User Stories & Business Rules

| ID | Persona | Skenario | Expected Behavior |
|----|---------|----------|-------------------|
| **US01** | Super Admin | Buka halaman Data Dokter | Tampil list semua user role DOKTER + badge SIP status per dokter |
| **US02** | Super Admin | Ada dokter SIP expired | Badge merah "SIP Expired" di tabel + notifikasi di sidebar |
| **US03** | Super Admin | Input profil dokter baru | Form NIK + SIP + Expired + Spesialisasi. Jika SIP duplikat → error service |
| **US04** | Super Admin | Mapping dokter ke Poli Mata + Poli Umum | 2 record `DokterPoli` dibuat. Dokter muncul di dropdown kedua poli |
| **US05** | Super Admin | Hapus mapping poli yang masih ada jadwal aktif | Service error: "Masih ada X jadwal aktif. Nonaktifkan dulu." |
| **US06** | Super Admin | Setup sharing fee: Tindakan 15%, Lab 10%, Rad 10%, Peralatan 0% | Tersimpan 4 record `SharingFee`. Progress bar update real-time di form |
| **US07** | Super Admin | Tambah jadwal Senin 08:00–12:00 di Poli Umum | Jadwal tersimpan. Kuota default 20. |
| **US08** | Super Admin | Tambah jadwal Senin 10:00–14:00 di poli yang sama | Service error: "Jadwal tumpang tindih dengan 08:00–12:00" |
| **US09** | Super Admin | Toggle nonaktif jadwal Senin sore | `isAktif = false` · jadwal tidak muncul di form pendaftaran · bisa diaktifkan lagi |
| **US10** | Admission | Buka form daftar kunjungan | Dropdown dokter hanya tampilkan dokter dengan SIP aktif + punya jadwal di hari tersebut |
| **US11** | Kasir | Proses billing dengan sharing fee | Sistem auto-hitung: `fee = tarif × (persentase / 100)` per item per kategori |
| **US12** | Super Admin | Lihat jadwal dokter A di semua poli | Tab Jadwal Praktek tampil per poli, diurutkan hari & jam mulai |

---

## 16. Seed Data Awal

> Tambahkan ke `prisma/seed.ts`. Dipanggil setelah `seedMasterdataV2()` dan `seedPasien()`.

```typescript
// prisma/seed.ts — tambahkan fungsi dan panggil dari main()

async function seedDokterV3() {

  // Ambil user dengan role DOKTER yang sudah di-seed di masterdata_v1
  const dokterUser = await prisma.user.findFirst({
    where: { email: 'dokter@emr.local', role: 'DOKTER' },
  });

  if (!dokterUser) {
    console.log('⚠ User dokter tidak ditemukan. Jalankan seed masterdata_v1 terlebih dahulu.');
    return;
  }

  // Ambil poli dari masterdata_v2
  const poliUmum = await prisma.poli.findFirst({ where: { kode: 'PU' } });
  const poliMata = await prisma.poli.findFirst({ where: { kode: 'PM' } });

  if (!poliUmum || !poliMata) {
    console.log('⚠ Poli tidak ditemukan. Jalankan seed masterdata_v2 terlebih dahulu.');
    return;
  }

  // ── 1. DokterProfile ──────────────────────────────────────
  const dokterProfile = await prisma.dokterProfile.upsert({
    where:  { userId: dokterUser.id },
    update: {},
    create: {
      userId:        dokterUser.id,
      nik:           '3201011501850001',
      noSIP:         '446/SIP-DU/2024',
      tglExpiredSIP: new Date('2026-12-31'),
      spesialisasi:  'Umum',
    },
  });
  console.log(`✓ DokterProfile: ${dokterUser.nama} [NIK: ${dokterProfile.nik}]`);

  // ── 2. Mapping Poli ───────────────────────────────────────
  const mappingPU = await prisma.dokterPoli.upsert({
    where:  { dokterProfileId_poliId: { dokterProfileId: dokterProfile.id, poliId: poliUmum.id } },
    update: {},
    create: { dokterProfileId: dokterProfile.id, poliId: poliUmum.id },
  });

  const mappingPM = await prisma.dokterPoli.upsert({
    where:  { dokterProfileId_poliId: { dokterProfileId: dokterProfile.id, poliId: poliMata.id } },
    update: {},
    create: { dokterProfileId: dokterProfile.id, poliId: poliMata.id },
  });
  console.log(`✓ Mapping Poli: ${poliUmum.nama} + ${poliMata.nama}`);

  // ── 3. Sharing Fee ────────────────────────────────────────
  const fees = [
    { kategori: 'TINDAKAN',  persentase: 15 },
    { kategori: 'LAB',       persentase: 10 },
    { kategori: 'RADIOLOGI', persentase: 10 },
    { kategori: 'PERALATAN', persentase: 0  },
  ];

  for (const f of fees) {
    await prisma.sharingFee.upsert({
      where:  { dokterProfileId_kategori: { dokterProfileId: dokterProfile.id, kategori: f.kategori as any } },
      update: { persentase: f.persentase },
      create: { dokterProfileId: dokterProfile.id, kategori: f.kategori as any, persentase: f.persentase },
    });
  }
  console.log(`✓ Sharing Fee: Tindakan 15% · Lab 10% · Rad 10% · Peralatan 0%`);

  // ── 4. Jadwal Praktek ─────────────────────────────────────
  const jadwalData = [
    // Poli Umum
    { dokterPoliId: mappingPU.id, hari: 'SENIN',   jamMulai: '08:00', jamSelesai: '12:00', kuotaPasien: 20 },
    { dokterPoliId: mappingPU.id, hari: 'SELASA',  jamMulai: '08:00', jamSelesai: '12:00', kuotaPasien: 20 },
    { dokterPoliId: mappingPU.id, hari: 'RABU',    jamMulai: '08:00', jamSelesai: '12:00', kuotaPasien: 20 },
    { dokterPoliId: mappingPU.id, hari: 'KAMIS',   jamMulai: '13:00', jamSelesai: '17:00', kuotaPasien: 15, keterangan: 'Sesi Sore' },
    { dokterPoliId: mappingPU.id, hari: 'JUMAT',   jamMulai: '08:00', jamSelesai: '11:00', kuotaPasien: 12 },
    // Poli Mata
    { dokterPoliId: mappingPM.id, hari: 'SENIN',   jamMulai: '13:00', jamSelesai: '16:00', kuotaPasien: 10 },
    { dokterPoliId: mappingPM.id, hari: 'KAMIS',   jamMulai: '08:00', jamSelesai: '11:00', kuotaPasien: 10 },
    { dokterPoliId: mappingPM.id, hari: 'SABTU',   jamMulai: '08:00', jamSelesai: '12:00', kuotaPasien: 15 },
  ];

  for (const j of jadwalData) {
    await prisma.jadwalPraktek.create({ data: j as any });
  }
  console.log(`✓ Jadwal Praktek: ${jadwalData.length} slot (${poliUmum.nama} & ${poliMata.nama})`);

  console.log('\n✅ Seed dokter v3 selesai.');
}

// Panggil di main():
// await seedDokterV3();
```

---

## Appendix — Relasi Antar Model

```
User (role = DOKTER)
    └── DokterProfile (1-to-1)
            ├── SharingFee[] (1-to-many, 4 kategori)
            │     TINDAKAN · LAB · RADIOLOGI · PERALATAN (%)
            │
            └── DokterPoli[] (many-to-many via Poli)
                    ├── Poli (Umum / Mata / Bedah / ...)
                    └── JadwalPraktek[]
                            hari · jamMulai · jamSelesai
                            kuotaPasien · isAktif

Kalkulasi Billing:
  Tindakan.tarif × (SharingFee[TINDAKAN].persentase / 100) = fee dokter
  Lab.tarif      × (SharingFee[LAB].persentase       / 100) = fee dokter
  Rad.tarif      × (SharingFee[RADIOLOGI].persentase  / 100) = fee dokter
```

---

## Appendix — Ringkasan Stack

```
STACK (sesuai setup_awal.md):
  Next.js App Router  → Route Handlers + Server Actions
  TypeScript          → strict mode
  Tailwind CSS        → utility-first
  shadcn/ui           → Form, Input, Select, Badge, Progress, Tabs, Alert
  React Hook Form     → useForm, useWatch
  @hookform/resolvers → zodResolver
  Zod                 → dokterProfileSchema, sharingFeeSchema,
                        jadwalPraktekSchema, superRefine overlap check
  TanStack Query      → useDokterList, useDokterDetail,
                        useSaveProfilDokter, useAddPoliMapping,
                        useSaveSharingFee, useCreateJadwal, useToggleJadwal
  Prisma ORM          → Repository Pattern
  PostgreSQL (Neon.tech) → serverless
  NextAuth/Auth.js    → JWT + RBAC middleware
  Lucide React        → UserRoundCheck, BadgeCheck, Stethoscope,
                        ShieldCheck, ShieldAlert, ShieldX, Shield,
                        Percent, CalendarPlus, Building2
```

---

*masterdata_v3.md v3.0.0 — Addendum terhadap PRD_EMR_System.md, masterdata_v1.md, masterdata_v2.md, dan setup_pasien.md.*  
*Semua model bersifat tambahan. Tidak ada model dari dokumen sebelumnya yang dihapus.*
