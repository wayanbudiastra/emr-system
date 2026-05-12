-- CreateEnum
CREATE TYPE "TipePasien" AS ENUM ('WNI', 'WNA');

-- CreateEnum
CREATE TYPE "GolonganDarah" AS ENUM ('A', 'B', 'AB', 'O', 'TIDAK_DIKETAHUI');

-- CreateEnum
CREATE TYPE "HubunganKontak" AS ENUM ('SUAMI', 'ISTRI', 'AYAH', 'IBU', 'ANAK', 'KAKAK', 'ADIK', 'KAKEK', 'NENEK', 'PAMAN', 'BIBI', 'KEPONAKAN', 'TEMAN', 'REKAN_KERJA', 'LAINNYA');

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('SUPER_ADMIN', 'ADMISSION', 'KASIR', 'DOKTER', 'PERAWAT', 'APOTEKER');

-- CreateEnum
CREATE TYPE "JenisKelamin" AS ENUM ('LAKI_LAKI', 'PEREMPUAN');

-- CreateEnum
CREATE TYPE "StatusKunjungan" AS ENUM ('MENUNGGU', 'DALAM_PEMERIKSAAN', 'SELESAI', 'DIBATALKAN');

-- CreateEnum
CREATE TYPE "StatusRawatInap" AS ENUM ('AKTIF', 'KELUAR', 'PINDAH_RUANG');

-- CreateEnum
CREATE TYPE "StatusResep" AS ENUM ('MENUNGGU', 'DIPROSES', 'SIAP', 'DIAMBIL');

-- CreateEnum
CREATE TYPE "StatusBilling" AS ENUM ('BELUM_BAYAR', 'SEBAGIAN', 'LUNAS', 'DIBATALKAN');

-- CreateEnum
CREATE TYPE "MetodePembayaran" AS ENUM ('TUNAI', 'TRANSFER', 'BPJS', 'ASURANSI', 'KARTU_DEBIT', 'KARTU_KREDIT');

-- CreateEnum
CREATE TYPE "KategoriItem" AS ENUM ('TINDAKAN', 'LAB', 'RADIOLOGI', 'PERALATAN');

-- CreateEnum
CREATE TYPE "HariKerja" AS ENUM ('SENIN', 'SELASA', 'RABU', 'KAMIS', 'JUMAT', 'SABTU', 'MINGGU');

-- CreateEnum
CREATE TYPE "StatusPeralatan" AS ENUM ('TERSEDIA', 'DIGUNAKAN', 'MAINTENANCE', 'RUSAK');

