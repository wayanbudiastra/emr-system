# Product Requirements Document (PRD)
# Sistem Rekam Medis Elektronik (RME / EMR)

**Versi:** 1.0.0  
**Tanggal:** Mei 2026  
**Status:** Draft  
**Author:** Tim Pengembang

---

## Daftar Isi

1. [Ringkasan Eksekutif](#1-ringkasan-eksekutif)
2. [Tujuan & Sasaran Produk](#2-tujuan--sasaran-produk)
3. [Target Pengguna & Role](#3-target-pengguna--role)
4. [Tech Stack](#4-tech-stack)
5. [Arsitektur Sistem](#5-arsitektur-sistem)
6. [Struktur Folder Proyek](#6-struktur-folder-proyek)
7. [Skema Database (Prisma)](#7-skema-database-prisma)
8. [Fitur & Modul Utama](#8-fitur--modul-utama)
9. [Hak Akses per Role (RBAC)](#9-hak-akses-per-role-rbac)
10. [API Endpoint](#10-api-endpoint)
11. [Autentikasi & Keamanan](#11-autentikasi--keamanan)
12. [UI/UX Guidelines](#12-uiux-guidelines)
13. [Setup & Konfigurasi Awal](#13-setup--konfigurasi-awal)
14. [Environment Variables](#14-environment-variables)
15. [Roadmap Pengembangan](#15-roadmap-pengembangan)

---

## 1. Ringkasan Eksekutif

Sistem Rekam Medis Elektronik (RME) ini adalah aplikasi fullstack berbasis web yang dirancang untuk mendigitalisasi proses pencatatan medis di fasilitas kesehatan. Aplikasi dibangun dengan pendekatan modular dan scalable menggunakan Next.js App Router, PostgreSQL (Neon.tech), dan Prisma ORM. Sistem mendukung multi-role user dengan kontrol akses granular (RBAC), sehingga setiap peran hanya dapat mengakses data dan fungsi yang relevan.

---

## 2. Tujuan & Sasaran Produk

### Tujuan Utama
- Menggantikan pencatatan rekam medis manual dengan sistem digital yang efisien
- Meningkatkan akurasi dan keamanan data pasien
- Mempercepat alur kerja klinis dari pendaftaran hingga pembuatan laporan

### Sasaran Teknis
- Aplikasi fullstack monorepo dengan Next.js App Router
- Database relasional PostgreSQL di Neon.tech dengan Prisma ORM
- Autentikasi aman dengan NextAuth.js v5 (JWT + RBAC)
- Struktur kode modular berbasis fitur (Feature-Based Architecture)
- Siap dikembangkan menjadi sistem enterprise multi-klinik

### KPI Keberhasilan
- Waktu pendaftaran pasien < 2 menit
- Response time API < 500ms (p95)
- Uptime sistem ≥ 99.5%
- Zero data breach pada data pasien

---

## 3. Target Pengguna & Role

| Role | Deskripsi | Akses Utama |
|------|-----------|-------------|
| **Super Admin** | Administrator sistem tertinggi | Full access semua modul + manajemen user & sistem |
| **Admin** | Pengelola operasional harian | Manajemen pasien, jadwal, laporan |
| **Dokter** | Tenaga medis pemeriksa | SOAP note, diagnosis, resep, riwayat pasien |
| **Perawat** | Tenaga keperawatan | Asesmen awal, tanda vital, tindakan keperawatan |
| **Apoteker** | Pengelola farmasi | Validasi & dispensing resep |
| **Kasir** | Pengelola keuangan | Billing, pembayaran, invoice |
| **Rekam Medis** | Staff rekam medis | Kelola & arsip rekam medis, laporan |
| **Pasien** | Pasien terdaftar | Riwayat kunjungan pribadi (portal pasien) |

---

## 4. Tech Stack

### Frontend
```
Next.js 14+ (App Router)
TypeScript
Tailwind CSS
shadcn/ui
Zustand (state management)
React Hook Form + Zod (form & validasi)
TanStack Query v5 (server state & caching)
Lucide React (icons)
date-fns (utilitas tanggal)
```

### Backend
```
Next.js Route Handlers (REST API)
Next.js Server Actions (form mutations)
Prisma ORM
```

### Database
```
PostgreSQL (Neon.tech - serverless)
```

### Autentikasi
```
NextAuth.js v5 / Auth.js
JWT Session Strategy
RBAC Middleware
bcryptjs (password hashing)
```

### Tooling & Utilities
```
clsx + tailwind-merge (class utilities)
class-variance-authority (component variants)
ESLint + Prettier
Husky + lint-staged (git hooks)
```

---

## 5. Arsitektur Sistem

```
┌─────────────────────────────────────────────┐
│              CLIENT BROWSER                 │
│  Next.js App Router (React Server Components│
│  + Client Components)                       │
└────────────────────┬────────────────────────┘
                     │ HTTPS
┌────────────────────▼────────────────────────┐
│           NEXT.JS SERVER                    │
│  ┌─────────────┐  ┌──────────────────────┐ │
│  │ Middleware   │  │  Route Handlers      │ │
│  │ (RBAC Auth) │  │  (REST API /api/*)   │ │
│  └─────────────┘  └──────────────────────┘ │
│  ┌──────────────────────────────────────┐  │
│  │      Server Actions (Mutations)       │  │
│  └──────────────────────────────────────┘  │
│  ┌──────────────────────────────────────┐  │
│  │         Prisma ORM Layer             │  │
│  └──────────────────────────────────────┘  │
└────────────────────┬────────────────────────┘
                     │ Connection Pooling
┌────────────────────▼────────────────────────┐
│         PostgreSQL (Neon.tech)              │
│         Serverless Database                 │
└─────────────────────────────────────────────┘
```

### Pola Arsitektur
- **Repository Pattern** — abstraksi query database dari business logic
- **Service Layer** — business logic terpusat, terpisah dari HTTP layer
- **Feature-Based Architecture** — setiap fitur memiliki folder tersendiri
- **RBAC Middleware** — validasi role di level middleware Next.js

---

## 6. Struktur Folder Proyek

```
emr-app/
├── prisma/
│   ├── schema.prisma              # Definisi skema database
│   └── migrations/                # File migrasi database
│
├── public/                        # Asset statis
│
├── src/
│   ├── app/                       # Next.js App Router
│   │   ├── (auth)/                # Route group: halaman auth
│   │   │   ├── login/
│   │   │   │   └── page.tsx
│   │   │   ├── register/
│   │   │   │   └── page.tsx
│   │   │   └── layout.tsx
│   │   │
│   │   ├── (dashboard)/           # Route group: halaman utama (protected)
│   │   │   ├── layout.tsx         # Dashboard layout + sidebar
│   │   │   ├── page.tsx           # Dashboard home
│   │   │   │
│   │   │   ├── pasien/            # Modul Manajemen Pasien
│   │   │   │   ├── page.tsx       # Daftar pasien
│   │   │   │   ├── [id]/
│   │   │   │   │   ├── page.tsx   # Detail pasien
│   │   │   │   │   └── rekam-medis/
│   │   │   │   │       └── page.tsx
│   │   │   │   └── tambah/
│   │   │   │       └── page.tsx
│   │   │   │
│   │   │   ├── pendaftaran/       # Modul Pendaftaran / Antrian
│   │   │   │   └── page.tsx
│   │   │   │
│   │   │   ├── pemeriksaan/       # Modul Pemeriksaan (SOAP)
│   │   │   │   ├── page.tsx
│   │   │   │   └── [kunjunganId]/
│   │   │   │       └── page.tsx
│   │   │   │
│   │   │   ├── rawat-inap/        # Modul Rawat Inap
│   │   │   │   └── page.tsx
│   │   │   │
│   │   │   ├── farmasi/           # Modul Farmasi
│   │   │   │   ├── resep/
│   │   │   │   │   └── page.tsx
│   │   │   │   └── stok-obat/
│   │   │   │       └── page.tsx
│   │   │   │
│   │   │   ├── billing/           # Modul Billing & Keuangan
│   │   │   │   └── page.tsx
│   │   │   │
│   │   │   ├── laporan/           # Modul Laporan
│   │   │   │   └── page.tsx
│   │   │   │
│   │   │   └── pengaturan/        # Modul Pengaturan Sistem
│   │   │       ├── pengguna/
│   │   │       │   └── page.tsx
│   │   │       └── klinik/
│   │   │           └── page.tsx
│   │   │
│   │   └── api/                   # REST API Route Handlers
│   │       ├── auth/
│   │       │   └── [...nextauth]/
│   │       │       └── route.ts
│   │       ├── pasien/
│   │       │   ├── route.ts       # GET list, POST create
│   │       │   └── [id]/
│   │       │       └── route.ts   # GET, PUT, DELETE
│   │       ├── kunjungan/
│   │       │   └── route.ts
│   │       ├── diagnosa/
│   │       │   └── route.ts
│   │       ├── resep/
│   │       │   └── route.ts
│   │       ├── billing/
│   │       │   └── route.ts
│   │       └── laporan/
│   │           └── route.ts
│   │
│   ├── components/                # Komponen UI reusable
│   │   ├── ui/                    # shadcn/ui base components
│   │   ├── layout/
│   │   │   ├── Sidebar.tsx
│   │   │   ├── Navbar.tsx
│   │   │   └── PageHeader.tsx
│   │   ├── forms/
│   │   │   ├── FormInput.tsx
│   │   │   ├── FormSelect.tsx
│   │   │   └── FormDatePicker.tsx
│   │   └── shared/
│   │       ├── DataTable.tsx
│   │       ├── Modal.tsx
│   │       ├── Badge.tsx
│   │       ├── LoadingSpinner.tsx
│   │       └── ErrorBoundary.tsx
│   │
│   ├── features/                  # Feature-based modules
│   │   ├── auth/
│   │   │   ├── components/
│   │   │   │   └── LoginForm.tsx
│   │   │   ├── hooks/
│   │   │   │   └── useAuth.ts
│   │   │   └── types/
│   │   │       └── auth.types.ts
│   │   │
│   │   ├── pasien/
│   │   │   ├── components/
│   │   │   │   ├── PasienTable.tsx
│   │   │   │   ├── PasienForm.tsx
│   │   │   │   └── PasienCard.tsx
│   │   │   ├── hooks/
│   │   │   │   └── usePasien.ts
│   │   │   ├── schemas/
│   │   │   │   └── pasien.schema.ts
│   │   │   └── types/
│   │   │       └── pasien.types.ts
│   │   │
│   │   ├── kunjungan/
│   │   ├── pemeriksaan/
│   │   ├── farmasi/
│   │   ├── billing/
│   │   └── laporan/
│   │
│   ├── lib/                       # Shared utilities & config
│   │   ├── prisma.ts              # Prisma client singleton
│   │   ├── auth.ts                # NextAuth config
│   │   ├── utils.ts               # Utility functions (cn, formatDate, dll)
│   │   ├── constants.ts           # Konstanta aplikasi
│   │   └── validations/
│   │       └── common.schema.ts
│   │
│   ├── repositories/              # Data access layer (Repository Pattern)
│   │   ├── pasien.repository.ts
│   │   ├── kunjungan.repository.ts
│   │   ├── diagnosa.repository.ts
│   │   ├── resep.repository.ts
│   │   ├── billing.repository.ts
│   │   └── user.repository.ts
│   │
│   ├── services/                  # Business logic layer
│   │   ├── pasien.service.ts
│   │   ├── kunjungan.service.ts
│   │   ├── pemeriksaan.service.ts
│   │   ├── farmasi.service.ts
│   │   ├── billing.service.ts
│   │   └── laporan.service.ts
│   │
│   ├── hooks/                     # Global React hooks
│   │   ├── usePermission.ts       # Cek hak akses
│   │   └── usePagination.ts
│   │
│   ├── store/                     # Zustand global state
│   │   ├── authStore.ts
│   │   └── uiStore.ts
│   │
│   ├── types/                     # TypeScript global types
│   │   ├── next-auth.d.ts         # NextAuth type extension
│   │   └── index.ts
│   │
│   ├── config/
│   │   ├── nav.config.ts          # Konfigurasi navigasi per role
│   │   └── rbac.config.ts         # Definisi permissions RBAC
│   │
│   ├── middleware.ts              # RBAC middleware Next.js
│   └── styles/
│       └── globals.css
│
├── .env.local
├── .env.example
├── next.config.ts
├── tailwind.config.ts
├── tsconfig.json
└── package.json
```

---

## 7. Skema Database (Prisma)

```prisma
// prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ──────────────────────────────────────────
// ENUM
// ──────────────────────────────────────────

enum Role {
  SUPER_ADMIN
  ADMIN
  DOKTER
  PERAWAT
  APOTEKER
  KASIR
  REKAM_MEDIS
  PASIEN
}

enum JenisKelamin {
  LAKI_LAKI
  PEREMPUAN
}

enum StatusKunjungan {
  MENUNGGU
  DALAM_PEMERIKSAAN
  SELESAI
  DIBATALKAN
}

enum StatusRawatInap {
  AKTIF
  KELUAR
  PINDAH_RUANG
}

enum StatusResep {
  MENUNGGU
  DIPROSES
  SIAP
  DIAMBIL
}

enum StatusBilling {
  BELUM_BAYAR
  SEBAGIAN
  LUNAS
  DIBATALKAN
}

enum MetodePembayaran {
  TUNAI
  TRANSFER
  BPJS
  ASURANSI
  KARTU_DEBIT
  KARTU_KREDIT
}

// ──────────────────────────────────────────
// USER & AUTENTIKASI
// ──────────────────────────────────────────

model User {
  id            String    @id @default(cuid())
  nama          String
  email         String    @unique
  password      String
  role          Role      @default(PASIEN)
  isActive      Boolean   @default(true)
  foto          String?
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  dokter        Dokter?
  perawat       Perawat?
  pasien        Pasien?
  sessions      Session[]

  @@map("users")
}

model Session {
  id        String   @id @default(cuid())
  userId    String
  token     String   @unique
  expiresAt DateTime
  createdAt DateTime @default(now())

  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@map("sessions")
}

// ──────────────────────────────────────────
// MASTER DATA
// ──────────────────────────────────────────

model Klinik {
  id        String   @id @default(cuid())
  nama      String
  alamat    String
  telepon   String?
  email     String?
  logo      String?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@map("klinik")
}

model Poli {
  id        String    @id @default(cuid())
  nama      String
  kode      String    @unique
  isActive  Boolean   @default(true)
  createdAt DateTime  @default(now())

  dokter    Dokter[]
  kunjungan Kunjungan[]

  @@map("poli")
}

model Dokter {
  id          String    @id @default(cuid())
  userId      String    @unique
  nip         String?   @unique
  sip         String?
  spesialisasi String?
  jadwalPraktek Json?   // { senin: ["08:00","14:00"], selasa: [...] }
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt

  user        User      @relation(fields: [userId], references: [id])
  poli        Poli?     @relation(fields: [poliId], references: [id])
  poliId      String?
  kunjungan   Kunjungan[]
  resep       Resep[]

  @@map("dokter")
}

model Perawat {
  id        String    @id @default(cuid())
  userId    String    @unique
  nip       String?   @unique
  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt

  user      User      @relation(fields: [userId], references: [id])
  asesmen   AsesmenPerawat[]

  @@map("perawat")
}

// ──────────────────────────────────────────
// PASIEN
// ──────────────────────────────────────────

model Pasien {
  id              String       @id @default(cuid())
  userId          String?      @unique
  nomorRM         String       @unique  // Nomor Rekam Medis
  nik             String?      @unique
  nama            String
  tanggalLahir    DateTime
  jenisKelamin    JenisKelamin
  alamat          String?
  telepon         String?
  email           String?
  golonganDarah   String?
  alergi          String?
  noBPJS          String?
  noAsuransi      String?
  createdAt       DateTime     @default(now())
  updatedAt       DateTime     @updatedAt

  user            User?        @relation(fields: [userId], references: [id])
  kunjungan       Kunjungan[]
  rawatInap       RawatInap[]

  @@map("pasien")
}

// ──────────────────────────────────────────
// KUNJUNGAN & PEMERIKSAAN
// ──────────────────────────────────────────

model Kunjungan {
  id            String          @id @default(cuid())
  nomorAntrean  String
  pasienId      String
  dokterId      String?
  poliId        String?
  tanggal       DateTime        @default(now())
  keluhan       String?
  status        StatusKunjungan @default(MENUNGGU)
  tipePembayaran String?        // UMUM, BPJS, ASURANSI
  createdAt     DateTime        @default(now())
  updatedAt     DateTime        @updatedAt

  pasien        Pasien          @relation(fields: [pasienId], references: [id])
  dokter        Dokter?         @relation(fields: [dokterId], references: [id])
  poli          Poli?           @relation(fields: [poliId], references: [id])
  asesmen       AsesmenPerawat?
  soap          SOAPNote?
  resep         Resep[]
  billing       Billing?
  tindakan      Tindakan[]

  @@map("kunjungan")
}

model AsesmenPerawat {
  id            String    @id @default(cuid())
  kunjunganId   String    @unique
  perawatId     String?
  beratBadan    Float?
  tinggiBadan   Float?
  tekananDarah  String?   // contoh: "120/80"
  nadi          Int?
  suhu          Float?
  saturasi      Float?    // SpO2
  gds           Float?    // Gula Darah Sewaktu
  anamnesisAwal String?
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  kunjungan     Kunjungan     @relation(fields: [kunjunganId], references: [id])
  perawat       Perawat?  @relation(fields: [perawatId], references: [id])

  @@map("asesmen_perawat")
}

model SOAPNote {
  id            String    @id @default(cuid())
  kunjunganId   String    @unique
  subjektif     String?   @db.Text  // Keluhan subjektif
  objektif      String?   @db.Text  // Hasil pemeriksaan objektif
  asesmen       String?   @db.Text  // Diagnosis/assessment
  plan          String?   @db.Text  // Rencana tindakan
  icdCodes      Json?     // Array kode ICD-10
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  kunjungan     Kunjungan @relation(fields: [kunjunganId], references: [id])

  @@map("soap_note")
}

// ──────────────────────────────────────────
// RAWAT INAP
// ──────────────────────────────────────────

model Kamar {
  id        String    @id @default(cuid())
  nomorKamar String   @unique
  kelas     String    // VVIP, VIP, Kelas 1, 2, 3
  kapasitas Int       @default(1)
  tarif     Float
  isActive  Boolean   @default(true)
  createdAt DateTime  @default(now())

  rawatInap RawatInap[]

  @@map("kamar")
}

model RawatInap {
  id          String          @id @default(cuid())
  pasienId    String
  kamarId     String
  tanggalMasuk DateTime
  tanggalKeluar DateTime?
  diagnosa    String?
  status      StatusRawatInap @default(AKTIF)
  catatan     String?         @db.Text
  createdAt   DateTime        @default(now())
  updatedAt   DateTime        @updatedAt

  pasien      Pasien          @relation(fields: [pasienId], references: [id])
  kamar       Kamar           @relation(fields: [kamarId], references: [id])

  @@map("rawat_inap")
}

// ──────────────────────────────────────────
// FARMASI
// ──────────────────────────────────────────

model Obat {
  id          String    @id @default(cuid())
  kode        String    @unique
  nama        String
  generik     String?
  satuan      String    // tablet, kapsul, ml, dll
  stok        Int       @default(0)
  harga       Float
  hargaBeli   Float?
  kategori    String?
  isActive    Boolean   @default(true)
  expiredDate DateTime?
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt

  itemResep   ItemResep[]

  @@map("obat")
}

model Resep {
  id          String      @id @default(cuid())
  kunjunganId String
  dokterId    String?
  status      StatusResep @default(MENUNGGU)
  catatan     String?
  createdAt   DateTime    @default(now())
  updatedAt   DateTime    @updatedAt

  kunjungan   Kunjungan   @relation(fields: [kunjunganId], references: [id])
  dokter      Dokter?     @relation(fields: [dokterId], references: [id])
  items       ItemResep[]

  @@map("resep")
}

model ItemResep {
  id        String  @id @default(cuid())
  resepId   String
  obatId    String
  jumlah    Int
  aturanPakai String? // contoh: "3x1 setelah makan"
  catatan   String?

  resep     Resep   @relation(fields: [resepId], references: [id])
  obat      Obat    @relation(fields: [obatId], references: [id])

  @@map("item_resep")
}

// ──────────────────────────────────────────
// TINDAKAN MEDIS
// ──────────────────────────────────────────

model MasterTindakan {
  id      String  @id @default(cuid())
  kode    String  @unique
  nama    String
  tarif   Float
  kategori String?

  tindakan Tindakan[]

  @@map("master_tindakan")
}

model Tindakan {
  id              String         @id @default(cuid())
  kunjunganId     String
  masterTindakanId String
  jumlah          Int            @default(1)
  catatan         String?
  createdAt       DateTime       @default(now())

  kunjungan       Kunjungan      @relation(fields: [kunjunganId], references: [id])
  masterTindakan  MasterTindakan @relation(fields: [masterTindakanId], references: [id])

  @@map("tindakan")
}

// ──────────────────────────────────────────
// BILLING & PEMBAYARAN
// ──────────────────────────────────────────

model Billing {
  id              String          @id @default(cuid())
  kunjunganId     String          @unique
  nomorInvoice    String          @unique
  totalTagihan    Float
  totalBayar      Float           @default(0)
  sisa            Float
  status          StatusBilling   @default(BELUM_BAYAR)
  createdAt       DateTime        @default(now())
  updatedAt       DateTime        @updatedAt

  kunjungan       Kunjungan       @relation(fields: [kunjunganId], references: [id])
  pembayaran      Pembayaran[]

  @@map("billing")
}

model Pembayaran {
  id          String           @id @default(cuid())
  billingId   String
  jumlah      Float
  metode      MetodePembayaran
  referensi   String?          // Nomor referensi transfer/BPJS
  tanggal     DateTime         @default(now())
  createdAt   DateTime         @default(now())

  billing     Billing          @relation(fields: [billingId], references: [id])

  @@map("pembayaran")
}
```

---

## 8. Fitur & Modul Utama

### 8.1 Modul Autentikasi
- Login dengan email & password
- Lupa password (reset via email)
- Manajemen sesi JWT
- Proteksi route berdasarkan role

### 8.2 Modul Dashboard
- Ringkasan statistik harian (total kunjungan, pasien baru, pendapatan)
- Grafik tren kunjungan mingguan/bulanan
- Antrean real-time
- Notifikasi sistem

### 8.3 Modul Manajemen Pasien
- Registrasi pasien baru (manual & scan KTP)
- Pencarian pasien (nama, NIK, nomor RM)
- Edit data demografi pasien
- Riwayat kunjungan lengkap
- Cetak kartu pasien / nomor RM

### 8.4 Modul Pendaftaran & Antrean
- Pendaftaran kunjungan pasien lama/baru
- Pemilihan poli & dokter
- Generate nomor antrean otomatis
- Display antrean (layar antrian)
- Update status antrean real-time

### 8.5 Modul Pemeriksaan (Rekam Medis)
**Asesmen Perawat:**
- Input tanda vital (TD, nadi, suhu, SpO2, BB, TB)
- Anamnesis awal & keluhan utama

**SOAP Note Dokter:**
- Subjektif: keluhan pasien
- Objektif: hasil pemeriksaan fisik
- Asesmen: diagnosis (dengan pencarian kode ICD-10)
- Plan: rencana terapi & tindak lanjut

### 8.6 Modul Rawat Inap
- Admisi pasien rawat inap
- Manajemen kamar & bed
- Catatan perkembangan harian (CPPT)
- Discharge planning
- Surat keterangan rawat inap

### 8.7 Modul Farmasi
- Input resep elektronik dari dokter
- Verifikasi & validasi resep oleh apoteker
- Dispensing & labeling obat
- Manajemen stok obat
- Alert stok minimum & expired
- Laporan penggunaan obat

### 8.8 Modul Billing & Kasir
- Generate invoice otomatis dari kunjungan
- Kalkulasi tarif tindakan + obat + kamar
- Proses pembayaran multi-metode
- Cetak kwitansi & invoice
- Rekap pendapatan harian/bulanan

### 8.9 Modul Laporan
- Laporan kunjungan harian/bulanan
- Laporan 10 besar penyakit (ICD-10)
- Laporan pendapatan
- Laporan penggunaan obat
- Export PDF & Excel
- Laporan untuk BPJS (format SEP)

### 8.10 Modul Pengaturan
- Manajemen user & role
- Konfigurasi data klinik/faskes
- Master data poli, dokter, tindakan
- Konfigurasi tarif
- Log aktivitas sistem (audit trail)

---

## 9. Hak Akses per Role (RBAC)

```typescript
// src/config/rbac.config.ts

export const permissions = {
  PASIEN: {
    kunjungan: ['read:own'],
    rekamMedis: ['read:own'],
    billing: ['read:own'],
  },
  KASIR: {
    pasien: ['read'],
    kunjungan: ['read'],
    billing: ['create', 'read', 'update'],
    pembayaran: ['create', 'read'],
    laporan: ['read:keuangan'],
  },
  PERAWAT: {
    pasien: ['create', 'read', 'update'],
    kunjungan: ['create', 'read', 'update'],
    asesmen: ['create', 'read', 'update'],
    tindakan: ['create', 'read'],
  },
  APOTEKER: {
    resep: ['read', 'update'],
    obat: ['create', 'read', 'update'],
    laporan: ['read:farmasi'],
  },
  REKAM_MEDIS: {
    pasien: ['create', 'read', 'update'],
    rekamMedis: ['create', 'read', 'update'],
    laporan: ['create', 'read'],
  },
  DOKTER: {
    pasien: ['read'],
    kunjungan: ['read', 'update'],
    soap: ['create', 'read', 'update'],
    resep: ['create', 'read', 'update'],
    tindakan: ['create', 'read'],
    laporan: ['read:own'],
  },
  ADMIN: {
    pasien: ['create', 'read', 'update', 'delete'],
    kunjungan: ['create', 'read', 'update', 'delete'],
    user: ['create', 'read', 'update'],
    laporan: ['create', 'read'],
    pengaturan: ['read', 'update'],
  },
  SUPER_ADMIN: {
    // Full access semua resource
    '*': ['create', 'read', 'update', 'delete'],
  },
} as const;
```

### Implementasi Middleware RBAC

```typescript
// src/middleware.ts

import { auth } from '@/lib/auth';
import { NextResponse } from 'next/server';
import { routePermissions } from '@/config/rbac.config';

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const session = req.auth;

  // Redirect ke login jika belum autentikasi
  if (!session && !pathname.startsWith('/login')) {
    return NextResponse.redirect(new URL('/login', req.url));
  }

  // Cek izin akses berdasarkan role
  const userRole = session?.user?.role;
  const allowedRoles = routePermissions[pathname];

  if (allowedRoles && !allowedRoles.includes(userRole)) {
    return NextResponse.redirect(new URL('/unauthorized', req.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ['/((?!api/auth|_next/static|_next/image|favicon.ico).*)'],
};
```

---

## 10. API Endpoint

| Method | Endpoint | Deskripsi | Role |
|--------|----------|-----------|------|
| POST | `/api/auth/login` | Login | Public |
| POST | `/api/auth/logout` | Logout | Auth |
| GET | `/api/pasien` | List pasien | Admin, Dokter, Perawat |
| POST | `/api/pasien` | Tambah pasien | Admin, Perawat |
| GET | `/api/pasien/:id` | Detail pasien | Admin, Dokter, Perawat |
| PUT | `/api/pasien/:id` | Update pasien | Admin, Perawat |
| GET | `/api/kunjungan` | List kunjungan hari ini | Auth |
| POST | `/api/kunjungan` | Daftar kunjungan baru | Admin, Perawat |
| PUT | `/api/kunjungan/:id/status` | Update status kunjungan | Auth |
| POST | `/api/asesmen` | Input asesmen perawat | Perawat |
| GET | `/api/soap/:kunjunganId` | Ambil SOAP note | Dokter, Rekam Medis |
| POST | `/api/soap` | Buat SOAP note | Dokter |
| PUT | `/api/soap/:id` | Update SOAP note | Dokter |
| GET | `/api/resep/:kunjunganId` | List resep per kunjungan | Dokter, Apoteker |
| POST | `/api/resep` | Buat resep baru | Dokter |
| PUT | `/api/resep/:id/status` | Update status resep | Apoteker |
| GET | `/api/obat` | List obat | Apoteker, Dokter |
| POST | `/api/billing` | Generate billing | Admin, Kasir |
| POST | `/api/billing/:id/bayar` | Proses pembayaran | Kasir |
| GET | `/api/laporan/kunjungan` | Laporan kunjungan | Admin, Rekam Medis |
| GET | `/api/laporan/keuangan` | Laporan keuangan | Admin, Kasir |

---

## 11. Autentikasi & Keamanan

### NextAuth.js v5 Configuration

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
        if (!user || !user.isActive) return null;
        const valid = await bcrypt.compare(
          credentials.password as string,
          user.password
        );
        if (!valid) return null;
        return { id: user.id, name: user.nama, email: user.email, role: user.role };
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) token.role = user.role;
      return token;
    },
    session({ session, token }) {
      session.user.role = token.role as string;
      return session;
    },
  },
  pages: {
    signIn: '/login',
    error: '/login',
  },
});
```

### Keamanan Data
- Password di-hash dengan bcryptjs (salt rounds: 12)
- JWT secret minimal 32 karakter, di-rotate berkala
- HTTPS wajib di production
- Input sanitization & validasi Zod di semua form
- Rate limiting pada endpoint autentikasi
- Audit trail untuk semua aksi sensitif
- Data pasien di-encrypt at rest (PostgreSQL TDE)

---

## 12. UI/UX Guidelines

### Design System
- **Framework:** Tailwind CSS + shadcn/ui
- **Font:** Inter (default shadcn/ui)
- **Warna Primer:** Biru medis (#2563EB / blue-600)
- **Mode:** Light mode default, Dark mode opsional

### Komponen Wajib
- DataTable dengan pagination, search, sort, filter
- Modal untuk form create/edit
- Toast notification (sukses, error, warning, info)
- Breadcrumb navigasi
- Loading skeleton untuk semua list & detail view
- Error boundary per fitur
- Responsive untuk tablet (minimum 768px)

### Aksesibilitas
- Semua form memiliki label & aria attributes
- Keyboard navigation support
- Focus management pada modal
- Contrast ratio minimum WCAG AA (4.5:1)

---

## 13. Setup & Konfigurasi Awal

```bash
# 1. Buat project Next.js
npx create-next-app@latest emr-app
# Pilih: TypeScript ✓, ESLint ✓, Tailwind CSS ✓, src/ ✓, App Router ✓

# 2. Install dependencies
cd emr-app
npm install prisma @prisma/client
npm install next-auth@beta
npm install zod react-hook-form @hookform/resolvers
npm install zustand @tanstack/react-query
npm install bcryptjs jsonwebtoken
npm install clsx tailwind-merge class-variance-authority
npm install lucide-react date-fns
npm install -D @types/bcryptjs @types/jsonwebtoken

# 3. Install shadcn/ui
npx shadcn@latest init
npx shadcn@latest add button input form select table dialog badge card

# 4. Inisialisasi Prisma
npx prisma init

# 5. Jalankan migrasi awal
npx prisma migrate dev --name init

# 6. Generate Prisma Client
npx prisma generate

# 7. Seed data awal (opsional)
npx prisma db seed

# 8. Jalankan development server
npm run dev
```

---

## 14. Environment Variables

```env
# .env.local

# Database (Neon.tech)
DATABASE_URL="postgresql://user:password@host/dbname?sslmode=require"

# NextAuth.js
NEXTAUTH_SECRET="your-secret-minimum-32-chars-random-string"
NEXTAUTH_URL="http://localhost:3000"

# Prisma (untuk koneksi pool di Neon.tech)
DIRECT_URL="postgresql://user:password@host/dbname?sslmode=require"

# Email (opsional: untuk reset password)
SMTP_HOST=""
SMTP_PORT="587"
SMTP_USER=""
SMTP_PASS=""
SMTP_FROM="noreply@emr-app.com"

# App
NEXT_PUBLIC_APP_NAME="EMR System"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

> **Catatan Neon.tech:** Gunakan connection pooler URL untuk `DATABASE_URL` dan direct connection URL untuk `DIRECT_URL` (dibutuhkan Prisma migrate).

---

## 15. Roadmap Pengembangan

### Phase 1 — MVP (Bulan 1–2)
- [ ] Setup project & autentikasi (login, RBAC)
- [ ] Manajemen pasien (CRUD)
- [ ] Pendaftaran & antrean
- [ ] Asesmen perawat & SOAP note dokter
- [ ] Resep elektronik sederhana
- [ ] Billing & pembayaran tunai

### Phase 2 — Core Features (Bulan 3–4)
- [ ] Rawat inap & manajemen kamar
- [ ] Farmasi lengkap (stok, dispensing)
- [ ] Modul laporan dasar (PDF & Excel)
- [ ] Dashboard analytics
- [ ] Notifikasi in-app

### Phase 3 — Enhancement (Bulan 5–6)
- [ ] Integrasi BPJS (SEP & klaim)
- [ ] Portal pasien (riwayat kunjungan)
- [ ] Signature digital dokter
- [ ] Pencarian kode ICD-10 terintegrasi
- [ ] Audit trail & log sistem

### Phase 4 — Scale (Bulan 7+)
- [ ] Multi-faskes / multi-klinik
- [ ] WhatsApp notification (Twilio/WATI)
- [ ] Telemedicine (video call)
- [ ] Mobile app (React Native / PWA)
- [ ] AI Medical Assistant (opsional)
- [ ] Integrasi DICOM / PACS (radiologi)

---

*Dokumen ini bersifat living document dan akan diperbarui seiring perkembangan proyek.*
