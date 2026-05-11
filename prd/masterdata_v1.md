# masterdata_v1.md
# Master Data — User Management & Role Access Mapping

**Versi:** 1.1.0  
**Scope:** Super Admin Panel  
**Modul:** User Management + RBAC Configuration  
**Changelog v1.1.0:** Tambah fitur Reset Password oleh Admin + Blokir Login User Nonaktif

---

## Daftar Isi

1. [Definisi Role](#1-definisi-role)
2. [Struktur Data User](#2-struktur-data-user)
3. [Mapping Hak Akses per Role](#3-mapping-hak-akses-per-role)
4. [Konfigurasi RBAC (Kode)](#4-konfigurasi-rbac-kode)
5. [Prisma Schema — User & Role](#5-prisma-schema--user--role)
6. [Repository — User Management](#6-repository--user-management)
7. [Service — User Management](#7-service--user-management)
8. [API Endpoint — User Management](#8-api-endpoint--user-management)
9. [**Reset Password oleh Admin**](#9-reset-password-oleh-admin) ⭐ Baru
10. [**Blokir Login User Nonaktif**](#10-blokir-login-user-nonaktif) ⭐ Baru
11. [UI Pages — Super Admin](#11-ui-pages--super-admin)
12. [Seed Data Awal](#12-seed-data-awal)

---

## 1. Definisi Role

| Kode Role | Label UI | Deskripsi Fungsi |
|-----------|----------|-----------------|
| `SUPER_ADMIN` | Super Admin | Administrator tertinggi, full akses sistem + konfigurasi global |
| `ADMISSION` | Admission | Pendaftaran pasien, manajemen antrean, data demografi |
| `KASIR` | Kasir | Billing, pembayaran, cetak invoice & kwitansi |
| `DOKTER` | Dokter | SOAP note, diagnosis ICD-10, resep elektronik |
| `PERAWAT` | Perawat | Asesmen awal, tanda vital, tindakan keperawatan |
| `APOTEKER` | Apoteker | Validasi resep, dispensing obat, manajemen stok farmasi |

> **Catatan:** Role `SUPER_ADMIN` tidak muncul di form pendaftaran user biasa. Hanya bisa di-assign langsung dari panel Super Admin atau via database seed.

---

## 2. Struktur Data User

### Model User (Lengkap)

```typescript
// src/types/user.types.ts

export type Role =
  | 'SUPER_ADMIN'
  | 'ADMISSION'
  | 'KASIR'
  | 'DOKTER'
  | 'PERAWAT'
  | 'APOTEKER';

export interface User {
  id: string;
  nama: string;
  email: string;
  password?: string;         // Tidak dikirim ke client
  role: Role;
  isActive: boolean;
  nip?: string;              // Nomor Induk Pegawai
  telepon?: string;
  foto?: string;
  // Relasi opsional berdasarkan role
  dokterProfile?: DokterProfile;
  createdAt: Date;
  updatedAt: Date;
}

export interface DokterProfile {
  sip: string;               // Surat Izin Praktik
  spesialisasi?: string;
  poliId?: string;
  jadwalPraktek?: JadwalPraktek;
}

export interface JadwalPraktek {
  senin?: string[];          // ["08:00", "14:00"]
  selasa?: string[];
  rabu?: string[];
  kamis?: string[];
  jumat?: string[];
  sabtu?: string[];
  minggu?: string[];
}

export interface CreateUserDTO {
  nama: string;
  email: string;
  password: string;
  role: Role;
  nip?: string;
  telepon?: string;
  // Khusus dokter
  sip?: string;
  spesialisasi?: string;
  poliId?: string;
}

export interface UpdateUserDTO {
  nama?: string;
  email?: string;
  role?: Role;
  nip?: string;
  telepon?: string;
  isActive?: boolean;
}
```

---

## 3. Mapping Hak Akses per Role

### Legenda

| Simbol | Arti |
|--------|------|
| ✅ | Full access (CRUD) |
| 👁 | Read only |
| ✏️ | Create & Read |
| 🔒 | Tidak ada akses |
| 🔑 | Akses data sendiri saja |

---

### 3.1 Matrix Akses per Modul

| Modul / Fitur | Super Admin | Admission | Kasir | Dokter | Perawat | Apoteker |
|--------------|:-----------:|:---------:|:-----:|:------:|:-------:|:--------:|
| **Dashboard** | ✅ | 👁 | 👁 | 👁 | 👁 | 👁 |
| **Manajemen User** | ✅ | 🔒 | 🔒 | 🔒 | 🔒 | 🔒 |
| **Konfigurasi Sistem** | ✅ | 🔒 | 🔒 | 🔒 | 🔒 | 🔒 |
| **Master Poli** | ✅ | 👁 | 🔒 | 👁 | 👁 | 🔒 |
| **Master Tindakan** | ✅ | 🔒 | 👁 | 👁 | 👁 | 🔒 |
| **Pendaftaran Pasien** | ✅ | ✅ | 🔒 | 🔒 | ✏️ | 🔒 |
| **Antrean** | ✅ | ✅ | 👁 | 👁 | 👁 | 🔒 |
| **Asesmen Perawat** | ✅ | 🔒 | 🔒 | 👁 | ✅ | 🔒 |
| **SOAP Note** | ✅ | 🔒 | 🔒 | ✅ | 👁 | 🔒 |
| **Diagnosa ICD-10** | ✅ | 🔒 | 🔒 | ✅ | 👁 | 🔒 |
| **Resep Elektronik** | ✅ | 🔒 | 🔒 | ✏️ | 👁 | ✅ |
| **Stok Obat** | ✅ | 🔒 | 🔒 | 👁 | 🔒 | ✅ |
| **Rawat Inap** | ✅ | ✏️ | 👁 | ✅ | ✅ | 🔒 |
| **Billing & Invoice** | ✅ | 🔒 | ✅ | 🔒 | 🔒 | 🔒 |
| **Pembayaran** | ✅ | 🔒 | ✅ | 🔒 | 🔒 | 🔒 |
| **Laporan Keuangan** | ✅ | 🔒 | 👁 | 🔒 | 🔒 | 🔒 |
| **Laporan Medis** | ✅ | 🔒 | 🔒 | 🔑 | 🔒 | 🔒 |
| **Laporan Farmasi** | ✅ | 🔒 | 🔒 | 🔒 | 🔒 | 👁 |
| **Audit Log** | ✅ | 🔒 | 🔒 | 🔒 | 🔒 | 🔒 |

---

### 3.2 Detail Hak Akses — Admission

```
MODUL YANG BISA DIAKSES:
✅ Pendaftaran Pasien Baru (CRUD)
✅ Pencarian Pasien (nama, NIK, nomor RM)
✅ Edit Data Demografi Pasien
✅ Manajemen Antrean (tambah, panggil, skip)
✅ Pemilihan Poli & Dokter
✅ Cetak Nomor Antrean
✅ Status Kunjungan (lihat & update: MENUNGGU ↔ DIBATALKAN)
👁 Jadwal Praktik Dokter (read only)
👁 Daftar Poli (read only)

TIDAK BISA DIAKSES:
🔒 SOAP Note / Rekam Medis
🔒 Resep & Farmasi
🔒 Billing & Pembayaran
🔒 Laporan
🔒 Manajemen User
```

---

### 3.3 Detail Hak Akses — Kasir

```
MODUL YANG BISA DIAKSES:
✅ Billing — buat, lihat, update tagihan
✅ Pembayaran — proses semua metode (tunai, transfer, BPJS, asuransi)
✅ Cetak Invoice & Kwitansi
✅ Rekap Pendapatan Harian
👁 Data Pasien (nama, nomor RM — hanya untuk keperluan billing)
👁 Daftar Kunjungan Hari Ini
👁 Laporan Keuangan Ringkasan

TIDAK BISA DIAKSES:
🔒 Data Medis Pasien (SOAP, diagnosa, resep)
🔒 Pendaftaran / Antrean
🔒 Farmasi
🔒 Manajemen User
```

---

### 3.4 Detail Hak Akses — Dokter

```
MODUL YANG BISA DIAKSES:
✅ SOAP Note — buat & edit (kunjungan hari ini)
✅ Diagnosa ICD-10 — input kode & deskripsi
✅ Resep Elektronik — buat & lihat
✅ Tindakan Medis — input tindakan
✅ Riwayat Kunjungan Pasien — read semua
✅ Asesmen Perawat — read (untuk referensi)
✅ Rawat Inap — admisi, update CPPT
🔑 Laporan Aktivitas Dokter Sendiri
👁 Jadwal Praktik Sendiri

TIDAK BISA DIAKSES:
🔒 Edit Data Demografi Pasien
🔒 Billing & Pembayaran
🔒 Stok Obat
🔒 Manajemen User
```

---

### 3.5 Detail Hak Akses — Perawat

```
MODUL YANG BISA DIAKSES:
✅ Asesmen Perawat — buat & edit (tanda vital, anamnesis awal)
✅ Input Tindakan Keperawatan
✅ Update Status Kunjungan (MENUNGGU → DALAM_PEMERIKSAAN)
✅ Pendaftaran Pasien Baru (darurat / bantuan admission)
✅ Data Pasien — buat & edit demografi
✅ Rawat Inap — input catatan keperawatan harian
👁 SOAP Note Dokter (read only, untuk kolaborasi)
👁 Antrean Pasien
👁 Resep Elektronik (read only)

TIDAK BISA DIAKSES:
🔒 SOAP Note — tidak bisa buat/edit
🔒 Diagnosa ICD-10
🔒 Resep — tidak bisa buat/edit
🔒 Billing & Pembayaran
🔒 Manajemen User
```

---

### 3.6 Detail Hak Akses — Apoteker

```
MODUL YANG BISA DIAKSES:
✅ Validasi & Verifikasi Resep
✅ Dispensing Obat (update status resep: MENUNGGU → DIPROSES → SIAP → DIAMBIL)
✅ Manajemen Stok Obat (CRUD)
✅ Input & Update Data Obat (nama, stok, harga, expired)
✅ Alert Stok Minimum & Obat Expired
✅ Laporan Penggunaan Obat
✅ Retur & Penyesuaian Stok
👁 Data Pasien (nama, nomor RM — hanya untuk konteks resep)
👁 SOAP Note (read only — untuk referensi diagnosa)

TIDAK BISA DIAKSES:
🔒 Buat/Edit Resep (hanya dokter)
🔒 Billing & Pembayaran
🔒 Data Medis Pasien (anamnesis, tanda vital)
🔒 Manajemen User
```

---

## 4. Konfigurasi RBAC (Kode)

### 4.1 Definisi Permissions

```typescript
// src/config/rbac.config.ts

export type Action = 'create' | 'read' | 'update' | 'delete' | 'read:own';

export type Resource =
  | 'user'
  | 'pasien'
  | 'kunjungan'
  | 'antrean'
  | 'asesmen'
  | 'soap'
  | 'diagnosa'
  | 'resep'
  | 'obat'
  | 'tindakan'
  | 'rawatInap'
  | 'billing'
  | 'pembayaran'
  | 'laporan:keuangan'
  | 'laporan:medis'
  | 'laporan:farmasi'
  | 'masterdata'
  | 'pengaturan'
  | 'auditLog';

export type Permissions = Partial<Record<Resource, Action[]>>;

export const rolePermissions: Record<string, Permissions> = {
  SUPER_ADMIN: {
    user:              ['create', 'read', 'update', 'delete'],
    pasien:            ['create', 'read', 'update', 'delete'],
    kunjungan:         ['create', 'read', 'update', 'delete'],
    antrean:           ['create', 'read', 'update', 'delete'],
    asesmen:           ['create', 'read', 'update', 'delete'],
    soap:              ['create', 'read', 'update', 'delete'],
    diagnosa:          ['create', 'read', 'update', 'delete'],
    resep:             ['create', 'read', 'update', 'delete'],
    obat:              ['create', 'read', 'update', 'delete'],
    tindakan:          ['create', 'read', 'update', 'delete'],
    rawatInap:         ['create', 'read', 'update', 'delete'],
    billing:           ['create', 'read', 'update', 'delete'],
    pembayaran:        ['create', 'read', 'update', 'delete'],
    'laporan:keuangan':['create', 'read'],
    'laporan:medis':   ['create', 'read'],
    'laporan:farmasi': ['create', 'read'],
    masterdata:        ['create', 'read', 'update', 'delete'],
    pengaturan:        ['create', 'read', 'update', 'delete'],
    auditLog:          ['read'],
  },

  ADMISSION: {
    pasien:    ['create', 'read', 'update'],
    kunjungan: ['create', 'read', 'update'],
    antrean:   ['create', 'read', 'update'],
  },

  KASIR: {
    pasien:             ['read'],
    kunjungan:          ['read'],
    billing:            ['create', 'read', 'update'],
    pembayaran:         ['create', 'read'],
    'laporan:keuangan': ['read'],
  },

  DOKTER: {
    pasien:    ['read'],
    kunjungan: ['read', 'update'],
    asesmen:   ['read'],
    soap:      ['create', 'read', 'update'],
    diagnosa:  ['create', 'read', 'update'],
    resep:     ['create', 'read', 'update'],
    tindakan:  ['create', 'read'],
    rawatInap: ['create', 'read', 'update'],
    obat:      ['read'],
    'laporan:medis': ['read:own'],
  },

  PERAWAT: {
    pasien:    ['create', 'read', 'update'],
    kunjungan: ['create', 'read', 'update'],
    antrean:   ['read'],
    asesmen:   ['create', 'read', 'update'],
    soap:      ['read'],
    resep:     ['read'],
    tindakan:  ['create', 'read'],
    rawatInap: ['create', 'read', 'update'],
  },

  APOTEKER: {
    pasien:            ['read'],
    resep:             ['read', 'update'],
    obat:              ['create', 'read', 'update', 'delete'],
    soap:              ['read'],
    'laporan:farmasi': ['read'],
  },
};
```

---

### 4.2 Helper — Cek Permission

```typescript
// src/lib/permissions.ts

import { rolePermissions, Action, Resource } from '@/config/rbac.config';

/**
 * Cek apakah role tertentu memiliki akses ke resource dan action
 */
export function hasPermission(
  role: string,
  resource: Resource,
  action: Action
): boolean {
  if (role === 'SUPER_ADMIN') return true;
  const perms = rolePermissions[role];
  if (!perms) return false;
  return perms[resource]?.includes(action) ?? false;
}

/**
 * Hook React untuk cek permission
 */
// src/hooks/usePermission.ts
import { useSession } from 'next-auth/react';
import { hasPermission } from '@/lib/permissions';

export function usePermission(resource: Resource, action: Action): boolean {
  const { data: session } = useSession();
  if (!session?.user?.role) return false;
  return hasPermission(session.user.role, resource, action);
}
```

---

### 4.3 Middleware Route Guard

```typescript
// src/config/route-permissions.ts

import { Role } from '@/types/user.types';

/**
 * Mapping path prefix ke role yang diizinkan.
 * Middleware akan cek ini sebelum render halaman.
 */
export const routePermissions: Record<string, Role[]> = {
  // Super Admin only
  '/pengaturan/pengguna':    ['SUPER_ADMIN'],
  '/pengaturan/sistem':      ['SUPER_ADMIN'],
  '/pengaturan/masterdata':  ['SUPER_ADMIN'],
  '/audit-log':              ['SUPER_ADMIN'],

  // Admission
  '/pendaftaran':            ['SUPER_ADMIN', 'ADMISSION', 'PERAWAT'],
  '/antrean':                ['SUPER_ADMIN', 'ADMISSION', 'PERAWAT', 'DOKTER', 'KASIR'],

  // Klinis
  '/pemeriksaan':            ['SUPER_ADMIN', 'DOKTER', 'PERAWAT'],
  '/rawat-inap':             ['SUPER_ADMIN', 'DOKTER', 'PERAWAT', 'ADMISSION'],

  // Farmasi
  '/farmasi':                ['SUPER_ADMIN', 'APOTEKER', 'DOKTER'],
  '/farmasi/stok-obat':      ['SUPER_ADMIN', 'APOTEKER'],

  // Keuangan
  '/billing':                ['SUPER_ADMIN', 'KASIR'],
  '/pembayaran':             ['SUPER_ADMIN', 'KASIR'],

  // Laporan
  '/laporan/keuangan':       ['SUPER_ADMIN', 'KASIR'],
  '/laporan/medis':          ['SUPER_ADMIN', 'DOKTER'],
  '/laporan/farmasi':        ['SUPER_ADMIN', 'APOTEKER'],
};
```

---

## 5. Prisma Schema — User & Role

```prisma
// prisma/schema.prisma (bagian User)

enum Role {
  SUPER_ADMIN
  ADMISSION
  KASIR
  DOKTER
  PERAWAT
  APOTEKER
}

model User {
  id          String    @id @default(cuid())
  nama        String
  email       String    @unique
  password    String
  role        Role      @default(ADMISSION)
  nip         String?   @unique
  telepon     String?
  foto        String?
  isActive    Boolean   @default(true)
  lastLoginAt DateTime?
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt

  dokterProfile DokterProfile?
  activityLogs  ActivityLog[]

  @@map("users")
}

model DokterProfile {
  id           String  @id @default(cuid())
  userId       String  @unique
  sip          String?
  spesialisasi String?
  poliId       String?

  user         User    @relation(fields: [userId], references: [id], onDelete: Cascade)
  poli         Poli?   @relation(fields: [poliId], references: [id])

  @@map("dokter_profile")
}

model ActivityLog {
  id         String   @id @default(cuid())
  userId     String
  action     String   // CREATE_USER, UPDATE_PASIEN, dll
  resource   String
  resourceId String?
  detail     Json?
  ipAddress  String?
  userAgent  String?
  createdAt  DateTime @default(now())

  user       User     @relation(fields: [userId], references: [id])

  @@map("activity_logs")
}
```

---

## 6. Repository — User Management

```typescript
// src/repositories/user.repository.ts

import { prisma } from '@/lib/prisma';
import { CreateUserDTO, UpdateUserDTO } from '@/types/user.types';

export const userRepository = {

  async findAll(params?: {
    role?: string;
    isActive?: boolean;
    search?: string;
    page?: number;
    limit?: number;
  }) {
    const { role, isActive, search, page = 1, limit = 20 } = params ?? {};
    const where = {
      ...(role ? { role: role as any } : {}),
      ...(isActive !== undefined ? { isActive } : {}),
      ...(search ? {
        OR: [
          { nama: { contains: search, mode: 'insensitive' as const } },
          { email: { contains: search, mode: 'insensitive' as const } },
          { nip: { contains: search, mode: 'insensitive' as const } },
        ],
      } : {}),
    };

    const [data, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true, nama: true, email: true, role: true,
          nip: true, telepon: true, isActive: true,
          lastLoginAt: true, createdAt: true,
          dokterProfile: {
            select: { sip: true, spesialisasi: true, poliId: true }
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.user.count({ where }),
    ]);

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  },

  async findById(id: string) {
    return prisma.user.findUnique({
      where: { id },
      select: {
        id: true, nama: true, email: true, role: true,
        nip: true, telepon: true, foto: true, isActive: true,
        lastLoginAt: true, createdAt: true, updatedAt: true,
        dokterProfile: true,
      },
    });
  },

  async findByEmail(email: string) {
    return prisma.user.findUnique({ where: { email } });
  },

  async create(data: CreateUserDTO & { hashedPassword: string }) {
    return prisma.user.create({
      data: {
        nama: data.nama,
        email: data.email,
        password: data.hashedPassword,
        role: data.role as any,
        nip: data.nip,
        telepon: data.telepon,
        ...(data.role === 'DOKTER' && data.sip ? {
          dokterProfile: {
            create: {
              sip: data.sip,
              spesialisasi: data.spesialisasi,
              poliId: data.poliId,
            },
          },
        } : {}),
      },
    });
  },

  async update(id: string, data: UpdateUserDTO) {
    return prisma.user.update({
      where: { id },
      data: {
        ...data,
        role: data.role as any,
      },
    });
  },

  async toggleActive(id: string, isActive: boolean) {
    return prisma.user.update({
      where: { id },
      data: { isActive },
    });
  },

  async resetPassword(id: string, hashedPassword: string) {
    return prisma.user.update({
      where: { id },
      data: { password: hashedPassword },
    });
  },

  async delete(id: string) {
    return prisma.user.delete({ where: { id } });
  },
};
```

---

## 7. Service — User Management

```typescript
// src/services/user.service.ts

import bcrypt from 'bcryptjs';
import { userRepository } from '@/repositories/user.repository';
import { CreateUserDTO, UpdateUserDTO } from '@/types/user.types';

export const userService = {

  async getAll(params?: Parameters<typeof userRepository.findAll>[0]) {
    return userRepository.findAll(params);
  },

  async getById(id: string) {
    const user = await userRepository.findById(id);
    if (!user) throw new Error('User tidak ditemukan');
    return user;
  },

  async create(dto: CreateUserDTO) {
    // Cek email duplikat
    const existing = await userRepository.findByEmail(dto.email);
    if (existing) throw new Error('Email sudah digunakan');

    // Hash password
    const hashedPassword = await bcrypt.hash(dto.password, 12);

    return userRepository.create({ ...dto, hashedPassword });
  },

  async update(id: string, dto: UpdateUserDTO) {
    await userRepository.findById(id); // validasi exists
    return userRepository.update(id, dto);
  },

  async toggleActive(id: string, isActive: boolean) {
    return userRepository.toggleActive(id, isActive);
  },

  async resetPassword(id: string, newPassword: string) {
    // Validasi user exists sebelum reset
    const user = await userRepository.findById(id);
    if (!user) throw new Error('User tidak ditemukan');
    // Super Admin tidak boleh di-reset oleh admin lain
    if (user.role === 'SUPER_ADMIN') throw new Error('Password Super Admin tidak dapat direset melalui panel ini');
    const hashedPassword = await bcrypt.hash(newPassword, 12);
    await userRepository.resetPassword(id, hashedPassword);
    // Catat di audit log
    await userRepository.logActivity({
      userId: id,
      action: 'RESET_PASSWORD_BY_ADMIN',
      resource: 'user',
      resourceId: id,
      detail: { targetEmail: user.email },
    });
    return { success: true, message: 'Password berhasil direset' };
  },

  async delete(id: string) {
    return userRepository.delete(id);
  },
};
```

---

## 8. API Endpoint — User Management

| Method | Endpoint | Deskripsi | Role |
|--------|----------|-----------|------|
| `GET` | `/api/users` | List semua user (filter: role, isActive, search) | SUPER_ADMIN |
| `POST` | `/api/users` | Tambah user baru + assign role | SUPER_ADMIN |
| `GET` | `/api/users/:id` | Detail user | SUPER_ADMIN |
| `PUT` | `/api/users/:id` | Update data user & role | SUPER_ADMIN |
| `PATCH` | `/api/users/:id/toggle` | Aktifkan / nonaktifkan user | SUPER_ADMIN |
| `PATCH` | `/api/users/:id/reset-password` | Reset password user | SUPER_ADMIN |
| `DELETE` | `/api/users/:id` | Hapus user (soft delete) | SUPER_ADMIN |
| `GET` | `/api/users/roles` | Daftar role & jumlah user per role | SUPER_ADMIN |

### Contoh Route Handler

```typescript
// src/app/api/users/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { userService } from '@/services/user.service';
import { createUserSchema } from '@/features/user/schemas/user.schema';

export async function GET(req: NextRequest) {
  const session = await auth();
  if (session?.user?.role !== 'SUPER_ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const result = await userService.getAll({
    role:     searchParams.get('role') ?? undefined,
    isActive: searchParams.get('isActive') === 'true' ? true
            : searchParams.get('isActive') === 'false' ? false
            : undefined,
    search:   searchParams.get('search') ?? undefined,
    page:     Number(searchParams.get('page') ?? 1),
    limit:    Number(searchParams.get('limit') ?? 20),
  });

  return NextResponse.json(result);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (session?.user?.role !== 'SUPER_ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await req.json();
  const validated = createUserSchema.safeParse(body);
  if (!validated.success) {
    return NextResponse.json({ error: validated.error.flatten() }, { status: 400 });
  }

  const user = await userService.create(validated.data);
  return NextResponse.json(user, { status: 201 });
}
```

---

## 9. Reset Password oleh Admin

Fitur ini memungkinkan Super Admin me-reset password user mana pun tanpa perlu mengetahui password lama. Password baru di-generate otomatis (atau diisi manual), lalu dikirim ke user via tampilan sekali lihat / notifikasi.

### 9.1 Aturan Bisnis

| Kondisi | Perilaku |
|---------|----------|
| Target = SUPER_ADMIN | ❌ Ditolak — password SA tidak bisa direset via panel |
| Target user nonaktif | ✅ Boleh direset, tapi user tetap tidak bisa login sampai diaktifkan kembali |
| Password baru < 8 karakter | ❌ Validasi Zod gagal, request ditolak |
| Reset berhasil | ✅ Dicatat di audit log + session aktif user di-invalidate |

### 9.2 Zod Schema — Reset Password

```typescript
// src/features/user/schemas/user.schema.ts

export const resetPasswordSchema = z.object({
  newPassword: z
    .string()
    .min(8, 'Password minimal 8 karakter')
    .regex(/[A-Z]/, 'Harus mengandung huruf kapital')
    .regex(/[0-9]/, 'Harus mengandung angka')
    .regex(/[^A-Za-z0-9]/, 'Harus mengandung karakter spesial (@, #, !, dll)'),
  confirmPassword: z.string(),
}).refine((d) => d.newPassword === d.confirmPassword, {
  message: 'Konfirmasi password tidak cocok',
  path: ['confirmPassword'],
});
```

### 9.3 Route Handler — Reset Password

```typescript
// src/app/api/users/[id]/reset-password/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { userService } from '@/services/user.service';
import { resetPasswordSchema } from '@/features/user/schemas/user.schema';

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();

  // Hanya Super Admin yang boleh reset password user lain
  if (session?.user?.role !== 'SUPER_ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await req.json();
  const validated = resetPasswordSchema.safeParse(body);

  if (!validated.success) {
    return NextResponse.json(
      { error: validated.error.flatten() },
      { status: 400 }
    );
  }

  try {
    const result = await userService.resetPassword(
      params.id,
      validated.data.newPassword
    );
    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 422 });
  }
}
```

### 9.4 Invalidate Session Setelah Reset Password

Setelah password direset, semua session aktif user tersebut harus dihapus agar user terpaksa login ulang dengan password baru.

```typescript
// Tambahkan di userRepository.resetPassword

async resetPassword(id: string, hashedPassword: string) {
  // 1. Update password
  await prisma.user.update({
    where: { id },
    data: { password: hashedPassword },
  });

  // 2. Hapus semua session aktif user ini
  await prisma.session.deleteMany({
    where: { userId: id },
  });
},
```

> Dengan NextAuth JWT strategy, token yang sudah di-issue tidak bisa di-revoke secara langsung. Solusinya: tambahkan field `passwordChangedAt` di model User, lalu bandingkan di JWT callback — jika token di-issue sebelum `passwordChangedAt`, anggap session tidak valid.

```typescript
// Tambah field di Prisma schema
model User {
  // ... field lain
  passwordChangedAt DateTime?   // Diupdate setiap kali password berubah
}

// prisma/schema.prisma — update resetPassword di repository
await prisma.user.update({
  where: { id },
  data: {
    password: hashedPassword,
    passwordChangedAt: new Date(),   // ← tandai waktu perubahan
  },
});

// src/lib/auth.ts — validasi di JWT callback
callbacks: {
  async jwt({ token, user, trigger }) {
    if (user) {
      token.role = user.role;
      token.isActive = user.isActive;
      token.passwordChangedAt = user.passwordChangedAt?.getTime() ?? 0;
    }
    // Cek apakah password sudah diubah setelah token di-issue
    if (token.sub && trigger !== 'signIn') {
      const dbUser = await prisma.user.findUnique({
        where: { id: token.sub },
        select: { passwordChangedAt: true, isActive: true },
      });
      const changedAt = dbUser?.passwordChangedAt?.getTime() ?? 0;
      const issuedAt  = (token.iat as number) * 1000;
      if (changedAt > issuedAt || !dbUser?.isActive) {
        // Token tidak valid lagi — paksa logout
        return null;
      }
    }
    return token;
  },
},
```

---

## 10. Blokir Login User Nonaktif

User dengan `isActive = false` **tidak boleh login** ke sistem sama sekali. Pemblokiran diterapkan di dua lapis: validasi saat autentikasi (`authorize`) dan validasi ulang di JWT callback setiap request.

### 10.1 Lapis 1 — Blokir di `authorize` (NextAuth Credentials)

```typescript
// src/lib/auth.ts

import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: 'jwt' },
  providers: [
    Credentials({
      async authorize(credentials) {
        const user = await prisma.user.findUnique({
          where: { email: credentials.email as string },
        });

        // ✅ Cek: user ada
        if (!user) return null;

        // 🔒 Cek: user aktif — jika nonaktif, tolak login
        if (!user.isActive) {
          // Melempar error dengan pesan spesifik agar bisa ditampilkan di UI
          throw new Error('ACCOUNT_DISABLED');
        }

        // ✅ Cek: password benar
        const valid = await bcrypt.compare(
          credentials.password as string,
          user.password
        );
        if (!valid) return null;

        // Update lastLoginAt
        await prisma.user.update({
          where: { id: user.id },
          data: { lastLoginAt: new Date() },
        });

        return {
          id:   user.id,
          name: user.nama,
          email: user.email,
          role: user.role,
          isActive: user.isActive,
        };
      },
    }),
  ],

  callbacks: {
    async jwt({ token, user, trigger }) {
      // Saat pertama login
      if (user) {
        token.role     = (user as any).role;
        token.isActive = (user as any).isActive;
      }

      // Validasi ulang setiap request (selain saat signIn)
      // Mencegah user yang baru dinonaktifkan tetap bisa menggunakan session lama
      if (token.sub && trigger !== 'signIn') {
        const dbUser = await prisma.user.findUnique({
          where: { id: token.sub },
          select: { isActive: true, passwordChangedAt: true },
        });

        // Jika user dinonaktifkan atau password sudah diganti → invalidate token
        if (!dbUser?.isActive) return null;

        const changedAt = dbUser.passwordChangedAt?.getTime() ?? 0;
        const issuedAt  = (token.iat as number) * 1000;
        if (changedAt > issuedAt) return null;
      }

      return token;
    },

    async session({ session, token }) {
      if (!token) return session; // token null → session tidak valid
      session.user.role     = token.role as string;
      session.user.isActive = token.isActive as boolean;
      return session;
    },
  },

  pages: {
    signIn: '/login',
    error:  '/login',
  },
});
```

### 10.2 Lapis 2 — Blokir di Middleware (Route Protection)

```typescript
// src/middleware.ts

import { auth } from '@/lib/auth';
import { NextResponse } from 'next/server';

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const session = req.auth;

  // Halaman publik yang tidak perlu autentikasi
  const publicPaths = ['/login', '/api/auth'];
  if (publicPaths.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // Belum login → redirect ke login
  if (!session?.user) {
    return NextResponse.redirect(new URL('/login', req.url));
  }

  // ✅ Cek isActive dari session — user nonaktif diblokir
  // (session sudah null jika JWT callback return null, tapi ini sebagai safety net)
  if (!session.user.isActive) {
    return NextResponse.redirect(new URL('/login?error=ACCOUNT_DISABLED', req.url));
  }

  // Cek permission role untuk route tertentu
  // ... (lihat rbac.config.ts)

  return NextResponse.next();
});

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
```

### 10.3 Tampilkan Pesan Error di Halaman Login

```typescript
// src/app/(auth)/login/page.tsx

'use client';
import { useSearchParams } from 'next/navigation';

const ERROR_MESSAGES: Record<string, string> = {
  ACCOUNT_DISABLED:   'Akun Anda telah dinonaktifkan. Hubungi administrator.',
  CredentialsSignin:  'Email atau password salah.',
  default:            'Terjadi kesalahan. Silakan coba lagi.',
};

export default function LoginPage() {
  const searchParams = useSearchParams();
  const error = searchParams.get('error') ?? '';
  const errorMsg = ERROR_MESSAGES[error] ?? ERROR_MESSAGES.default;

  return (
    <div>
      {error && (
        <div className="rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {errorMsg}
        </div>
      )}
      {/* ... form login */}
    </div>
  );
}
```

### 10.4 Alur Lengkap — User Dinonaktifkan Saat Sedang Login

```
Admin nonaktifkan user
        ↓
isActive = false di database
        ↓
User masih punya JWT session aktif
        ↓
Request berikutnya → JWT callback berjalan
        ↓
prisma.user.findUnique → isActive = false
        ↓
JWT callback return null → session invalid
        ↓
Middleware redirect ke /login?error=ACCOUNT_DISABLED
        ↓
Halaman login tampilkan: "Akun Anda telah dinonaktifkan"
```

### 10.5 Extend NextAuth TypeScript Types

```typescript
// src/types/next-auth.d.ts

import { DefaultSession, DefaultJWT } from 'next-auth';

declare module 'next-auth' {
  interface Session {
    user: {
      role:     string;
      isActive: boolean;
    } & DefaultSession['user'];
  }

  interface User {
    role:             string;
    isActive:         boolean;
    passwordChangedAt?: Date | null;
  }
}

declare module 'next-auth/jwt' {
  interface JWT extends DefaultJWT {
    role:             string;
    isActive:         boolean;
    passwordChangedAt?: number;
  }
}
```

---

## 11. UI Pages — Super Admin

### Navigasi Super Admin (tambahan dari menu umum)

```
/pengaturan/
├── pengguna/          → Manajemen User
│   ├── page.tsx       → Tabel semua user + filter role
│   └── [id]/edit/
│       └── page.tsx   → Form edit user & ganti role
├── masterdata/
│   ├── poli/          → Master Poli
│   ├── tindakan/      → Master Tindakan & Tarif
│   ├── kamar/         → Master Kamar Rawat Inap
│   └── obat/          → Master Obat
├── klinik/            → Konfigurasi data faskes
└── sistem/            → Pengaturan umum sistem

/audit-log/            → Log aktivitas semua user
```

### Komponen Wajib Halaman User Management

```typescript
// src/features/user/schemas/user.schema.ts

import { z } from 'zod';

export const createUserSchema = z.object({
  nama:         z.string().min(3, 'Nama minimal 3 karakter'),
  email:        z.string().email('Format email tidak valid'),
  password:     z.string().min(8, 'Password minimal 8 karakter'),
  role:         z.enum(['ADMISSION', 'KASIR', 'DOKTER', 'PERAWAT', 'APOTEKER', 'SUPER_ADMIN']),
  nip:          z.string().optional(),
  telepon:      z.string().optional(),
  // Validasi kondisional — wajib jika role = DOKTER
  sip:          z.string().optional(),
  spesialisasi: z.string().optional(),
  poliId:       z.string().optional(),
}).superRefine((data, ctx) => {
  if (data.role === 'DOKTER' && !data.sip) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'SIP wajib diisi untuk Dokter',
      path: ['sip'],
    });
  }
});

export const updateUserSchema = createUserSchema.partial().omit({ password: true });

export const resetPasswordSchema = z.object({
  newPassword:     z.string().min(8),
  confirmPassword: z.string(),
}).refine(d => d.newPassword === d.confirmPassword, {
  message: 'Password tidak sama',
  path: ['confirmPassword'],
});
```

---

## 12. Seed Data Awal

```typescript
// prisma/seed.ts

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const password = await bcrypt.hash('Admin@1234', 12);

  const users = [
    {
      nama:  'Super Administrator',
      email: 'superadmin@emr.local',
      password,
      role:  'SUPER_ADMIN' as const,
      nip:   'SA001',
    },
    {
      nama:  'Staff Admission',
      email: 'admission@emr.local',
      password,
      role:  'ADMISSION' as const,
      nip:   'ADM001',
    },
    {
      nama:  'Staff Kasir',
      email: 'kasir@emr.local',
      password,
      role:  'KASIR' as const,
      nip:   'KSR001',
    },
    {
      nama:  'dr. Ahmad Fauzi',
      email: 'dokter@emr.local',
      password,
      role:  'DOKTER' as const,
      nip:   'DKT001',
    },
    {
      nama:  'Ns. Siti Rahayu',
      email: 'perawat@emr.local',
      password,
      role:  'PERAWAT' as const,
      nip:   'PRW001',
    },
    {
      nama:  'Apt. Budi Santoso',
      email: 'apoteker@emr.local',
      password,
      role:  'APOTEKER' as const,
      nip:   'APT001',
    },
  ];

  for (const u of users) {
    await prisma.user.upsert({
      where:  { email: u.email },
      update: {},
      create: u,
    });
    console.log(`✓ Seeded: ${u.nama} [${u.role}]`);
  }

  console.log('\n✅ Seed selesai. Default password: Admin@1234');
  console.log('⚠️  Segera ganti password setelah login pertama!');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
```

### Jalankan Seed

```bash
npx ts-node --compiler-options '{"module":"CommonJS"}' prisma/seed.ts
# atau tambahkan di package.json:
# "prisma": { "seed": "ts-node prisma/seed.ts" }
# lalu: npx prisma db seed
```

---

*masterdata_v1.md — Living document, diperbarui seiring pengembangan sistem.*