-- CreateEnum
CREATE TYPE "StatusPenunjang" AS ENUM ('DIPESAN', 'DIPROSES', 'SELESAI', 'DIBATALKAN');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "nama" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'ADMISSION',
    "nip" TEXT,
    "telepon" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "foto" TEXT,
    "lastLoginAt" TIMESTAMP(3),
    "passwordChangedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "activity_logs" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "resource" TEXT NOT NULL,
    "resourceId" TEXT,
    "detail" JSONB,
    "ipAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "activity_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "klinik" (
    "id" TEXT NOT NULL,
    "nama" TEXT NOT NULL,
    "alamat" TEXT NOT NULL,
    "telepon" TEXT,
    "email" TEXT,
    "logo" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "klinik_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "poli" (
    "id" TEXT NOT NULL,
    "nama" TEXT NOT NULL,
    "kode" TEXT NOT NULL,
    "deskripsi" TEXT,
    "lantai" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),

    CONSTRAINT "poli_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dokter_profile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "nik" TEXT,
    "noSIP" TEXT,
    "tglExpiredSIP" TIMESTAMP(3),
    "spesialisasi" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "dokter_profile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dokter_poli" (
    "id" TEXT NOT NULL,
    "dokterProfileId" TEXT NOT NULL,
    "poliId" TEXT NOT NULL,
    "isAktif" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "dokter_poli_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "jadwal_praktek" (
    "id" TEXT NOT NULL,
    "dokterPoliId" TEXT NOT NULL,
    "hari" "HariKerja" NOT NULL,
    "jamMulai" TEXT NOT NULL,
    "jamSelesai" TEXT NOT NULL,
    "kuotaPasien" INTEGER NOT NULL DEFAULT 20,
    "isAktif" BOOLEAN NOT NULL DEFAULT true,
    "keterangan" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "jadwal_praktek_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sharing_fee" (
    "id" TEXT NOT NULL,
    "dokterProfileId" TEXT NOT NULL,
    "kategori" "KategoriItem" NOT NULL,
    "persentase" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sharing_fee_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "perawat" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "nip" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "perawat_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pasien" (
    "id" TEXT NOT NULL,
    "nomorRM" TEXT NOT NULL,
    "nik" TEXT,
    "nama" TEXT NOT NULL,
    "tempatLahir" TEXT NOT NULL,
    "tanggalLahir" TIMESTAMP(3) NOT NULL,
    "jenisKelamin" "JenisKelamin" NOT NULL,
    "tipePasien" "TipePasien" NOT NULL,
    "noPaspor" TEXT,
    "negaraAsal" TEXT,
    "alamat" TEXT NOT NULL,
    "telepon" TEXT NOT NULL,
    "email" TEXT,
    "golonganDarah" "GolonganDarah",
    "alergi" TEXT,
    "noBPJS" TEXT,
    "noAsuransi" TEXT,
    "foto" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pasien_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "kontak_darurat" (
    "id" TEXT NOT NULL,
    "pasienId" TEXT NOT NULL,
    "nama" TEXT NOT NULL,
    "nomorHP" TEXT NOT NULL,
    "hubungan" "HubunganKontak" NOT NULL,
    "alamat" TEXT,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "kontak_darurat_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "kunjungan" (
    "id" TEXT NOT NULL,
    "nomorAntrean" TEXT NOT NULL,
    "pasienId" TEXT NOT NULL,
    "dokterId" TEXT,
    "poliId" TEXT,
    "tanggal" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "keluhan" TEXT,
    "status" "StatusKunjungan" NOT NULL DEFAULT 'MENUNGGU',
    "tipePembayaran" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "kunjungan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "asesmen_perawat" (
    "id" TEXT NOT NULL,
    "kunjunganId" TEXT NOT NULL,
    "perawatId" TEXT,
    "beratBadan" DOUBLE PRECISION,
    "tinggiBadan" DOUBLE PRECISION,
    "tekananDarah" TEXT,
    "nadi" INTEGER,
    "suhu" DOUBLE PRECISION,
    "saturasi" DOUBLE PRECISION,
    "gds" DOUBLE PRECISION,
    "anamnesisAwal" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "asesmen_perawat_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "soap_note" (
    "id" TEXT NOT NULL,
    "kunjunganId" TEXT NOT NULL,
    "subjektif" TEXT,
    "objektif" TEXT,
    "asesmen" TEXT,
    "plan" TEXT,
    "icdCodes" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "soap_note_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "kamar" (
    "id" TEXT NOT NULL,
    "nomorKamar" TEXT NOT NULL,
    "kelas" TEXT NOT NULL,
    "kapasitas" INTEGER NOT NULL DEFAULT 1,
    "tarif" DOUBLE PRECISION NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "kamar_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rawat_inap" (
    "id" TEXT NOT NULL,
    "pasienId" TEXT NOT NULL,
    "kamarId" TEXT NOT NULL,
    "tanggalMasuk" TIMESTAMP(3) NOT NULL,
    "tanggalKeluar" TIMESTAMP(3),
    "diagnosa" TEXT,
    "status" "StatusRawatInap" NOT NULL DEFAULT 'AKTIF',
    "catatan" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rawat_inap_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "obat" (
    "id" TEXT NOT NULL,
    "kode" TEXT NOT NULL,
    "nama" TEXT NOT NULL,
    "generik" TEXT,
    "satuan" TEXT NOT NULL,
    "stok" INTEGER NOT NULL DEFAULT 0,
    "harga" DOUBLE PRECISION NOT NULL,
    "hargaBeli" DOUBLE PRECISION,
    "kategori" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "expiredDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "obat_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "resep" (
    "id" TEXT NOT NULL,
    "kunjunganId" TEXT NOT NULL,
    "dokterId" TEXT,
    "status" "StatusResep" NOT NULL DEFAULT 'MENUNGGU',
    "catatan" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "resep_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "item_resep" (
    "id" TEXT NOT NULL,
    "resepId" TEXT NOT NULL,
    "obatId" TEXT NOT NULL,
    "jumlah" INTEGER NOT NULL,
    "aturanPakai" TEXT,
    "catatan" TEXT,

    CONSTRAINT "item_resep_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "master_tindakan" (
    "id" TEXT NOT NULL,
    "kode" TEXT NOT NULL,
    "nama" TEXT NOT NULL,
    "deskripsi" TEXT,
    "tarif" DOUBLE PRECISION NOT NULL,
    "tarifBPJS" DOUBLE PRECISION,
    "kategori" "KategoriItem" NOT NULL DEFAULT 'TINDAKAN',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),

    CONSTRAINT "master_tindakan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tindakan_poli" (
    "id" TEXT NOT NULL,
    "masterTindakanId" TEXT NOT NULL,
    "poliId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tindakan_poli_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "item_penunjang" (
    "id" TEXT NOT NULL,
    "kode" TEXT NOT NULL,
    "nama" TEXT NOT NULL,
    "deskripsi" TEXT,
    "kategori" "KategoriItem" NOT NULL,
    "tarif" DOUBLE PRECISION NOT NULL,
    "tarifBPJS" DOUBLE PRECISION,
    "satuanWaktu" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "item_penunjang_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "permintaan_penunjang" (
    "id" TEXT NOT NULL,
    "kunjunganId" TEXT NOT NULL,
    "itemPenunjangId" TEXT NOT NULL,
    "jumlah" INTEGER NOT NULL DEFAULT 1,
    "catatan" TEXT,
    "status" "StatusPenunjang" NOT NULL DEFAULT 'DIPESAN',
    "hasilUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "permintaan_penunjang_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "peralatan_medis" (
    "id" TEXT NOT NULL,
    "kode" TEXT NOT NULL,
    "nama" TEXT NOT NULL,
    "merk" TEXT,
    "nomorSeri" TEXT,
    "deskripsi" TEXT,
    "tarif" DOUBLE PRECISION,
    "tarifBPJS" DOUBLE PRECISION,
    "status" "StatusPeralatan" NOT NULL DEFAULT 'TERSEDIA',
    "lokasiTerakhir" TEXT,
    "poliTerakhirId" TEXT,
    "tanggalKalibrasi" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "peralatan_medis_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "penggunaan_alat" (
    "id" TEXT NOT NULL,
    "peralatanId" TEXT NOT NULL,
    "poliId" TEXT NOT NULL,
    "kunjunganId" TEXT,
    "dipakaiOleh" TEXT,
    "waktuMulai" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "waktuSelesai" TIMESTAMP(3),
    "catatan" TEXT,

    CONSTRAINT "penggunaan_alat_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tindakan" (
    "id" TEXT NOT NULL,
    "kunjunganId" TEXT NOT NULL,
    "masterTindakanId" TEXT NOT NULL,
    "jumlah" INTEGER NOT NULL DEFAULT 1,
    "catatan" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tindakan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "billing" (
    "id" TEXT NOT NULL,
    "kunjunganId" TEXT NOT NULL,
    "nomorInvoice" TEXT NOT NULL,
    "totalTagihan" DOUBLE PRECISION NOT NULL,
    "totalBayar" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "sisa" DOUBLE PRECISION NOT NULL,
    "status" "StatusBilling" NOT NULL DEFAULT 'BELUM_BAYAR',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "billing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pembayaran" (
    "id" TEXT NOT NULL,
    "billingId" TEXT NOT NULL,
    "jumlah" DOUBLE PRECISION NOT NULL,
    "metode" "MetodePembayaran" NOT NULL,
    "referensi" TEXT,
    "tanggal" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pembayaran_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_nip_key" ON "users"("nip");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_token_key" ON "sessions"("token");

-- CreateIndex
CREATE UNIQUE INDEX "poli_kode_key" ON "poli"("kode");

-- CreateIndex
CREATE UNIQUE INDEX "dokter_profile_userId_key" ON "dokter_profile"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "dokter_profile_nik_key" ON "dokter_profile"("nik");

-- CreateIndex
CREATE UNIQUE INDEX "dokter_profile_noSIP_key" ON "dokter_profile"("noSIP");

-- CreateIndex
CREATE UNIQUE INDEX "dokter_poli_dokterProfileId_poliId_key" ON "dokter_poli"("dokterProfileId", "poliId");

-- CreateIndex
CREATE UNIQUE INDEX "sharing_fee_dokterProfileId_kategori_key" ON "sharing_fee"("dokterProfileId", "kategori");

-- CreateIndex
CREATE UNIQUE INDEX "perawat_userId_key" ON "perawat"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "perawat_nip_key" ON "perawat"("nip");

-- CreateIndex
CREATE UNIQUE INDEX "pasien_nomorRM_key" ON "pasien"("nomorRM");

-- CreateIndex
CREATE UNIQUE INDEX "pasien_nik_key" ON "pasien"("nik");

-- CreateIndex
CREATE UNIQUE INDEX "pasien_noPaspor_key" ON "pasien"("noPaspor");

-- CreateIndex
CREATE UNIQUE INDEX "pasien_noBPJS_key" ON "pasien"("noBPJS");

-- CreateIndex
CREATE UNIQUE INDEX "asesmen_perawat_kunjunganId_key" ON "asesmen_perawat"("kunjunganId");

-- CreateIndex
CREATE UNIQUE INDEX "soap_note_kunjunganId_key" ON "soap_note"("kunjunganId");

-- CreateIndex
CREATE UNIQUE INDEX "kamar_nomorKamar_key" ON "kamar"("nomorKamar");

-- CreateIndex
CREATE UNIQUE INDEX "obat_kode_key" ON "obat"("kode");

-- CreateIndex
CREATE UNIQUE INDEX "master_tindakan_kode_key" ON "master_tindakan"("kode");

-- CreateIndex
CREATE UNIQUE INDEX "tindakan_poli_masterTindakanId_poliId_key" ON "tindakan_poli"("masterTindakanId", "poliId");

-- CreateIndex
CREATE UNIQUE INDEX "item_penunjang_kode_key" ON "item_penunjang"("kode");

-- CreateIndex
CREATE UNIQUE INDEX "peralatan_medis_kode_key" ON "peralatan_medis"("kode");

-- CreateIndex
CREATE UNIQUE INDEX "peralatan_medis_nomorSeri_key" ON "peralatan_medis"("nomorSeri");

-- CreateIndex
CREATE UNIQUE INDEX "billing_kunjunganId_key" ON "billing"("kunjunganId");

-- CreateIndex
CREATE UNIQUE INDEX "billing_nomorInvoice_key" ON "billing"("nomorInvoice");

-- AddForeignKey
ALTER TABLE "activity_logs" ADD CONSTRAINT "activity_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dokter_profile" ADD CONSTRAINT "dokter_profile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dokter_poli" ADD CONSTRAINT "dokter_poli_dokterProfileId_fkey" FOREIGN KEY ("dokterProfileId") REFERENCES "dokter_profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dokter_poli" ADD CONSTRAINT "dokter_poli_poliId_fkey" FOREIGN KEY ("poliId") REFERENCES "poli"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "jadwal_praktek" ADD CONSTRAINT "jadwal_praktek_dokterPoliId_fkey" FOREIGN KEY ("dokterPoliId") REFERENCES "dokter_poli"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sharing_fee" ADD CONSTRAINT "sharing_fee_dokterProfileId_fkey" FOREIGN KEY ("dokterProfileId") REFERENCES "dokter_profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "perawat" ADD CONSTRAINT "perawat_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kontak_darurat" ADD CONSTRAINT "kontak_darurat_pasienId_fkey" FOREIGN KEY ("pasienId") REFERENCES "pasien"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kunjungan" ADD CONSTRAINT "kunjungan_pasienId_fkey" FOREIGN KEY ("pasienId") REFERENCES "pasien"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kunjungan" ADD CONSTRAINT "kunjungan_dokterId_fkey" FOREIGN KEY ("dokterId") REFERENCES "dokter_profile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kunjungan" ADD CONSTRAINT "kunjungan_poliId_fkey" FOREIGN KEY ("poliId") REFERENCES "poli"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asesmen_perawat" ADD CONSTRAINT "asesmen_perawat_kunjunganId_fkey" FOREIGN KEY ("kunjunganId") REFERENCES "kunjungan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asesmen_perawat" ADD CONSTRAINT "asesmen_perawat_perawatId_fkey" FOREIGN KEY ("perawatId") REFERENCES "perawat"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "soap_note" ADD CONSTRAINT "soap_note_kunjunganId_fkey" FOREIGN KEY ("kunjunganId") REFERENCES "kunjungan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rawat_inap" ADD CONSTRAINT "rawat_inap_pasienId_fkey" FOREIGN KEY ("pasienId") REFERENCES "pasien"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rawat_inap" ADD CONSTRAINT "rawat_inap_kamarId_fkey" FOREIGN KEY ("kamarId") REFERENCES "kamar"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resep" ADD CONSTRAINT "resep_kunjunganId_fkey" FOREIGN KEY ("kunjunganId") REFERENCES "kunjungan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resep" ADD CONSTRAINT "resep_dokterId_fkey" FOREIGN KEY ("dokterId") REFERENCES "dokter_profile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "item_resep" ADD CONSTRAINT "item_resep_resepId_fkey" FOREIGN KEY ("resepId") REFERENCES "resep"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "item_resep" ADD CONSTRAINT "item_resep_obatId_fkey" FOREIGN KEY ("obatId") REFERENCES "obat"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tindakan_poli" ADD CONSTRAINT "tindakan_poli_masterTindakanId_fkey" FOREIGN KEY ("masterTindakanId") REFERENCES "master_tindakan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tindakan_poli" ADD CONSTRAINT "tindakan_poli_poliId_fkey" FOREIGN KEY ("poliId") REFERENCES "poli"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "permintaan_penunjang" ADD CONSTRAINT "permintaan_penunjang_kunjunganId_fkey" FOREIGN KEY ("kunjunganId") REFERENCES "kunjungan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "permintaan_penunjang" ADD CONSTRAINT "permintaan_penunjang_itemPenunjangId_fkey" FOREIGN KEY ("itemPenunjangId") REFERENCES "item_penunjang"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "penggunaan_alat" ADD CONSTRAINT "penggunaan_alat_peralatanId_fkey" FOREIGN KEY ("peralatanId") REFERENCES "peralatan_medis"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "penggunaan_alat" ADD CONSTRAINT "penggunaan_alat_poliId_fkey" FOREIGN KEY ("poliId") REFERENCES "poli"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tindakan" ADD CONSTRAINT "tindakan_kunjunganId_fkey" FOREIGN KEY ("kunjunganId") REFERENCES "kunjungan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tindakan" ADD CONSTRAINT "tindakan_masterTindakanId_fkey" FOREIGN KEY ("masterTindakanId") REFERENCES "master_tindakan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "billing" ADD CONSTRAINT "billing_kunjunganId_fkey" FOREIGN KEY ("kunjunganId") REFERENCES "kunjungan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pembayaran" ADD CONSTRAINT "pembayaran_billingId_fkey" FOREIGN KEY ("billingId") REFERENCES "billing"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
