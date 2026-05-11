# masterdata_v2.md
# Master Data V2 — Clinical & Asset Setup

| Info | Detail |
|:-----|:-------|
| **Versi** | 2.3-r1 (Optimized & Integrated) |
| **Status** | Final Draft |
| **Depends On** | `PRD_EMR_System.md` · `masterdata_v1.md v1.1.0` |
| **Changelog** | Integrasi penuh dengan Prisma schema EMR, RBAC v1.1, struktur folder & repository pattern yang sudah ada |

---

## Daftar Isi

1. [Ringkasan & Konteks Integrasi](#1-ringkasan--konteks-integrasi)
2. [Modul yang Dicakup](#2-modul-yang-dicakup)
3. [Business Rules & Access Logic](#3-business-rules--access-logic)
4. [Prisma Schema — Tambahan & Perubahan](#4-prisma-schema--tambahan--perubahan)
5. [Enum & Kategori Tindakan](#5-enum--kategori-tindakan)
6. [Search Engine Logic](#6-search-engine-logic)
7. [Repository Layer](#7-repository-layer)
8. [Service Layer](#8-service-layer)
9. [API Endpoints](#9-api-endpoints)
10. [Hak Akses per Role (RBAC)](#10-hak-akses-per-role-rbac)
11. [Struktur Folder Tambahan](#11-struktur-folder-tambahan)
12. [User Stories](#12-user-stories)
13. [Seed Data Awal](#13-seed-data-awal)

---

## 1. Ringkasan & Konteks Integrasi

### Posisi V2 dalam Project

```
PRD_EMR_System.md          → Arsitektur global, tech stack, schema dasar
    ↓
masterdata_v1.md           → User management, RBAC, reset password, blokir login
    ↓
masterdata_v2.md (ini)     → Clinical master data: Poli, Tindakan (lokal),
                             Lab, Radiologi, Peralatan Medis (global)
```

### Gap yang Diselesaikan V2

`PRD_EMR_System.md` sudah mendefinisikan model `MasterTindakan` dan `Poli`, namun belum ada:

- Pembedaan **kategori tindakan** (lokal vs global)
- Model untuk **Laboratorium**, **Radiologi**, dan **Peralatan Medis**
- **Mapping Tindakan ↔ Poli** (relasi many-to-many)
- **Search engine logic** yang memfilter berdasarkan `poliId` dokter yang login
- **Tracking penggunaan** aset/alat medis

V2 mengisi semua gap tersebut sebagai **addendum langsung ke schema dan layer yang sudah ada** — tidak membuat struktur baru yang bertentangan.

---

## 2. Modul yang Dicakup

| # | Modul | Tipe Akses | Deskripsi |
|---|-------|-----------|-----------|
| 1 | **Master Poliklinik** | — | Unit layanan medis. Sudah ada di schema v1, diperluas dengan relasi tindakan |
| 2 | **Master Tindakan** | 🔒 Lokal (mapped) | Prosedur medis spesifik poli. Dokter hanya lihat tindakan poli-nya sendiri |
| 3 | **Master Laboratorium** | 🌐 Global | Tes lab tersedia di semua poli tanpa mapping |
| 4 | **Master Radiologi** | 🌐 Global | Prosedur imaging tersedia di semua poli tanpa mapping |
| 5 | **Master Peralatan Medis** | 🌐 Global | Inventaris alat dengan tracking penggunaan per poli |

---

## 3. Business Rules & Access Logic

### 3.1 Tindakan — Local Access (Mapping Wajib)

```
Dokter di Poli Mata login
    ↓
Query tindakan WHERE poliId = "poli-mata-id"
    ↓
Hanya tampil: Funduskopi, Tonometri, Refraksi, dll.
    ↓
Tindakan Poli Bedah TIDAK muncul.
```

**Aturan:**
- Setiap `MasterTindakan` dengan `kategori = TINDAKAN` **wajib** memiliki minimal satu relasi ke `Poli` via tabel `TindakanPoli`
- Admin dapat memetakan satu tindakan ke **lebih dari satu poli** (many-to-many)
- Tindakan tanpa mapping poli tidak akan muncul di antarmuka dokter manapun

### 3.2 Laboratorium, Radiologi, Peralatan — Global Access (Tanpa Mapping)

```
Input item baru (Lab / Rad / Peralatan)
    ↓
Langsung tersedia di seluruh poli
    ↓
Tidak perlu aksi mapping oleh Admin
```

**Aturan:**
- Item dengan `kategori = LAB | RADIOLOGI` disimpan di tabel `ItemPenunjang` (tanpa kolom `poliId`)
- Item dengan `kategori = PERALATAN` disimpan di tabel `PeralatanMedis`
- Ketiganya dikembalikan oleh search engine **tanpa filter poliId**
- Peralatan tetap mencatat **poli mana yang sedang/terakhir menggunakannya** via `PenggunaanAlat`

### 3.3 Tabel Keputusan Akses

| Kategori | Model | Ada `poliId`? | Filter di Query? | Perlu Mapping? |
|----------|-------|:-------------:|:----------------:|:--------------:|
| `TINDAKAN` | `MasterTindakan` + `TindakanPoli` | ✅ (via relasi) | ✅ Ya | ✅ Wajib |
| `LAB` | `ItemPenunjang` | ❌ | ❌ Tidak | ❌ |
| `RADIOLOGI` | `ItemPenunjang` | ❌ | ❌ Tidak | ❌ |
| `PERALATAN` | `PeralatanMedis` | ❌ (tracking saja) | ❌ Tidak | ❌ |

---

## 4. Prisma Schema — Tambahan & Perubahan

> Semua model berikut adalah **addendum** terhadap `prisma/schema.prisma` yang sudah ada di `PRD_EMR_System.md`. Tidak ada model lama yang dihapus.

```prisma
// ─────────────────────────────────────────────────────────
// ENUM TAMBAHAN
// ─────────────────────────────────────────────────────────

enum KategoriItem {
  TINDAKAN    // Lokal — wajib mapping ke Poli
  LAB         // Global — tanpa mapping
  RADIOLOGI   // Global — tanpa mapping
  PERALATAN   // Global — dengan tracking penggunaan
}

enum StatusPeralatan {
  TERSEDIA
  DIGUNAKAN
  MAINTENANCE
  RUSAK
}

// ─────────────────────────────────────────────────────────
// PERUBAHAN: MasterTindakan (EXTEND dari schema EMR v1)
// Tambahkan field kategori & relasi many-to-many ke Poli
// ─────────────────────────────────────────────────────────

// BEFORE (PRD_EMR_System.md):
// model MasterTindakan {
//   id       String  @id @default(cuid())
//   kode     String  @unique
//   nama     String
//   tarif    Float
//   kategori String?    ← tipe String, tidak terstruktur
//   tindakan Tindakan[]
// }

// AFTER (v2 — ganti seluruh model ini):
model MasterTindakan {
  id          String         @id @default(cuid())
  kode        String         @unique
  nama        String
  deskripsi   String?
  tarif       Float
  tarifBPJS   Float?         // Tarif khusus BPJS jika berbeda
  kategori    KategoriItem   @default(TINDAKAN)
  isActive    Boolean        @default(true)
  createdAt   DateTime       @default(now())
  updatedAt   DateTime       @updatedAt

  // Relasi ke Tindakan (transaksi) — sudah ada di EMR v1
  tindakan    Tindakan[]

  // Relasi many-to-many ke Poli — BARU di v2
  // Hanya berlaku jika kategori = TINDAKAN
  poliMapping TindakanPoli[]

  @@map("master_tindakan")
}

// PERUBAHAN: Poli (EXTEND dari schema EMR v1)
// Tambah relasi ke TindakanPoli
model Poli {
  id          String         @id @default(cuid())
  nama        String
  kode        String         @unique
  deskripsi   String?
  lantai      String?        // Lokasi fisik, contoh: "Lantai 2 Gedung A"
  isActive    Boolean        @default(true)
  createdAt   DateTime       @default(now())
  updatedAt   DateTime       @updatedAt

  // Relasi existing (EMR v1)
  dokter      DokterProfile[]  // via DokterProfile.poliId
  kunjungan   Kunjungan[]

  // Relasi baru (v2)
  tindakanMapping TindakanPoli[]
  penggunaanAlat  PenggunaanAlat[]

  @@map("poli")
}

// ─────────────────────────────────────────────────────────
// BARU: Tabel Mapping Tindakan ↔ Poli (many-to-many)
// ─────────────────────────────────────────────────────────

model TindakanPoli {
  id               String         @id @default(cuid())
  masterTindakanId String
  poliId           String
  createdAt        DateTime       @default(now())

  masterTindakan   MasterTindakan @relation(fields: [masterTindakanId], references: [id], onDelete: Cascade)
  poli             Poli           @relation(fields: [poliId], references: [id], onDelete: Cascade)

  @@unique([masterTindakanId, poliId])   // Cegah duplikat mapping
  @@map("tindakan_poli")
}

// ─────────────────────────────────────────────────────────
// BARU: Item Penunjang — Lab & Radiologi (Global)
// ─────────────────────────────────────────────────────────

model ItemPenunjang {
  id          String       @id @default(cuid())
  kode        String       @unique
  nama        String
  deskripsi   String?
  kategori    KategoriItem // Hanya LAB atau RADIOLOGI
  tarif       Float
  tarifBPJS   Float?
  satuanWaktu String?      // Contoh: "2 jam", "1 hari kerja"
  isActive    Boolean      @default(true)
  createdAt   DateTime     @default(now())
  updatedAt   DateTime     @updatedAt

  // Relasi ke permintaan penunjang dari kunjungan
  permintaan  PermintaanPenunjang[]

  @@map("item_penunjang")
}

// ─────────────────────────────────────────────────────────
// BARU: Permintaan Penunjang (Lab/Rad) dari Kunjungan
// Menggantikan peran Tindakan untuk item penunjang
// ─────────────────────────────────────────────────────────

enum StatusPenunjang {
  DIPESAN
  DIPROSES
  SELESAI
  DIBATALKAN
}

model PermintaanPenunjang {
  id              String          @id @default(cuid())
  kunjunganId     String
  itemPenunjangId String
  jumlah          Int             @default(1)
  catatan         String?
  status          StatusPenunjang @default(DIPESAN)
  hasilUrl        String?         // Link hasil lab/rad (PDF/image)
  createdAt       DateTime        @default(now())
  updatedAt       DateTime        @updatedAt

  kunjungan       Kunjungan       @relation(fields: [kunjunganId], references: [id])
  itemPenunjang   ItemPenunjang   @relation(fields: [itemPenunjangId], references: [id])

  @@map("permintaan_penunjang")
}

// ─────────────────────────────────────────────────────────
// BARU: Peralatan Medis (Global, dengan tracking)
// ─────────────────────────────────────────────────────────

model PeralatanMedis {
  id              String          @id @default(cuid())
  kode            String          @unique
  nama            String
  merk            String?
  nomorSeri       String?         @unique
  deskripsi       String?
  status          StatusPeralatan @default(TERSEDIA)
  lokasiTerakhir  String?         // Nama ruang/gedung saat ini
  poliTerakhirId  String?         // Poli yang terakhir menggunakan
  tanggalKalibrasi DateTime?
  createdAt       DateTime        @default(now())
  updatedAt       DateTime        @updatedAt

  riwayatPenggunaan PenggunaanAlat[]

  @@map("peralatan_medis")
}

// ─────────────────────────────────────────────────────────
// BARU: Riwayat Penggunaan Peralatan per Poli
// ─────────────────────────────────────────────────────────

model PenggunaanAlat {
  id             String          @id @default(cuid())
  peralatanId    String
  poliId         String
  kunjunganId    String?         // Opsional: terkait ke kunjungan tertentu
  dipakaiOleh    String?         // Nama/ID user yang menggunakan
  waktuMulai     DateTime        @default(now())
  waktuSelesai   DateTime?
  catatan        String?

  peralatan      PeralatanMedis  @relation(fields: [peralatanId], references: [id])
  poli           Poli            @relation(fields: [poliId], references: [id])

  @@map("penggunaan_alat")
}
```

### Perubahan pada Model `Kunjungan` (addendum)

Tambahkan relasi ke `PermintaanPenunjang` di model `Kunjungan` yang sudah ada:

```prisma
// Tambahkan satu baris relasi di model Kunjungan yang sudah ada:
model Kunjungan {
  // ... semua field existing tetap ...

  permintaanPenunjang PermintaanPenunjang[]   // ← tambahkan baris ini
}
```

---

## 5. Enum & Kategori Tindakan

### Pembagian Kategori di UI

```
MasterTindakan (kategori = TINDAKAN)
├── Contoh: Pemasangan Infus, Jahit Luka, EKG, Pemeriksaan Fisik Umum
└── Perilaku: Filter by poliId dokter yang login

ItemPenunjang (kategori = LAB)
├── Contoh: Darah Lengkap, Urinalisis, HbA1C, Kultur Darah
└── Perilaku: Tampil semua (global)

ItemPenunjang (kategori = RADIOLOGI)
├── Contoh: Foto Thorax, USG Abdomen, CT-Scan Kepala, MRI Lumbal
└── Perilaku: Tampil semua (global)

PeralatanMedis
├── Contoh: Oxymeter, Tensimeter Digital, Nebulizer, ECG Monitor
└── Perilaku: Tampil semua (global) + tracking poli penggunaan
```

---

## 6. Search Engine Logic

Ini adalah inti dari business rule v2. Query tunggal yang menggabungkan tindakan lokal + penunjang global, dijalankan saat dokter membuka form order.

### 6.1 Alur Query

```
Dokter membuka form order di kunjungan
    ↓
Frontend kirim: GET /api/masterdata/search?q=...&poliId=xxx
    ↓
Backend jalankan UNION dari dua sumber:
    │
    ├─ [A] MasterTindakan WHERE kategori=TINDAKAN
    │       AND poliMapping.some({ poliId: session.user.poliId })
    │       AND isActive = true
    │
    └─ [B] ItemPenunjang WHERE kategori IN [LAB, RADIOLOGI]
            AND isActive = true
    ↓
Merge & urutkan berdasarkan relevance (nama ILIKE query)
    ↓
Return unified response dengan field `sumber` untuk membedakan
```

### 6.2 Implementasi Query (Prisma)

```typescript
// src/repositories/masterdata.repository.ts

export const masterdataRepository = {

  /**
   * Search engine utama — gabungkan tindakan lokal + penunjang global.
   * Dipanggil dari halaman order dokter saat input form SOAP/plan.
   */
  async searchOrderable(params: {
    q?: string;
    poliId: string;       // Wajib — dari session dokter yang login
    limit?: number;
  }) {
    const { q = '', poliId, limit = 30 } = params;
    const likeQ = `%${q}%`;

    // [A] Tindakan lokal — filter by poliId
    const tindakan = await prisma.masterTindakan.findMany({
      where: {
        kategori: 'TINDAKAN',
        isActive: true,
        nama: { contains: q, mode: 'insensitive' },
        poliMapping: {
          some: { poliId },             // ← filter utama
        },
      },
      select: {
        id: true, kode: true, nama: true,
        tarif: true, tarifBPJS: true, kategori: true,
      },
      take: limit,
    });

    // [B] Penunjang global — Lab & Radiologi
    const penunjang = await prisma.itemPenunjang.findMany({
      where: {
        kategori: { in: ['LAB', 'RADIOLOGI'] },
        isActive: true,
        nama: { contains: q, mode: 'insensitive' },
      },
      select: {
        id: true, kode: true, nama: true,
        tarif: true, tarifBPJS: true,
        kategori: true, satuanWaktu: true,
      },
      take: limit,
    });

    // Merge & tandai sumber
    return [
      ...tindakan.map(t => ({ ...t, sumber: 'TINDAKAN' as const })),
      ...penunjang.map(p => ({ ...p, sumber: 'PENUNJANG' as const })),
    ].sort((a, b) => a.nama.localeCompare(b.nama));
  },

  // ─── Tindakan Poli ───────────────────────────────────────

  async getTindakanByPoli(poliId: string) {
    return prisma.masterTindakan.findMany({
      where: {
        kategori: 'TINDAKAN',
        isActive: true,
        poliMapping: { some: { poliId } },
      },
      orderBy: { nama: 'asc' },
    });
  },

  // ─── Penunjang Global ────────────────────────────────────

  async getAllPenunjang(kategori?: 'LAB' | 'RADIOLOGI') {
    return prisma.itemPenunjang.findMany({
      where: {
        isActive: true,
        ...(kategori ? { kategori } : { kategori: { in: ['LAB', 'RADIOLOGI'] } }),
      },
      orderBy: { nama: 'asc' },
    });
  },

  // ─── Peralatan Medis Global ──────────────────────────────

  async getAllPeralatan(status?: string) {
    return prisma.peralatanMedis.findMany({
      where: {
        ...(status ? { status: status as any } : {}),
      },
      orderBy: { nama: 'asc' },
    });
  },

  async catatPenggunaanAlat(data: {
    peralatanId: string;
    poliId: string;
    kunjunganId?: string;
    dipakaiOleh?: string;
  }) {
    // Update status peralatan & catat riwayat
    return prisma.$transaction([
      prisma.peralatanMedis.update({
        where: { id: data.peralatanId },
        data: {
          status: 'DIGUNAKAN',
          poliTerakhirId: data.poliId,
        },
      }),
      prisma.penggunaanAlat.create({ data }),
    ]);
  },

  async selesaiPenggunaanAlat(penggunaanId: string) {
    const p = await prisma.penggunaanAlat.update({
      where: { id: penggunaanId },
      data: { waktuSelesai: new Date() },
    });
    await prisma.peralatanMedis.update({
      where: { id: p.peralatanId },
      data: { status: 'TERSEDIA' },
    });
    return p;
  },

  // ─── Mapping Tindakan ↔ Poli ─────────────────────────────

  async mapTindakanToPoli(masterTindakanId: string, poliIds: string[]) {
    // Upsert — jika sudah ada tidak error, jika belum ada dibuat
    return prisma.tindakanPoli.createMany({
      data: poliIds.map(poliId => ({ masterTindakanId, poliId })),
      skipDuplicates: true,
    });
  },

  async unmapTindakanFromPoli(masterTindakanId: string, poliId: string) {
    return prisma.tindakanPoli.delete({
      where: { masterTindakanId_poliId: { masterTindakanId, poliId } },
    });
  },

  async getMappingByTindakan(masterTindakanId: string) {
    return prisma.tindakanPoli.findMany({
      where: { masterTindakanId },
      include: { poli: { select: { id: true, nama: true, kode: true } } },
    });
  },
};
```

---

## 7. Service Layer

```typescript
// src/services/masterdata.service.ts

import { masterdataRepository } from '@/repositories/masterdata.repository';
import { prisma } from '@/lib/prisma';

export const masterdataService = {

  // ─── Search Engine untuk Dokter ──────────────────────────

  async searchOrderable(q: string, poliId: string) {
    if (!poliId) throw new Error('poliId wajib ada untuk melakukan pencarian tindakan');
    return masterdataRepository.searchOrderable({ q, poliId, limit: 40 });
  },

  // ─── Master Tindakan (Lokal) ─────────────────────────────

  async createTindakan(data: {
    kode: string; nama: string; tarif: number;
    tarifBPJS?: number; deskripsi?: string; poliIds: string[];
  }) {
    if (data.poliIds.length === 0) {
      throw new Error('Tindakan wajib dipetakan ke minimal satu Poli');
    }
    const tindakan = await prisma.masterTindakan.create({
      data: {
        kode: data.kode,
        nama: data.nama,
        tarif: data.tarif,
        tarifBPJS: data.tarifBPJS,
        deskripsi: data.deskripsi,
        kategori: 'TINDAKAN',
      },
    });
    await masterdataRepository.mapTindakanToPoli(tindakan.id, data.poliIds);
    return tindakan;
  },

  async updateMappingTindakan(tindakanId: string, poliIds: string[]) {
    // Hapus semua mapping lama, buat ulang
    await prisma.tindakanPoli.deleteMany({ where: { masterTindakanId: tindakanId } });
    await masterdataRepository.mapTindakanToPoli(tindakanId, poliIds);
  },

  // ─── Item Penunjang (Global) ──────────────────────────────

  async createPenunjang(data: {
    kode: string; nama: string; tarif: number;
    kategori: 'LAB' | 'RADIOLOGI';
    tarifBPJS?: number; deskripsi?: string; satuanWaktu?: string;
  }) {
    return prisma.itemPenunjang.create({ data });
  },

  // ─── Peralatan Medis (Global) ─────────────────────────────

  async createPeralatan(data: {
    kode: string; nama: string; merk?: string;
    nomorSeri?: string; deskripsi?: string;
  }) {
    return prisma.peralatanMedis.create({ data });
  },

  async getPeralatanAll() {
    return masterdataRepository.getAllPeralatan();
  },

  async pakaiAlat(data: {
    peralatanId: string;
    poliId: string;
    kunjunganId?: string;
    dipakaiOleh?: string;
  }) {
    const alat = await prisma.peralatanMedis.findUnique({
      where: { id: data.peralatanId },
    });
    if (!alat) throw new Error('Peralatan tidak ditemukan');
    if (alat.status === 'DIGUNAKAN') {
      throw new Error(`Alat sedang digunakan di poli lain (terakhir: ${alat.poliTerakhirId})`);
    }
    if (alat.status === 'MAINTENANCE' || alat.status === 'RUSAK') {
      throw new Error(`Alat tidak dapat digunakan: status ${alat.status}`);
    }
    return masterdataRepository.catatPenggunaanAlat(data);
  },

  async selesaiPakaiAlat(penggunaanId: string) {
    return masterdataRepository.selesaiPenggunaanAlat(penggunaanId);
  },

  // ─── Permintaan Penunjang dari Kunjungan ──────────────────

  async buatPermintaanPenunjang(data: {
    kunjunganId: string;
    items: Array<{ itemPenunjangId: string; jumlah?: number; catatan?: string }>;
  }) {
    return prisma.permintaanPenunjang.createMany({
      data: data.items.map(item => ({
        kunjunganId: data.kunjunganId,
        itemPenunjangId: item.itemPenunjangId,
        jumlah: item.jumlah ?? 1,
        catatan: item.catatan,
      })),
    });
  },

  async updateStatusPenunjang(id: string, status: string, hasilUrl?: string) {
    return prisma.permintaanPenunjang.update({
      where: { id },
      data: { status: status as any, ...(hasilUrl ? { hasilUrl } : {}) },
    });
  },
};
```

---

## 8. Zod Schemas

```typescript
// src/features/masterdata/schemas/masterdata.schema.ts

import { z } from 'zod';

export const createTindakanSchema = z.object({
  kode:       z.string().min(2, 'Kode minimal 2 karakter').toUpperCase(),
  nama:       z.string().min(3, 'Nama minimal 3 karakter'),
  tarif:      z.number().positive('Tarif harus lebih dari 0'),
  tarifBPJS:  z.number().positive().optional(),
  deskripsi:  z.string().optional(),
  poliIds:    z.array(z.string()).min(1, 'Pilih minimal satu Poli'),
});

export const createPenunjangSchema = z.object({
  kode:        z.string().min(2).toUpperCase(),
  nama:        z.string().min(3),
  kategori:    z.enum(['LAB', 'RADIOLOGI']),
  tarif:       z.number().positive(),
  tarifBPJS:   z.number().positive().optional(),
  deskripsi:   z.string().optional(),
  satuanWaktu: z.string().optional(),
});

export const createPeralatanSchema = z.object({
  kode:       z.string().min(2).toUpperCase(),
  nama:       z.string().min(3),
  merk:       z.string().optional(),
  nomorSeri:  z.string().optional(),
  deskripsi:  z.string().optional(),
});

export const updateMappingSchema = z.object({
  poliIds: z.array(z.string()).min(1, 'Minimal satu Poli wajib dipilih'),
});

export const permintaanPenunjangSchema = z.object({
  kunjunganId: z.string(),
  items: z.array(z.object({
    itemPenunjangId: z.string(),
    jumlah:          z.number().int().positive().default(1),
    catatan:         z.string().optional(),
  })).min(1, 'Minimal satu item penunjang'),
});
```

---

## 9. API Endpoints

### 9.1 Master Tindakan (Lokal)

| Method | Endpoint | Deskripsi | Role |
|--------|----------|-----------|------|
| `GET` | `/api/masterdata/tindakan` | List semua tindakan + mapping poli | `SUPER_ADMIN` |
| `POST` | `/api/masterdata/tindakan` | Buat tindakan baru + mapping poli | `SUPER_ADMIN` |
| `PUT` | `/api/masterdata/tindakan/:id` | Update data tindakan | `SUPER_ADMIN` |
| `PUT` | `/api/masterdata/tindakan/:id/mapping` | Update mapping poli | `SUPER_ADMIN` |
| `DELETE` | `/api/masterdata/tindakan/:id` | Hapus / nonaktifkan tindakan | `SUPER_ADMIN` |
| `GET` | `/api/masterdata/tindakan/poli/:poliId` | Tindakan milik poli tertentu | `SUPER_ADMIN`, `DOKTER`, `PERAWAT` |

### 9.2 Item Penunjang (Global)

| Method | Endpoint | Deskripsi | Role |
|--------|----------|-----------|------|
| `GET` | `/api/masterdata/penunjang` | List semua Lab + Rad | `SUPER_ADMIN`, `DOKTER` |
| `GET` | `/api/masterdata/penunjang?kategori=LAB` | Filter hanya Lab | `SUPER_ADMIN`, `DOKTER` |
| `GET` | `/api/masterdata/penunjang?kategori=RADIOLOGI` | Filter hanya Rad | `SUPER_ADMIN`, `DOKTER` |
| `POST` | `/api/masterdata/penunjang` | Tambah item Lab/Rad | `SUPER_ADMIN` |
| `PUT` | `/api/masterdata/penunjang/:id` | Update item | `SUPER_ADMIN` |
| `PATCH` | `/api/masterdata/penunjang/:id/toggle` | Aktif / nonaktif | `SUPER_ADMIN` |

### 9.3 Peralatan Medis (Global)

| Method | Endpoint | Deskripsi | Role |
|--------|----------|-----------|------|
| `GET` | `/api/masterdata/peralatan` | List semua peralatan + status | `SUPER_ADMIN`, semua role |
| `POST` | `/api/masterdata/peralatan` | Tambah peralatan baru | `SUPER_ADMIN` |
| `PUT` | `/api/masterdata/peralatan/:id` | Update data peralatan | `SUPER_ADMIN` |
| `POST` | `/api/masterdata/peralatan/:id/pakai` | Catat mulai penggunaan | `DOKTER`, `PERAWAT` |
| `PATCH` | `/api/masterdata/peralatan/:id/selesai` | Catat selesai penggunaan | `DOKTER`, `PERAWAT` |
| `GET` | `/api/masterdata/peralatan/:id/riwayat` | Riwayat penggunaan alat | `SUPER_ADMIN` |

### 9.4 Search Engine (Unified)

| Method | Endpoint | Deskripsi | Role |
|--------|----------|-----------|------|
| `GET` | `/api/masterdata/search?q=&poliId=` | Search tindakan lokal + penunjang global | `DOKTER`, `PERAWAT` |

### 9.5 Permintaan Penunjang

| Method | Endpoint | Deskripsi | Role |
|--------|----------|-----------|------|
| `POST` | `/api/penunjang/permintaan` | Buat order lab/rad dari kunjungan | `DOKTER` |
| `GET` | `/api/penunjang/permintaan/:kunjunganId` | List order per kunjungan | `DOKTER`, `PERAWAT` |
| `PATCH` | `/api/penunjang/permintaan/:id/status` | Update status + upload hasil | `SUPER_ADMIN`, petugas lab/rad |

---

## 10. Hak Akses per Role (RBAC)

Tambahkan resource dan permission berikut ke `rolePermissions` di `src/config/rbac.config.ts` (menyambung dari `masterdata_v1.md`):

```typescript
// TAMBAHAN ke rolePermissions di rbac.config.ts

const masterdataV2Permissions: Partial<Record<string, Permissions>> = {
  SUPER_ADMIN: {
    // Semua masterdata — full CRUD
    'masterdata:tindakan':   ['create', 'read', 'update', 'delete'],
    'masterdata:penunjang':  ['create', 'read', 'update', 'delete'],
    'masterdata:peralatan':  ['create', 'read', 'update', 'delete'],
    'masterdata:poli':       ['create', 'read', 'update', 'delete'],
    'masterdata:mapping':    ['create', 'read', 'update', 'delete'],
  },

  DOKTER: {
    // Baca & order — tidak bisa tambah/edit master
    'masterdata:tindakan':  ['read'],   // Hanya poli sendiri (filter by poliId)
    'masterdata:penunjang': ['read'],   // Semua lab & rad
    'masterdata:peralatan': ['read'],   // Lihat daftar + status
    'penunjang:permintaan': ['create', 'read'],
    'peralatan:pakai':      ['create'],
  },

  PERAWAT: {
    'masterdata:tindakan':  ['read'],
    'masterdata:peralatan': ['read'],
    'peralatan:pakai':      ['create'],
  },

  KASIR: {
    'masterdata:tindakan':  ['read'],   // Untuk keperluan kalkulasi billing
    'masterdata:penunjang': ['read'],
    'masterdata:peralatan': ['read'],
  },

  ADMISSION: {
    'masterdata:poli': ['read'],        // Untuk pemilihan poli saat daftar
  },

  APOTEKER: {
    // Tidak perlu akses masterdata klinis
  },
};
```

### Tambahan Route Permission

```typescript
// Tambahkan ke routePermissions di src/config/route-permissions.ts

'/pengaturan/masterdata/tindakan':  ['SUPER_ADMIN'],
'/pengaturan/masterdata/penunjang': ['SUPER_ADMIN'],
'/pengaturan/masterdata/peralatan': ['SUPER_ADMIN'],
'/pengaturan/masterdata/poli':      ['SUPER_ADMIN'],
'/api/masterdata/search':           ['SUPER_ADMIN', 'DOKTER', 'PERAWAT'],
'/api/masterdata/peralatan/*/pakai':['SUPER_ADMIN', 'DOKTER', 'PERAWAT'],
```

---

## 11. Struktur Folder Tambahan

Tambahkan ke struktur folder yang sudah ada di `PRD_EMR_System.md`:

```
src/
├── app/
│   ├── (dashboard)/
│   │   └── pengaturan/
│   │       └── masterdata/                  # ← Tambah section ini
│   │           ├── layout.tsx               # Tab nav: Poli | Tindakan | Lab | Rad | Peralatan
│   │           ├── poli/
│   │           │   └── page.tsx
│   │           ├── tindakan/
│   │           │   ├── page.tsx             # List + filter poli
│   │           │   └── [id]/
│   │           │       └── mapping/
│   │           │           └── page.tsx     # Kelola mapping poli
│   │           ├── penunjang/
│   │           │   └── page.tsx             # Tab: Lab | Radiologi
│   │           └── peralatan/
│   │               ├── page.tsx             # List + status real-time
│   │               └── [id]/
│   │                   └── riwayat/
│   │                       └── page.tsx
│   │
│   └── api/
│       ├── masterdata/
│       │   ├── search/
│       │   │   └── route.ts                 # GET — unified search
│       │   ├── tindakan/
│       │   │   ├── route.ts
│       │   │   └── [id]/
│       │   │       ├── route.ts
│       │   │       └── mapping/
│       │   │           └── route.ts
│       │   ├── penunjang/
│       │   │   ├── route.ts
│       │   │   └── [id]/
│       │   │       └── route.ts
│       │   └── peralatan/
│       │       ├── route.ts
│       │       └── [id]/
│       │           ├── route.ts
│       │           ├── pakai/
│       │           │   └── route.ts
│       │           ├── selesai/
│       │           │   └── route.ts
│       │           └── riwayat/
│       │               └── route.ts
│       └── penunjang/
│           └── permintaan/
│               ├── route.ts
│               └── [id]/
│                   └── route.ts
│
├── features/
│   └── masterdata/                          # ← Tambah feature folder
│       ├── components/
│       │   ├── TindakanTable.tsx
│       │   ├── TindakanForm.tsx
│       │   ├── PoliMappingSelector.tsx      # Multi-select checkbox poli
│       │   ├── PenunjangTable.tsx
│       │   ├── PenunjangForm.tsx
│       │   ├── PeralatanTable.tsx
│       │   ├── PeralatanStatusBadge.tsx
│       │   └── OrderItemSearch.tsx          # Search box unified untuk dokter
│       ├── hooks/
│       │   ├── useMasterdataSearch.ts       # TanStack Query + debounce
│       │   └── usePeralatan.ts
│       ├── schemas/
│       │   └── masterdata.schema.ts
│       └── types/
│           └── masterdata.types.ts
│
└── repositories/
    └── masterdata.repository.ts             # ← File baru (lihat Section 7)
```

---

## 12. User Stories

| ID | Persona | Skenario | Expected Behavior |
|----|---------|----------|-------------------|
| **US01** | Super Admin | Menambah alat "Oxymeter" baru ke katalog | Alat langsung tersedia di semua poli tanpa perlu mapping manual. Status default: `TERSEDIA` |
| **US02** | Super Admin | Menambah tindakan "Tonometri" untuk Poli Mata | Wajib memilih poli. Jika tidak memilih poli, form error: *"Tindakan wajib dipetakan ke minimal satu Poli"* |
| **US03** | Super Admin | Menambah poli baru "Poli Saraf" | Poli langsung tersedia untuk mapping tindakan. Penunjang (Lab/Rad) otomatis tersedia tanpa aksi tambahan |
| **US04** | Dokter Poli Mata | Membuka form order di kunjungan | Search box menampilkan: tindakan Poli Mata saja + semua item Lab + semua item Rad |
| **US05** | Dokter Poli Mata | Mengetik "Darah" di search order | Muncul: "Darah Lengkap (Lab)", "Darah Rutin (Lab)" — bukan tindakan poli lain |
| **US06** | Dokter Poli Bedah | Membuka form order | Hanya muncul tindakan Poli Bedah. Tindakan Poli Mata tidak terlihat |
| **US07** | Dokter | Merujuk pasien untuk USG Abdomen | Semua opsi Radiologi muncul tanpa Admin perlu setting mapping |
| **US08** | Perawat | Mencatat penggunaan Nebulizer untuk Poli Anak | Alat status berubah ke `DIGUNAKAN`, poli tercatat di riwayat |
| **US09** | Perawat | Mencoba pakai Nebulizer yang sedang `DIGUNAKAN` | Sistem menolak: *"Alat sedang digunakan di poli lain"* |
| **US10** | Super Admin | Melihat riwayat penggunaan ECG Monitor | Tampil log: tanggal, poli, kunjungan, durasi penggunaan |

---

## 13. Seed Data Awal

```typescript
// Tambahkan ke prisma/seed.ts yang sudah ada

async function seedMasterdataV2() {

  // ── Poli ──────────────────────────────────────────────
  const poliData = [
    { nama: 'Poli Umum',      kode: 'PU',  lantai: 'Lantai 1' },
    { nama: 'Poli Mata',      kode: 'PM',  lantai: 'Lantai 1' },
    { nama: 'Poli Gigi',      kode: 'PG',  lantai: 'Lantai 2' },
    { nama: 'Poli Bedah',     kode: 'PB',  lantai: 'Lantai 2' },
    { nama: 'Poli Anak',      kode: 'PA',  lantai: 'Lantai 1' },
    { nama: 'Poli Kebidanan', kode: 'PKB', lantai: 'Lantai 3' },
  ];

  const poli = await Promise.all(
    poliData.map(p => prisma.poli.upsert({
      where:  { kode: p.kode },
      update: {},
      create: p,
    }))
  );
  const poliMap = Object.fromEntries(poli.map(p => [p.kode, p.id]));
  console.log(`✓ Seeded ${poli.length} Poli`);

  // ── Tindakan (Lokal — dengan mapping) ─────────────────
  const tindakanData = [
    { kode:'T001', nama:'Pemeriksaan Fisik Umum', tarif:50000,  poliKodes:['PU','PA','PKB'] },
    { kode:'T002', nama:'Pemeriksaan Visus',      tarif:75000,  poliKodes:['PM'] },
    { kode:'T003', nama:'Tonometri',              tarif:100000, poliKodes:['PM'] },
    { kode:'T004', nama:'Ekstraksi Gigi',         tarif:150000, poliKodes:['PG'] },
    { kode:'T005', nama:'Pemasangan Tambal Gigi', tarif:200000, poliKodes:['PG'] },
    { kode:'T006', nama:'Pemasangan Infus',        tarif:85000,  poliKodes:['PU','PB','PA','PKB'] },
    { kode:'T007', nama:'Jahit Luka',              tarif:120000, poliKodes:['PU','PB'] },
    { kode:'T008', nama:'Sirkumsisi',              tarif:500000, poliKodes:['PB'] },
    { kode:'T009', nama:'USG Obstetri',            tarif:250000, poliKodes:['PKB'] },
    { kode:'T010', nama:'Nebulisasi',              tarif:60000,  poliKodes:['PU','PA'] },
  ];

  for (const t of tindakanData) {
    const tindakan = await prisma.masterTindakan.upsert({
      where:  { kode: t.kode },
      update: {},
      create: { kode: t.kode, nama: t.nama, tarif: t.tarif, kategori: 'TINDAKAN' },
    });
    await prisma.tindakanPoli.createMany({
      data: t.poliKodes.map(k => ({ masterTindakanId: tindakan.id, poliId: poliMap[k] })),
      skipDuplicates: true,
    });
  }
  console.log(`✓ Seeded ${tindakanData.length} Tindakan + mapping`);

  // ── Lab (Global) ───────────────────────────────────────
  const labData = [
    { kode:'L001', nama:'Darah Lengkap',        tarif:85000,  satuanWaktu:'2 jam' },
    { kode:'L002', nama:'Urinalisis',           tarif:45000,  satuanWaktu:'1 jam' },
    { kode:'L003', nama:'Gula Darah Sewaktu',   tarif:30000,  satuanWaktu:'30 menit' },
    { kode:'L004', nama:'HbA1C',                tarif:120000, satuanWaktu:'3 jam' },
    { kode:'L005', nama:'Fungsi Ginjal (Ureum/Kreatinin)', tarif:95000, satuanWaktu:'2 jam' },
    { kode:'L006', nama:'Fungsi Hati (SGOT/SGPT)', tarif:95000, satuanWaktu:'2 jam' },
    { kode:'L007', nama:'Profil Lipid',         tarif:110000, satuanWaktu:'3 jam' },
    { kode:'L008', nama:'Kultur Darah',         tarif:250000, satuanWaktu:'5 hari kerja' },
  ];

  await prisma.itemPenunjang.createMany({
    data: labData.map(l => ({ ...l, kategori: 'LAB' as const })),
    skipDuplicates: true,
  });
  console.log(`✓ Seeded ${labData.length} Item Lab`);

  // ── Radiologi (Global) ─────────────────────────────────
  const radData = [
    { kode:'R001', nama:'Foto Thorax PA',      tarif:150000, satuanWaktu:'1 jam' },
    { kode:'R002', nama:'USG Abdomen',         tarif:300000, satuanWaktu:'30 menit' },
    { kode:'R003', nama:'CT-Scan Kepala',      tarif:900000, satuanWaktu:'2 jam' },
    { kode:'R004', nama:'MRI Lumbal',          tarif:2500000,satuanWaktu:'2 jam' },
    { kode:'R005', nama:'EKG 12 Lead',         tarif:120000, satuanWaktu:'30 menit' },
    { kode:'R006', nama:'Foto Panoramik Gigi', tarif:200000, satuanWaktu:'30 menit' },
  ];

  await prisma.itemPenunjang.createMany({
    data: radData.map(r => ({ ...r, kategori: 'RADIOLOGI' as const })),
    skipDuplicates: true,
  });
  console.log(`✓ Seeded ${radData.length} Item Radiologi`);

  // ── Peralatan Medis (Global) ───────────────────────────
  const peralatanData = [
    { kode:'A001', nama:'Oxymeter',             merk:'Contec',    nomorSeri:'CX8001' },
    { kode:'A002', nama:'Tensimeter Digital',   merk:'Omron',     nomorSeri:'OM7200' },
    { kode:'A003', nama:'Nebulizer',            merk:'Omron',     nomorSeri:'NEB001' },
    { kode:'A004', nama:'ECG Monitor 12 Lead', merk:'GE Healthcare', nomorSeri:'GE1200' },
    { kode:'A005', nama:'Glucometer',           merk:'Accu-Check', nomorSeri:'AC4500' },
    { kode:'A006', nama:'Infusion Pump',        merk:'Terumo',    nomorSeri:'TE2200' },
  ];

  await prisma.peralatanMedis.createMany({
    data: peralatanData,
    skipDuplicates: true,
  });
  console.log(`✓ Seeded ${peralatanData.length} Peralatan Medis`);
  console.log('\n✅ Seed masterdata_v2 selesai.');
}

// Panggil dari fungsi main():
// await seedMasterdataV2();
```

---

## Appendix — Diagram Relasi Antar Model

```
User (DOKTER)
    └── DokterProfile.poliId ──────────────────────► Poli
                                                       │
                                              TindakanPoli (many-to-many)
                                                       │
                                              MasterTindakan (kategori=TINDAKAN)
                                                       │
                                              Tindakan (transaksi)
                                                       │
Kunjungan ─────────────────────────────────────────────┤
    ├── tindakan[]          → Tindakan
    └── permintaanPenunjang → PermintaanPenunjang ──► ItemPenunjang (LAB/RADIOLOGI)

PeralatanMedis (global)
    └── PenggunaanAlat ──────────────────────────────► Poli
                       └──────────────────────────────► Kunjungan (opsional)

QUERY FLOW DOKTER:
session.user.poliId → filter TindakanPoli → MasterTindakan (LOKAL)
                    + ItemPenunjang [LAB, RADIOLOGI] (GLOBAL)
                    = Unified search result
```

---

*masterdata_v2.md — Addendum terhadap PRD_EMR_System.md dan masterdata_v1.md.*  
*Seluruh schema, repository, dan service di dokumen ini bersifat tambahan — tidak menghapus atau menggantikan yang sudah ada.*
