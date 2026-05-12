# setup_pasien.md
# Manajemen Data Pasien — Patient Setup

| Info | Detail |
|:-----|:-------|
| **Versi** | 1.1.0 (aligned with setup_awal.md) |
| **Status** | Final Draft |
| **Depends On** | `setup_awal.md` · `PRD_EMR_System.md` · `masterdata_v1.md v1.1.0` · `masterdata_v2.md` |
| **Tech Stack** | Next.js App Router · Prisma · PostgreSQL (Neon.tech) · shadcn/ui · React Hook Form · Zod · TanStack Query · Tailwind CSS · TypeScript |
| **Scope** | Registrasi, edit, pencarian, dan manajemen data demografi pasien |

---

## Daftar Isi

1. [Konteks & Posisi dalam Project](#1-konteks--posisi-dalam-project)
2. [Field Pasien & Aturan Mandatori](#2-field-pasien--aturan-mandatori)
3. [Format Nomor Rekam Medis — Auto-Generate](#3-format-nomor-rekam-medis--auto-generate)
4. [Tipe Pasien — WNI & WNA](#4-tipe-pasien--wni--wna)
5. [Kontak Darurat](#5-kontak-darurat)
6. [Prisma Schema](#6-prisma-schema)
7. [Zod Validation Schema](#7-zod-validation-schema)
8. [Repository Layer](#8-repository-layer)
9. [Service Layer](#9-service-layer)
10. [API Endpoints — Route Handlers](#10-api-endpoints--route-handlers)
11. [Komponen UI — shadcn/ui](#11-komponen-ui--shadcnui)
12. [Form — React Hook Form + Zod](#12-form--react-hook-form--zod)
13. [Data Fetching — TanStack Query](#13-data-fetching--tanstack-query)
14. [Hak Akses — RBAC](#14-hak-akses--rbac)
15. [Struktur Folder](#15-struktur-folder)
16. [User Stories & Business Rules](#16-user-stories--business-rules)
17. [Seed Data Awal](#17-seed-data-awal)

---

## 1. Konteks & Posisi dalam Project

### Rantai Dokumen

```
setup_awal.md
│  Next.js App Router, Prisma, Neon.tech, shadcn/ui,
│  React Hook Form, Zod, TanStack Query, Tailwind CSS,
│  Lucide React, bcryptjs, NextAuth/Auth.js
│
├── PRD_EMR_System.md      → Arsitektur global, model Pasien dasar
├── masterdata_v1.md       → RBAC, User management, reset password
├── masterdata_v2.md       → Tindakan (lokal), Lab/Rad/Peralatan (global)
└── setup_pasien.md (ini)  → Extend model Pasien:
                              field mandatori baru, NoRM auto-generate,
                              tipe WNI/WNA, kontak darurat
                              Implementasi: shadcn/ui + RHF + Zod + TanStack Query
```

### Perubahan dari Model Pasien di PRD_EMR_System.md

| Field / Fitur | PRD lama | setup_pasien v1.1 |
|---|---|---|
| `tempatLahir` | ❌ Belum ada | ✅ Mandatori |
| `tipePasien` (WNI/WNA) | ❌ Belum ada | ✅ Mandatori |
| `nama` | ✅ Ada | ✅ + validasi min 3 karakter |
| `tanggalLahir` | ✅ Ada | ✅ + guard masa depan & usia max |
| `alamat` | ❌ Opsional (`String?`) | ✅ **Mandatori** (`String`) |
| `telepon` | ❌ Opsional (`String?`) | ✅ **Mandatori** (`String`) |
| `nomorRM` | ✅ Manual | ✅ **Auto-generate** `RM-XXXXXX` |
| `golonganDarah` | `String?` bebas | ✅ Enum terstruktur |
| `KontakDarurat` | ❌ Belum ada | ✅ Model baru, 1-to-many |
| NIK wajib jika WNI | ❌ | ✅ Zod `superRefine` kondisional |
| Nomor Paspor wajib jika WNA | ❌ | ✅ Field baru + validasi kondisional |

---

## 2. Field Pasien & Aturan Mandatori

### 2.1 Tabel Lengkap Field

| Field | Tipe | Mandatori | Keterangan |
|-------|------|:---------:|------------|
| `nomorRM` | `String` | ✅ auto | Auto-generate `RM-XXXXXX` · read-only setelah dibuat |
| `nama` | `String` | ✅ | Min 3 karakter · hanya huruf, spasi, tanda hubung |
| `tempatLahir` | `String` | ✅ | Kota / kabupaten tempat lahir |
| `tanggalLahir` | `DateTime` | ✅ | Tidak boleh masa depan · usia max 150 tahun |
| `jenisKelamin` | `Enum` | ✅ | `LAKI_LAKI` \| `PEREMPUAN` |
| `tipePasien` | `Enum` | ✅ | `WNI` \| `WNA` · tidak bisa diubah setelah simpan |
| `nik` | `String?` | ✅ jika WNI | 16 digit angka · unik |
| `noPaspor` | `String?` | ✅ jika WNA | 5–20 karakter alphanumeric · unik · auto-uppercase |
| `negaraAsal` | `String?` | ✅ jika WNA | Nama negara asal pasien |
| `alamat` | `String` | ✅ | Min 10 karakter · alamat domisili lengkap |
| `telepon` | `String` | ✅ | Format `08xx` / `+62xx` · min 10 digit |
| `email` | `String?` | ❌ | Format email valid jika diisi |
| `golonganDarah` | `Enum?` | ❌ | `A` \| `B` \| `AB` \| `O` \| `TIDAK_DIKETAHUI` |
| `alergi` | `String?` | ❌ | Teks bebas · max 1000 karakter |
| `noBPJS` | `String?` | ❌ | 13 digit · hanya WNI · unik |
| `noAsuransi` | `String?` | ❌ | Nomor asuransi swasta |
| `foto` | `String?` | ❌ | URL foto pasien |
| `isActive` | `Boolean` | auto | Default `true` · nonaktif = soft delete |
| `kontakDarurat` | Relasi | ❌ | Min 1 disarankan · 1-to-many |

### 2.2 Aturan Validasi

```
NAMA
  ✓ Min 3 karakter, max 100 karakter
  ✓ Regex: /^[a-zA-Z\s\-'.]+$/
  ✗ Tidak boleh angka atau simbol selain (- ' .)

TANGGAL LAHIR
  ✓ Tidak boleh tanggal di masa depan
  ✓ Min: 1875-01-01 (guard data entry error)
  ✓ Bayi baru lahir (0 hari) diizinkan

NIK  — wajib jika tipePasien = WNI
  ✓ Tepat 16 digit angka · unik di database

NOMOR PASPOR  — wajib jika tipePasien = WNA
  ✓ Unik di database
  ✓ 5–20 karakter alphanumeric · otomatis UPPERCASE

TELEPON
  ✓ Format: 08xxxxxxxx atau +628xxxxxxxx
  ✓ Min 10 digit, max 15 digit

NOMOR BPJS (jika diisi)
  ✓ Tepat 13 digit angka · tidak duplikat
  ✓ Hanya tersedia untuk tipePasien = WNI
```

---

## 3. Format Nomor Rekam Medis — Auto-Generate

### Format

```
RM-XXXXXX     ← prefix tetap + 6 digit angka sequential

Contoh:
  RM-000001   pasien pertama
  RM-000042
  RM-001234
  RM-999999   batas maksimum
```

### Implementasi — `src/lib/generate-rm.ts`

```typescript
// src/lib/generate-rm.ts
// Menggunakan Prisma transaction agar thread-safe (concurrent insert)

import { prisma } from '@/lib/prisma';

export async function generateNomorRM(): Promise<string> {
  return prisma.$transaction(async (tx) => {
    const last = await tx.pasien.findFirst({
      orderBy: { nomorRM: 'desc' },
      select:  { nomorRM: true },
    });

    let nextNum = 1;
    if (last?.nomorRM) {
      const match = last.nomorRM.match(/^RM-(\d{6})$/);
      if (match) nextNum = parseInt(match[1], 10) + 1;
    }

    if (nextNum > 999_999) {
      throw new Error('Nomor RM mencapai batas RM-999999. Hubungi administrator.');
    }

    const nomorRM = `RM-${String(nextNum).padStart(6, '0')}`;

    // Safeguard concurrent insert
    const exists = await tx.pasien.findUnique({ where: { nomorRM } });
    if (exists) return `RM-${String(nextNum + 1).padStart(6, '0')}`;

    return nomorRM;
  });
}
```

### Aturan Bisnis NoRM

| Aturan | Keterangan |
|--------|-----------|
| Auto-generate | Dibuat sistem saat `create`, tidak bisa diinput manual |
| Unik | Constraint `@@unique` di database |
| Immutable | Setelah dibuat, `nomorRM` read-only selamanya |
| Di kartu pasien | Dicetak beserta QR Code untuk scan cepat |

---

## 4. Tipe Pasien — WNI & WNA

### Perbedaan Field per Tipe

```
tipePasien = WNI                      tipePasien = WNA
──────────────────────────────        ──────────────────────────────
NIK (16 digit)    → WAJIB            No. Paspor         → WAJIB
No. BPJS          → opsional         Negara Asal        → WAJIB
No. Paspor        → disembunyikan    No. Asuransi swasta → opsional
Negara Asal       → disembunyikan    NIK                → disembunyikan
                                     No. BPJS           → disembunyikan
```

### Conditional Rendering di React

```tsx
// useWatch dari React Hook Form untuk reaktif real-time
const tipePasien = useWatch({ control, name: 'tipePasien' });

{tipePasien === 'WNI' && (
  <>
    <FormField name="nik" ... />       {/* wajib */}
    <FormField name="noBPJS" ... />    {/* opsional */}
  </>
)}

{tipePasien === 'WNA' && (
  <>
    <FormField name="noPaspor" ... />   {/* wajib */}
    <FormField name="negaraAsal" ... /> {/* wajib */}
    <FormField name="noAsuransi" ... /> {/* opsional */}
  </>
)}
```

---

## 5. Kontak Darurat

### Field

| Field | Tipe | Mandatori | Keterangan |
|-------|------|:---------:|-----------|
| `nama` | `String` | ✅ | Min 3 karakter |
| `nomorHP` | `String` | ✅ | Format telepon valid · tidak = nomor pasien |
| `hubungan` | `Enum` | ✅ | 15 pilihan |
| `alamat` | `String?` | ❌ | Opsional |
| `isPrimary` | `Boolean` | auto | Tepat 1 kontak primary per pasien |

### Enum Hubungan

```prisma
enum HubunganKontak {
  SUAMI | ISTRI | AYAH | IBU | ANAK | KAKAK | ADIK |
  KAKEK | NENEK | PAMAN | BIBI | KEPONAKAN |
  TEMAN | REKAN_KERJA | LAINNYA
}
```

### Aturan Bisnis

```
✓ Pasien bisa punya banyak kontak darurat
✓ Tepat 1 kontak harus isPrimary = true
✓ Jika hanya 1 kontak → otomatis isPrimary
✓ Jika kontak primary dihapus → kontak pertama tersisa jadi primary
✗ Nomor HP kontak tidak boleh sama dengan nomor HP pasien
✗ Kontak darurat bukan User sistem — tidak bisa login
```

---

## 6. Prisma Schema

> Menggantikan model `Pasien` dari `PRD_EMR_System.md`. Semua relasi existing dipertahankan.

```prisma
// prisma/schema.prisma — ENUM TAMBAHAN

enum TipePasien {
  WNI
  WNA
}

enum GolonganDarah {
  A
  B
  AB
  O
  TIDAK_DIKETAHUI
}

enum HubunganKontak {
  SUAMI
  ISTRI
  AYAH
  IBU
  ANAK
  KAKAK
  ADIK
  KAKEK
  NENEK
  PAMAN
  BIBI
  KEPONAKAN
  TEMAN
  REKAN_KERJA
  LAINNYA
}

// ── MODEL PASIEN (menggantikan versi PRD_EMR_System.md) ──

model Pasien {
  id            String         @id @default(cuid())
  userId        String?        @unique

  // Nomor Rekam Medis — auto-generate, immutable
  nomorRM       String         @unique   // Format: RM-XXXXXX

  // Identitas mandatori
  nama          String
  tempatLahir   String                   // BARU — mandatori
  tanggalLahir  DateTime
  jenisKelamin  JenisKelamin             // enum existing di PRD_EMR
  tipePasien    TipePasien               // BARU — mandatori

  // Identifikasi legal — kondisional
  nik           String?        @unique   // Wajib jika WNI
  noPaspor      String?        @unique   // BARU — wajib jika WNA
  negaraAsal    String?                  // BARU — wajib jika WNA

  // Kontak mandatori (diubah dari nullable)
  alamat        String                   // ← String? → String
  telepon       String                   // ← String? → String

  // Kontak opsional
  email         String?

  // Medis opsional
  golonganDarah GolonganDarah?           // ← String? → Enum
  alergi        String?        @db.Text

  // Asuransi opsional
  noBPJS        String?        @unique
  noAsuransi    String?

  // Media & status
  foto          String?
  isActive      Boolean        @default(true)

  createdAt     DateTime       @default(now())
  updatedAt     DateTime       @updatedAt

  // Relasi
  user          User?          @relation(fields: [userId], references: [id])
  kontakDarurat KontakDarurat[]           // BARU
  kunjungan     Kunjungan[]               // existing
  rawatInap     RawatInap[]               // existing

  @@map("pasien")
}

// ── MODEL KONTAK DARURAT (baru) ──

model KontakDarurat {
  id        String          @id @default(cuid())
  pasienId  String
  nama      String
  nomorHP   String
  hubungan  HubunganKontak
  alamat    String?
  isPrimary Boolean         @default(false)
  createdAt DateTime        @default(now())
  updatedAt DateTime        @updatedAt

  pasien    Pasien          @relation(fields: [pasienId], references: [id], onDelete: Cascade)

  @@map("kontak_darurat")
}
```

### Perintah Migrasi

```bash
# Setelah update schema.prisma:
npx prisma migrate dev --name add_pasien_setup_v1

# Jika ada data existing, jalankan SQL ini sebelum migrasi:
# UPDATE pasien SET alamat = '-' WHERE alamat IS NULL;
# UPDATE pasien SET telepon = '000' WHERE telepon IS NULL;
# UPDATE pasien SET "tempatLahir" = '-' WHERE "tempatLahir" IS NULL;
# UPDATE pasien SET "tipePasien" = 'WNI' WHERE "tipePasien" IS NULL;

npx prisma generate
```

---

## 7. Zod Validation Schema

> Menggunakan `zod` sesuai `setup_awal.md`. Dipakai bersama React Hook Form via `@hookform/resolvers/zod`.

```typescript
// src/features/pasien/schemas/pasien.schema.ts

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
  ], { required_error: 'Hubungan wajib dipilih' }),
  alamat:    z.string().optional(),
  isPrimary: z.boolean().default(false),
});

// ── Pasien ─────────────────────────────────────────────────────
export const createPasienSchema = z
  .object({
    nama: z
      .string({ required_error: 'Nama wajib diisi' })
      .min(3, 'Nama minimal 3 karakter').max(100)
      .regex(rNama, 'Nama hanya huruf, spasi, atau tanda hubung (-)'),

    tempatLahir: z
      .string({ required_error: 'Tempat lahir wajib diisi' })
      .min(2, 'Tempat lahir minimal 2 karakter').max(100),

    tanggalLahir: z
      .coerce.date({ required_error: 'Tanggal lahir wajib diisi' })
      .max(new Date(),             'Tanggal lahir tidak boleh di masa depan')
      .min(new Date('1875-01-01'), 'Tanggal lahir tidak valid'),

    jenisKelamin: z.enum(['LAKI_LAKI', 'PEREMPUAN'], {
      required_error: 'Jenis kelamin wajib dipilih',
    }),

    tipePasien: z.enum(['WNI', 'WNA'], {
      required_error: 'Tipe pasien wajib dipilih (WNI / WNA)',
    }),

    nik:        z.string().optional(),
    noPaspor:   z.string().optional(),
    negaraAsal: z.string().optional(),

    alamat: z
      .string({ required_error: 'Alamat wajib diisi' })
      .min(10, 'Alamat minimal 10 karakter').max(500),

    telepon: z
      .string({ required_error: 'No. HP wajib diisi' })
      .regex(rTelepon, 'Format: 08xxxxxxxx atau +628xxxxxxxx'),

    email:         z.string().email('Format email tidak valid').optional()
                    .or(z.literal('')),
    golonganDarah: z.enum(['A','B','AB','O','TIDAK_DIKETAHUI']).optional(),
    alergi:        z.string().max(1000).optional(),
    noBPJS:        z.string().regex(rBPJS, 'Nomor BPJS harus 13 digit')
                    .optional().or(z.literal('')),
    noAsuransi:    z.string().optional(),
    kontakDarurat: z.array(kontakDaruratSchema).optional().default([]),
  })

  .superRefine((data, ctx) => {
    // WNI → NIK wajib
    if (data.tipePasien === 'WNI') {
      if (!data.nik) {
        ctx.addIssue({ code: 'custom', path: ['nik'],
          message: 'NIK wajib diisi untuk pasien WNI' });
      } else if (!rNIK.test(data.nik)) {
        ctx.addIssue({ code: 'custom', path: ['nik'],
          message: 'NIK harus tepat 16 digit angka' });
      }
    }

    // WNA → Paspor + Negara wajib
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

    // Nomor HP kontak ≠ nomor HP pasien
    data.kontakDarurat?.forEach((k, i) => {
      if (k.nomorHP && data.telepon && k.nomorHP === data.telepon) {
        ctx.addIssue({ code: 'custom',
          path: ['kontakDarurat', i, 'nomorHP'],
          message: 'Nomor HP kontak tidak boleh sama dengan nomor HP pasien',
        });
      }
    });

    // Max 1 primary
    const primaries = data.kontakDarurat?.filter(k => k.isPrimary) ?? [];
    if (primaries.length > 1) {
      ctx.addIssue({ code: 'custom', path: ['kontakDarurat'],
        message: 'Hanya boleh satu kontak utama (primary)' });
    }
  });

// tipePasien tidak bisa diubah setelah registrasi
export const updatePasienSchema = createPasienSchema
  .partial()
  .omit({ tipePasien: true });

export type CreatePasienDTO  = z.infer<typeof createPasienSchema>;
export type UpdatePasienDTO  = z.infer<typeof updatePasienSchema>;
export type KontakDaruratDTO = z.infer<typeof kontakDaruratSchema>;
```

---

## 8. Repository Layer

> Pola Repository sesuai `setup_awal.md`. File di `src/repositories/pasien.repository.ts`.

```typescript
// src/repositories/pasien.repository.ts

import { prisma } from '@/lib/prisma';
import { generateNomorRM } from '@/lib/generate-rm';
import type { CreatePasienDTO, UpdatePasienDTO } from '@/features/pasien/schemas/pasien.schema';

export const pasienRepository = {

  async findAll(params?: {
    search?: string; tipePasien?: 'WNI' | 'WNA';
    isActive?: boolean; page?: number; limit?: number;
  }) {
    const { search, tipePasien, isActive = true, page = 1, limit = 20 } = params ?? {};
    const where = {
      isActive,
      ...(tipePasien ? { tipePasien } : {}),
      ...(search ? {
        OR: [
          { nama:     { contains: search, mode: 'insensitive' as const } },
          { nomorRM:  { contains: search, mode: 'insensitive' as const } },
          { nik:      { contains: search, mode: 'insensitive' as const } },
          { noPaspor: { contains: search, mode: 'insensitive' as const } },
          { telepon:  { contains: search } },
        ],
      } : {}),
    };

    const [data, total] = await Promise.all([
      prisma.pasien.findMany({
        where,
        select: {
          id: true, nomorRM: true, nama: true,
          tempatLahir: true, tanggalLahir: true,
          jenisKelamin: true, tipePasien: true,
          telepon: true, alamat: true, isActive: true, createdAt: true,
          kontakDarurat: {
            where: { isPrimary: true },
            select: { nama: true, nomorHP: true, hubungan: true },
            take: 1,
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.pasien.count({ where }),
    ]);

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  },

  async findById(id: string) {
    return prisma.pasien.findUnique({
      where: { id },
      include: {
        kontakDarurat: { orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }] },
        kunjungan: {
          orderBy: { tanggal: 'desc' }, take: 5,
          select: {
            id: true, nomorAntrean: true, tanggal: true, status: true,
            poli:   { select: { nama: true } },
            dokter: { select: { user: { select: { nama: true } } } },
          },
        },
      },
    });
  },

  async findByNomorRM(nomorRM: string) {
    return prisma.pasien.findUnique({ where: { nomorRM } });
  },

  async findByNIK(nik: string, excludeId?: string) {
    return prisma.pasien.findFirst({
      where: { nik, ...(excludeId ? { id: { not: excludeId } } : {}) },
      select: { id: true, nama: true, nomorRM: true },
    });
  },

  async findByNoPaspor(noPaspor: string, excludeId?: string) {
    return prisma.pasien.findFirst({
      where: { noPaspor, ...(excludeId ? { id: { not: excludeId } } : {}) },
      select: { id: true, nama: true, nomorRM: true },
    });
  },

  async create(data: CreatePasienDTO) {
    const nomorRM = await generateNomorRM();
    const { kontakDarurat = [], ...fields } = data;

    const kontakNormalized = kontakDarurat.map((k) => ({
      ...k,
      isPrimary: kontakDarurat.length === 1 ? true : k.isPrimary,
    }));

    return prisma.pasien.create({
      data: {
        ...fields,
        nomorRM,
        noPaspor:  data.noPaspor?.toUpperCase() ?? null,
        email:     data.email  || null,
        noBPJS:    data.noBPJS || null,
        kontakDarurat: { create: kontakNormalized },
      },
      include: { kontakDarurat: true },
    });
  },

  async update(id: string, data: UpdatePasienDTO) {
    const { kontakDarurat, ...fields } = data;

    return prisma.$transaction(async (tx) => {
      const updated = await tx.pasien.update({
        where: { id },
        data: { ...fields, email: data.email || null, noBPJS: data.noBPJS || null },
      });

      if (kontakDarurat !== undefined) {
        await tx.kontakDarurat.deleteMany({ where: { pasienId: id } });
        if (kontakDarurat.length > 0) {
          await tx.kontakDarurat.createMany({
            data: kontakDarurat.map((k) => ({
              ...k,
              pasienId:  id,
              isPrimary: kontakDarurat.length === 1 ? true : k.isPrimary,
            })),
          });
        }
      }

      return updated;
    });
  },

  async toggleActive(id: string, isActive: boolean) {
    return prisma.pasien.update({ where: { id }, data: { isActive } });
  },

  async logActivity(params: {
    userId: string; action: string; resourceId: string; detail?: object;
  }) {
    return prisma.activityLog.create({
      data: {
        userId:     params.userId,
        action:     params.action,
        resource:   'pasien',
        resourceId: params.resourceId,
        detail:     params.detail ?? {},
      },
    });
  },
};
```

---

## 9. Service Layer

> File di `src/services/pasien.service.ts` sesuai struktur `setup_awal.md`.

```typescript
// src/services/pasien.service.ts

import { pasienRepository } from '@/repositories/pasien.repository';
import type { CreatePasienDTO, UpdatePasienDTO } from '@/features/pasien/schemas/pasien.schema';

export const pasienService = {

  async getAll(params?: Parameters<typeof pasienRepository.findAll>[0]) {
    return pasienRepository.findAll(params);
  },

  async getById(id: string) {
    const pasien = await pasienRepository.findById(id);
    if (!pasien) throw new Error('Pasien tidak ditemukan');
    return pasien;
  },

  async searchByRM(nomorRM: string) {
    const pasien = await pasienRepository.findByNomorRM(nomorRM);
    if (!pasien) throw new Error(`Nomor RM ${nomorRM} tidak ditemukan`);
    return pasien;
  },

  async create(dto: CreatePasienDTO, createdByUserId: string) {
    if (dto.tipePasien === 'WNI' && dto.nik) {
      const dup = await pasienRepository.findByNIK(dto.nik);
      if (dup) throw new Error(`NIK sudah terdaftar atas nama ${dup.nama} (${dup.nomorRM})`);
    }

    if (dto.tipePasien === 'WNA' && dto.noPaspor) {
      const dup = await pasienRepository.findByNoPaspor(dto.noPaspor);
      if (dup) throw new Error(`No. Paspor sudah terdaftar atas nama ${dup.nama} (${dup.nomorRM})`);
    }

    const pasien = await pasienRepository.create(dto);

    await pasienRepository.logActivity({
      userId:     createdByUserId,
      action:     'CREATE_PASIEN',
      resourceId: pasien.id,
      detail:     { nomorRM: pasien.nomorRM, nama: pasien.nama },
    });

    return pasien;
  },

  async update(id: string, dto: UpdatePasienDTO, updatedByUserId: string) {
    const existing = await pasienRepository.findById(id);
    if (!existing) throw new Error('Pasien tidak ditemukan');

    if (dto.nik && dto.nik !== existing.nik) {
      const dup = await pasienRepository.findByNIK(dto.nik, id);
      if (dup) throw new Error(`NIK sudah digunakan pasien lain (${dup.nomorRM})`);
    }

    const updated = await pasienRepository.update(id, dto);

    await pasienRepository.logActivity({
      userId:     updatedByUserId,
      action:     'UPDATE_PASIEN',
      resourceId: id,
      detail:     { fields: Object.keys(dto) },
    });

    return updated;
  },

  async toggleActive(id: string, isActive: boolean, byUserId: string) {
    const existing = await pasienRepository.findById(id);
    if (!existing) throw new Error('Pasien tidak ditemukan');

    const result = await pasienRepository.toggleActive(id, isActive);

    await pasienRepository.logActivity({
      userId:     byUserId,
      action:     isActive ? 'ACTIVATE_PASIEN' : 'DEACTIVATE_PASIEN',
      resourceId: id,
    });

    return result;
  },
};
```

---

## 10. API Endpoints — Route Handlers

> Next.js App Router Route Handlers sesuai `setup_awal.md`.

| Method | Endpoint | Deskripsi | Role |
|--------|----------|-----------|------|
| `GET` | `/api/pasien` | List + filter + paginate | `SUPER_ADMIN` `ADMISSION` `DOKTER` `PERAWAT` `KASIR` |
| `POST` | `/api/pasien` | Registrasi pasien baru | `SUPER_ADMIN` `ADMISSION` `PERAWAT` |
| `GET` | `/api/pasien/search` | Quick search nama/NIK/NoRM | `SUPER_ADMIN` `ADMISSION` `DOKTER` `PERAWAT` `KASIR` |
| `GET` | `/api/pasien/[id]` | Detail + riwayat kunjungan | `SUPER_ADMIN` `ADMISSION` `DOKTER` `PERAWAT` |
| `PUT` | `/api/pasien/[id]` | Update data demografi | `SUPER_ADMIN` `ADMISSION` `PERAWAT` |
| `PATCH` | `/api/pasien/[id]/toggle` | Aktifkan / nonaktifkan | `SUPER_ADMIN` `ADMISSION` |
| `GET` | `/api/pasien/[id]/kontak-darurat` | List kontak darurat | `SUPER_ADMIN` `ADMISSION` `DOKTER` `PERAWAT` |
| `POST` | `/api/pasien/[id]/kontak-darurat` | Tambah kontak | `SUPER_ADMIN` `ADMISSION` |
| `PUT` | `/api/pasien/[id]/kontak-darurat/[kid]` | Update kontak | `SUPER_ADMIN` `ADMISSION` |
| `DELETE` | `/api/pasien/[id]/kontak-darurat/[kid]` | Hapus kontak | `SUPER_ADMIN` `ADMISSION` |

```typescript
// src/app/api/pasien/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { pasienService } from '@/services/pasien.service';
import { createPasienSchema } from '@/features/pasien/schemas/pasien.schema';

const CAN_READ   = ['SUPER_ADMIN','ADMISSION','DOKTER','PERAWAT','KASIR'];
const CAN_CREATE = ['SUPER_ADMIN','ADMISSION','PERAWAT'];

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user)                          return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!CAN_READ.includes(session.user.role))   return NextResponse.json({ error: 'Forbidden' },    { status: 403 });

  const sp = new URL(req.url).searchParams;
  const result = await pasienService.getAll({
    search:     sp.get('q')     ?? undefined,
    tipePasien: (sp.get('tipe') as any) ?? undefined,
    isActive:   sp.get('isActive') !== 'false',
    page:       Number(sp.get('page')  ?? 1),
    limit:      Number(sp.get('limit') ?? 20),
  });

  return NextResponse.json(result);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user)                           return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!CAN_CREATE.includes(session.user.role))  return NextResponse.json({ error: 'Forbidden' },    { status: 403 });

  const body   = await req.json();
  const parsed = createPasienSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Validasi gagal', details: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const pasien = await pasienService.create(parsed.data, session.user.id);
    return NextResponse.json(pasien, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 422 });
  }
}
```

---

## 11. Komponen UI — shadcn/ui

> Semua komponen menggunakan shadcn/ui + Lucide React sesuai `setup_awal.md`.

```bash
# Install shadcn/ui components yang dibutuhkan
npx shadcn@latest add form input select textarea badge card
npx shadcn@latest add radio-group separator toast
```

```typescript
// src/features/pasien/components/NomorRMBadge.tsx
import { Badge }  from '@/components/ui/badge';
import { IdCard } from 'lucide-react';   // ← Lucide React (dari setup_awal.md)

export function NomorRMBadge({ nomorRM }: { nomorRM: string }) {
  return (
    <Badge variant="outline" className="font-mono gap-1.5">
      <IdCard className="h-3.5 w-3.5" />
      {nomorRM}
    </Badge>
  );
}

// src/features/pasien/components/TipePasienBadge.tsx
import { Badge }       from '@/components/ui/badge';
import { Globe, Flag } from 'lucide-react';  // ← Lucide React

export function TipePasienBadge({ tipe }: { tipe: 'WNI' | 'WNA' }) {
  return tipe === 'WNI' ? (
    <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100 gap-1">
      <Flag className="h-3 w-3" /> WNI
    </Badge>
  ) : (
    <Badge className="bg-purple-100 text-purple-800 hover:bg-purple-100 gap-1">
      <Globe className="h-3 w-3" /> WNA
    </Badge>
  );
}
```

---

## 12. Form — React Hook Form + Zod

> `react-hook-form` + `@hookform/resolvers/zod` sesuai `setup_awal.md`.

```tsx
// src/features/pasien/components/PasienForm.tsx
'use client';

import { useForm, useWatch, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createPasienSchema, type CreatePasienDTO } from '../schemas/pasien.schema';
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
import { Plus, Trash2, Star, UserPlus } from 'lucide-react';   // ← Lucide React
import { useCreatePasien } from '../hooks/usePasien';

const HUBUNGAN_OPTIONS = [
  { value:'SUAMI',      label:'Suami' },   { value:'ISTRI',      label:'Istri' },
  { value:'AYAH',       label:'Ayah' },    { value:'IBU',        label:'Ibu' },
  { value:'ANAK',       label:'Anak' },    { value:'KAKAK',      label:'Kakak' },
  { value:'ADIK',       label:'Adik' },    { value:'KAKEK',      label:'Kakek' },
  { value:'NENEK',      label:'Nenek' },   { value:'PAMAN',      label:'Paman' },
  { value:'BIBI',       label:'Bibi' },    { value:'KEPONAKAN',  label:'Keponakan' },
  { value:'TEMAN',      label:'Teman' },   { value:'REKAN_KERJA',label:'Rekan Kerja' },
  { value:'LAINNYA',    label:'Lainnya' },
];

export function PasienForm() {
  const { mutate: createPasien, isPending } = useCreatePasien();

  const form = useForm<CreatePasienDTO>({
    resolver: zodResolver(createPasienSchema),
    defaultValues: { tipePasien: 'WNI', kontakDarurat: [] },
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

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit((d) => createPasien(d))} className="space-y-6">

        {/* ── Section 1: Identitas Utama ── */}
        <div className="rounded-lg border p-4 space-y-4">
          <p className="text-sm font-medium text-muted-foreground">Identitas Utama</p>

          {/* Tipe Pasien */}
          <FormField control={form.control} name="tipePasien" render={({ field }) => (
            <FormItem>
              <FormLabel>Tipe Pasien <span className="text-destructive">*</span></FormLabel>
              <div className="flex gap-3">
                {(['WNI','WNA'] as const).map((t) => (
                  <button key={t} type="button" onClick={() => field.onChange(t)}
                    className={`flex-1 py-2 px-4 rounded-md border text-sm font-medium transition-colors
                      ${field.value === t
                        ? t === 'WNI'
                          ? 'bg-blue-50 border-blue-500 text-blue-700'
                          : 'bg-purple-50 border-purple-500 text-purple-700'
                        : 'border-input hover:bg-muted'}`}>
                    {t === 'WNI' ? '🇮🇩 WNI' : '🌐 WNA'}
                  </button>
                ))}
              </div>
              <FormMessage />
            </FormItem>
          )} />

          {/* Nama */}
          <FormField control={form.control} name="nama" render={({ field }) => (
            <FormItem>
              <FormLabel>Nama Lengkap <span className="text-destructive">*</span></FormLabel>
              <FormControl><Input placeholder="Sesuai KTP / Paspor" {...field} /></FormControl>
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
                      ? field.value.toISOString().split('T')[0] : field.value ?? ''}
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
                  <RadioGroup value={field.value} onValueChange={field.onChange}
                    className="flex gap-4 pt-1">
                    {[{v:'LAKI_LAKI',l:'Laki-laki'},{v:'PEREMPUAN',l:'Perempuan'}].map(o => (
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
                    {['A','B','AB','O'].map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
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
          {tipePasien === 'WNI' && (
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="nik" render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    NIK <span className="text-destructive">*</span>
                    <Badge variant="outline" className="ml-2 text-xs">Wajib WNI</Badge>
                  </FormLabel>
                  <FormControl>
                    <Input placeholder="16 digit" maxLength={16}
                      {...field}
                      onChange={e => field.onChange(e.target.value.replace(/\D/g, ''))}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="noBPJS" render={({ field }) => (
                <FormItem>
                  <FormLabel>Nomor BPJS</FormLabel>
                  <FormControl><Input placeholder="13 digit" maxLength={13} {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>
          )}

          {/* WNA: Paspor + Negara */}
          {tipePasien === 'WNA' && (
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
                      onChange={e => field.onChange(e.target.value.toUpperCase())}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="negaraAsal" render={({ field }) => (
                <FormItem>
                  <FormLabel>Negara Asal <span className="text-destructive">*</span></FormLabel>
                  <FormControl><Input placeholder="Amerika Serikat" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>
          )}

          {/* Alamat */}
          <FormField control={form.control} name="alamat" render={({ field }) => (
            <FormItem>
              <FormLabel>Alamat Domisili <span className="text-destructive">*</span></FormLabel>
              <FormControl>
                <Textarea placeholder="Jl. Nama Jalan No. xx, Kelurahan, Kecamatan, Kota" rows={2} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )} />

          <div className="grid grid-cols-2 gap-4">
            {/* Telepon */}
            <FormField control={form.control} name="telepon" render={({ field }) => (
              <FormItem>
                <FormLabel>No. HP <span className="text-destructive">*</span></FormLabel>
                <FormControl><Input placeholder="08xxxxxxxxxx" type="tel" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            {/* Email */}
            <FormField control={form.control} name="email" render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl><Input placeholder="contoh@email.com" type="email" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
          </div>

          {/* Alergi */}
          <FormField control={form.control} name="alergi" render={({ field }) => (
            <FormItem>
              <FormLabel>Riwayat Alergi</FormLabel>
              <FormControl>
                <Input placeholder="Penisilin, Seafood — kosongkan jika tidak ada" {...field} />
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
              onClick={() => append({ nama:'', nomorHP:'', hubungan:'LAINNYA', isPrimary: fields.length === 0 })}>
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
                className={`rounded-md border p-3 space-y-3 ${isPrimary ? 'border-blue-300 bg-blue-50/30' : ''}`}>
                <div className="flex items-center justify-between">
                  <span className={`text-xs font-medium ${isPrimary ? 'text-blue-700' : 'text-muted-foreground'}`}>
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
          <Button type="button" variant="outline">Batal</Button>
          <Button type="submit" disabled={isPending}>
            <UserPlus className="h-4 w-4 mr-2" />
            {isPending ? 'Menyimpan...' : 'Simpan Pasien'}
          </Button>
        </div>

      </form>
    </Form>
  );
}
```

---

## 13. Data Fetching — TanStack Query

> `@tanstack/react-query` sesuai `setup_awal.md`.

```typescript
// src/features/pasien/hooks/usePasien.ts
'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { toast } from '@/hooks/use-toast';      // shadcn/ui toast
import type { CreatePasienDTO, UpdatePasienDTO } from '../schemas/pasien.schema';

// Query Keys
export const pasienKeys = {
  all:    ['pasien'] as const,
  lists:  () => [...pasienKeys.all, 'list'] as const,
  list:   (p: object) => [...pasienKeys.lists(), p] as const,
  detail: (id: string) => [...pasienKeys.all, 'detail', id] as const,
};

// List
export function usePasienList(params?: {
  q?: string; tipe?: string; page?: number; limit?: number;
}) {
  return useQuery({
    queryKey: pasienKeys.list(params ?? {}),
    queryFn: async () => {
      const sp = new URLSearchParams();
      if (params?.q)     sp.set('q',     params.q);
      if (params?.tipe)  sp.set('tipe',  params.tipe);
      if (params?.page)  sp.set('page',  String(params.page));
      if (params?.limit) sp.set('limit', String(params.limit));
      const res = await fetch(`/api/pasien?${sp}`);
      if (!res.ok) throw new Error('Gagal memuat data pasien');
      return res.json();
    },
    staleTime: 30_000,
  });
}

// Detail
export function usePasienDetail(id: string) {
  return useQuery({
    queryKey: pasienKeys.detail(id),
    queryFn: async () => {
      const res = await fetch(`/api/pasien/${id}`);
      if (!res.ok) throw new Error('Pasien tidak ditemukan');
      return res.json();
    },
    enabled: !!id,
  });
}

// Create
export function useCreatePasien() {
  const qc     = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: async (data: CreatePasienDTO) => {
      const res = await fetch('/api/pasien', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? 'Gagal mendaftarkan pasien');
      }
      return res.json();
    },
    onSuccess: (pasien) => {
      qc.invalidateQueries({ queryKey: pasienKeys.lists() });
      toast({ title: 'Pasien berhasil didaftarkan', description: `NoRM: ${pasien.nomorRM}` });
      router.push(`/pasien/${pasien.id}`);
    },
    onError: (err: Error) => {
      toast({ title: 'Gagal mendaftarkan pasien', description: err.message, variant: 'destructive' });
    },
  });
}

// Update
export function useUpdatePasien(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: UpdatePasienDTO) => {
      const res = await fetch(`/api/pasien/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error ?? 'Gagal memperbarui'); }
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: pasienKeys.detail(id) });
      qc.invalidateQueries({ queryKey: pasienKeys.lists() });
      toast({ title: 'Data pasien berhasil diperbarui' });
    },
    onError: (err: Error) => {
      toast({ title: 'Gagal', description: err.message, variant: 'destructive' });
    },
  });
}

// Toggle aktif
export function useTogglePasienActive(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (isActive: boolean) => {
      const res = await fetch(`/api/pasien/${id}/toggle`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive }),
      });
      if (!res.ok) throw new Error('Gagal mengubah status pasien');
      return res.json();
    },
    onSuccess: (_, isActive) => {
      qc.invalidateQueries({ queryKey: pasienKeys.detail(id) });
      qc.invalidateQueries({ queryKey: pasienKeys.lists() });
      toast({ title: isActive ? 'Pasien diaktifkan' : 'Pasien dinonaktifkan' });
    },
  });
}

// Search debounced (untuk dropdown/combobox di form kunjungan)
export function usePasienSearch(q: string) {
  return useQuery({
    queryKey: ['pasien', 'search', q],
    queryFn: async () => {
      const res = await fetch(`/api/pasien/search?q=${encodeURIComponent(q)}`);
      if (!res.ok) throw new Error('Gagal mencari pasien');
      return res.json();
    },
    enabled: q.length >= 2,
    staleTime: 10_000,
  });
}
```

---

## 14. Hak Akses — RBAC

Tambahkan ke `rolePermissions` di `src/config/rbac.config.ts` (menyambung dari `masterdata_v1.md`):

```typescript
SUPER_ADMIN: {
  pasien:           ['create','read','update','delete'],
  'kontak-darurat': ['create','read','update','delete'],
},
ADMISSION: {
  pasien:           ['create','read','update'],
  'kontak-darurat': ['create','read','update','delete'],
},
DOKTER: {
  pasien:           ['read'],   // read-only, tidak bisa edit demografi
  'kontak-darurat': ['read'],
},
PERAWAT: {
  pasien:           ['create','read','update'],
  'kontak-darurat': ['read'],
},
KASIR: {
  pasien:           ['read'],   // hanya nama & NoRM untuk billing
},
APOTEKER: {
  pasien:           ['read'],   // hanya nama & NoRM untuk konteks resep
},
```

```typescript
// Tambahkan ke src/config/route-permissions.ts

'/pasien':                       ['SUPER_ADMIN','ADMISSION','DOKTER','PERAWAT','KASIR'],
'/pasien/tambah':                ['SUPER_ADMIN','ADMISSION','PERAWAT'],
'/pasien/[id]':                  ['SUPER_ADMIN','ADMISSION','DOKTER','PERAWAT'],
'/pasien/[id]/edit':             ['SUPER_ADMIN','ADMISSION','PERAWAT'],
'/api/pasien':                   ['SUPER_ADMIN','ADMISSION','DOKTER','PERAWAT','KASIR'],
'/api/pasien/*/kontak-darurat':  ['SUPER_ADMIN','ADMISSION'],
```

---

## 15. Struktur Folder

> Mengikuti struktur `setup_awal.md` — `src/app`, `src/features`, `src/lib`, `src/repositories`, `src/services`.

```
src/
├── app/
│   ├── (dashboard)/
│   │   └── pasien/
│   │       ├── page.tsx                # List pasien + search + filter
│   │       ├── tambah/
│   │       │   └── page.tsx            # Form registrasi baru
│   │       └── [id]/
│   │           ├── page.tsx            # Detail + riwayat kunjungan
│   │           └── edit/
│   │               └── page.tsx        # Form edit demografi
│   │
│   └── api/
│       └── pasien/
│           ├── route.ts                # GET list · POST create
│           ├── search/
│           │   └── route.ts            # GET quick search
│           └── [id]/
│               ├── route.ts            # GET detail · PUT update
│               ├── toggle/
│               │   └── route.ts        # PATCH aktif/nonaktif
│               └── kontak-darurat/
│                   ├── route.ts        # GET · POST
│                   └── [kid]/
│                       └── route.ts    # PUT · DELETE
│
├── features/
│   └── pasien/
│       ├── components/
│       │   ├── PasienForm.tsx          # RHF + Zod + shadcn/ui
│       │   ├── PasienTable.tsx         # shadcn Table + pagination
│       │   ├── PasienCard.tsx          # Card ringkasan
│       │   ├── KontakDaruratForm.tsx   # useFieldArray dynamic
│       │   ├── KontakDaruratList.tsx   # List di halaman detail
│       │   ├── NomorRMBadge.tsx        # Badge + Lucide IdCard icon
│       │   └── TipePasienBadge.tsx     # Badge WNI (Flag) / WNA (Globe)
│       ├── hooks/
│       │   └── usePasien.ts            # TanStack Query hooks
│       ├── schemas/
│       │   └── pasien.schema.ts        # Zod schemas + types
│       └── types/
│           └── pasien.types.ts         # TypeScript interfaces
│
├── lib/
│   └── generate-rm.ts                  # Auto-generate NoRM (Prisma tx)
│
├── repositories/
│   └── pasien.repository.ts            # Prisma queries
│
└── services/
    └── pasien.service.ts               # Business logic + audit log
```

---

## 16. User Stories & Business Rules

| ID | Persona | Skenario | Expected Behavior |
|----|---------|----------|-------------------|
| **US01** | Admission | Daftar pasien WNI | Pilih WNI → NIK + BPJS muncul. Submit tanpa NIK → error RHF |
| **US02** | Admission | Daftar pasien WNA | Pilih WNA → No. Paspor + Negara muncul, NIK & BPJS hilang |
| **US03** | Admission | Input NIK duplikat | Service error: "NIK sudah terdaftar atas nama Budi (RM-000001)" |
| **US04** | Admission | Simpan registrasi | NoRM auto `RM-000043` · toast sukses · redirect ke `/pasien/[id]` |
| **US05** | Admission | Tambah 2 kontak, keduanya primary | Zod error: "Hanya boleh satu kontak utama" |
| **US06** | Admission | Hapus kontak primary, masih ada kontak lain | Kontak tersisa otomatis menjadi primary |
| **US07** | Admission | No. HP kontak = No. HP pasien | Zod error di field `kontakDarurat.0.nomorHP` |
| **US08** | Dokter | Buka detail pasien | Tidak ada tombol Edit. Riwayat kunjungan + kontak darurat visible |
| **US09** | Kasir | Cari pasien untuk billing | Hanya nama, NoRM, telepon yang visible |
| **US10** | Admin | Nonaktifkan pasien meninggal | `isActive = false` · data tetap · audit log tercatat |
| **US11** | Admission | Scan QR NoRM dari kartu pasien | Quick search by `nomorRM` → buka `/pasien/[id]` |

---

## 17. Seed Data Awal

> Tambahkan ke `prisma/seed.ts` yang sudah ada dari `masterdata_v1.md`.

```typescript
// prisma/seed.ts — tambahkan dan panggil dari main()

async function seedPasien() {
  const list = [
    {
      nomorRM: 'RM-000001', nama: 'Budi Santoso',
      tempatLahir: 'Jakarta', tanggalLahir: new Date('1985-03-15'),
      jenisKelamin: 'LAKI_LAKI' as const, tipePasien: 'WNI' as const,
      nik: '3174051503850001',
      alamat: 'Jl. Merdeka No. 12, Kelurahan Gambir, Jakarta Pusat',
      telepon: '08123456789', email: 'budi.santoso@email.com',
      golonganDarah: 'A' as const, noBPJS: '0001234567890',
      kontakDarurat: [{
        nama: 'Siti Santoso', nomorHP: '08129876543',
        hubungan: 'ISTRI' as const, isPrimary: true,
      }],
    },
    {
      nomorRM: 'RM-000002', nama: 'John Smith',
      tempatLahir: 'New York', tanggalLahir: new Date('1990-07-22'),
      jenisKelamin: 'LAKI_LAKI' as const, tipePasien: 'WNA' as const,
      noPaspor: 'US123456', negaraAsal: 'Amerika Serikat',
      alamat: 'Jl. Sunset Road No. 88, Kuta, Bali',
      telepon: '081398765432', noAsuransi: 'INS-US-2024-001',
      kontakDarurat: [{
        nama: 'Jane Smith', nomorHP: '081312345678',
        hubungan: 'ISTRI' as const, isPrimary: true,
      }],
    },
    {
      nomorRM: 'RM-000003', nama: 'Ni Luh Ayu Dewi',
      tempatLahir: 'Denpasar', tanggalLahir: new Date('1995-11-08'),
      jenisKelamin: 'PEREMPUAN' as const, tipePasien: 'WNI' as const,
      nik: '5171086811950001',
      alamat: 'Jl. Raya Kuta No. 45, Banjar Pande, Denpasar',
      telepon: '082145678901', golonganDarah: 'O' as const,
      kontakDarurat: [
        { nama: 'I Wayan Dewi', nomorHP: '082198765432', hubungan: 'AYAH' as const, isPrimary: true },
        { nama: 'Ni Made Sari', nomorHP: '082187654321', hubungan: 'IBU'  as const, isPrimary: false },
      ],
    },
  ];

  for (const p of list) {
    const { kontakDarurat, ...fields } = p;
    await prisma.pasien.upsert({
      where:  { nomorRM: p.nomorRM },
      update: {},
      create: { ...fields, kontakDarurat: { create: kontakDarurat } },
    });
    console.log(`✓ Seeded: ${p.nama} [${p.tipePasien}] — ${p.nomorRM}`);
  }

  console.log(`\n✅ Seed pasien selesai (${list.length} data)`);
}

// Panggil di main():
// await seedPasien();
```

---

## Appendix — Ringkasan Stack & Pola

```
STACK (sesuai setup_awal.md):
  Next.js App Router     → Route Handlers + Server Actions
  TypeScript             → strict mode
  Tailwind CSS           → utility-first styling
  shadcn/ui              → Form, Input, Select, Textarea, Badge,
                           Card, RadioGroup, Toast
  React Hook Form        → useForm, useWatch, useFieldArray
  @hookform/resolvers    → zodResolver
  Zod                    → createPasienSchema, updatePasienSchema,
                           kontakDaruratSchema, superRefine kondisional
  TanStack Query         → usePasienList, usePasienDetail,
                           useCreatePasien, useUpdatePasien,
                           useTogglePasienActive, usePasienSearch
  Prisma ORM             → Repository Pattern
  PostgreSQL (Neon.tech)  → serverless
  NextAuth/Auth.js       → JWT + RBAC middleware
  bcryptjs               → (di auth, bukan di pasien)
  Lucide React           → IdCard, Globe, Flag, Plus, Trash2,
                           Star, UserPlus

POLA IMPLEMENTASI:
  src/app/api/pasien/    → Route Handlers
  src/services/          → pasien.service.ts (business logic)
  src/repositories/      → pasien.repository.ts (Prisma queries)
  src/features/pasien/   → components, hooks, schemas, types
  src/lib/               → generate-rm.ts
```

---

*setup_pasien.md v1.1.0 — Diselaraskan penuh dengan setup_awal.md.*  
*Menggunakan stack, struktur folder, naming convention, dan pola implementasi yang konsisten di seluruh project EMR.*
