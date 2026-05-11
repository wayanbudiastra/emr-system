import * as dotenv from "dotenv";
dotenv.config();

import { Role } from "@prisma/client";
import bcrypt from "bcryptjs";
// Seed pakai path relatif karena belum dalam konteks Next.js module resolution
import { createPrismaClient } from "../src/lib/db";

async function main() {
  console.log("Seeding database...");
  const prisma = await createPrismaClient(process.env.DATABASE_URL!);

  try {
    // ── Klinik ─────────────────────────────────────────────
    await prisma.klinik.upsert({
      where: { id: "klinik-1" },
      update: {},
      create: {
        id: "klinik-1",
        nama: "Klinik EMR Sejahtera",
        alamat: "Jl. Kesehatan No. 1, Jakarta",
        telepon: "021-1234567",
        email: "info@emrsejahtera.com",
      },
    });
    console.log("✓ Klinik");

    // ── Poli ───────────────────────────────────────────────
    const poliUmum = await prisma.poli.upsert({
      where: { kode: "UMUM" },
      update: {},
      create: { nama: "Poli Umum", kode: "UMUM" },
    });
    const poliGigi = await prisma.poli.upsert({
      where: { kode: "GIGI" },
      update: {},
      create: { nama: "Poli Gigi", kode: "GIGI" },
    });
    await prisma.poli.upsert({
      where: { kode: "ANAK" },
      update: {},
      create: { nama: "Poli Anak", kode: "ANAK" },
    });
    console.log("✓ Poli (3)");

    // ── Users ──────────────────────────────────────────────
    const adminHash   = await bcrypt.hash("admin123",   10);
    const dokterHash  = await bcrypt.hash("dokter123",  10);
    const perawatHash = await bcrypt.hash("perawat123", 10);

    await prisma.user.upsert({
      where: { email: "admin@emr.com" },
      update: { password: adminHash },
      create: { nama: "Super Admin", email: "admin@emr.com", password: adminHash, role: Role.SUPER_ADMIN },
    });

    const userDokter = await prisma.user.upsert({
      where: { email: "dokter@emr.com" },
      update: { password: dokterHash },
      create: { nama: "Dr. Budi Santoso", email: "dokter@emr.com", password: dokterHash, role: Role.DOKTER },
    });

    const userPerawat = await prisma.user.upsert({
      where: { email: "perawat@emr.com" },
      update: { password: perawatHash },
      create: { nama: "Siti Aminah", email: "perawat@emr.com", password: perawatHash, role: Role.PERAWAT },
    });
    console.log("✓ Users (3)");

    // ── Dokter & Perawat profiles ──────────────────────────
    await prisma.dokter.upsert({
      where: { userId: userDokter.id },
      update: {},
      create: { userId: userDokter.id, nip: "DKT-001", spesialisasi: "Umum", poliId: poliUmum.id },
    });
    await prisma.perawat.upsert({
      where: { userId: userPerawat.id },
      update: {},
      create: { userId: userPerawat.id, nip: "PRW-001" },
    });
    console.log("✓ Profil Dokter & Perawat");

    // ── Kamar ──────────────────────────────────────────────
    const kamarData = [
      { nomorKamar: "101", kelas: "VIP",   kapasitas: 1, tarif: 500_000 },
      { nomorKamar: "201", kelas: "Kelas 1", kapasitas: 2, tarif: 300_000 },
      { nomorKamar: "301", kelas: "Kelas 2", kapasitas: 4, tarif: 150_000 },
    ];
    for (const k of kamarData) {
      await prisma.kamar.upsert({
        where: { nomorKamar: k.nomorKamar },
        update: {},
        create: k,
      });
    }
    console.log("✓ Kamar (3)");

    // ── Master Tindakan ────────────────────────────────────
    const tindakanData = [
      { kode: "KST-001", nama: "Konsultasi Umum",      tarif: 50_000,  kategori: "Konsultasi" },
      { kode: "KST-002", nama: "Konsultasi Spesialis",  tarif: 150_000, kategori: "Konsultasi" },
      { kode: "LAB-001", nama: "Cek Darah Lengkap",     tarif: 120_000, kategori: "Laboratorium" },
      { kode: "LAB-002", nama: "Urine Lengkap",          tarif: 75_000,  kategori: "Laboratorium" },
      { kode: "RAD-001", nama: "Rontgen Thorax",         tarif: 200_000, kategori: "Radiologi" },
      { kode: "TND-001", nama: "Injeksi",                tarif: 30_000,  kategori: "Tindakan" },
      { kode: "TND-002", nama: "Pemasangan Infus",       tarif: 80_000,  kategori: "Tindakan" },
      { kode: "TND-003", nama: "Hecting (penjahitan)",   tarif: 100_000, kategori: "Tindakan" },
    ];
    for (const t of tindakanData) {
      await prisma.masterTindakan.upsert({
        where: { kode: t.kode },
        update: {},
        create: t,
      });
    }
    console.log("✓ Master Tindakan (8)");

    // ── Obat ───────────────────────────────────────────────
    const obatData = [
      { kode: "OBT-001", nama: "Paracetamol 500mg",  generik: "Paracetamol", satuan: "Tablet", stok: 500, harga: 2_000,  hargaBeli: 1_000,  kategori: "Analgesik" },
      { kode: "OBT-002", nama: "Amoxicillin 500mg",   generik: "Amoxicillin",  satuan: "Kapsul", stok: 200, harga: 5_000,  hargaBeli: 3_000,  kategori: "Antibiotik" },
      { kode: "OBT-003", nama: "Omeprazole 20mg",     generik: "Omeprazole",   satuan: "Kapsul", stok: 150, harga: 8_000,  hargaBeli: 5_000,  kategori: "Antasida" },
      { kode: "OBT-004", nama: "Cetirizine 10mg",     generik: "Cetirizine",   satuan: "Tablet", stok: 300, harga: 3_500,  hargaBeli: 2_000,  kategori: "Antihistamin" },
      { kode: "OBT-005", nama: "Metformin 500mg",     generik: "Metformin",    satuan: "Tablet", stok: 100, harga: 4_000,  hargaBeli: 2_500,  kategori: "Antidiabetik" },
      { kode: "OBT-006", nama: "Amlodipine 5mg",      generik: "Amlodipine",   satuan: "Tablet", stok: 80,  harga: 6_000,  hargaBeli: 4_000,  kategori: "Antihipertensi" },
      { kode: "VIT-001", nama: "Vitamin C 500mg",     generik: "Ascorbic Acid",satuan: "Tablet", stok: 400, harga: 2_500,  hargaBeli: 1_200,  kategori: "Vitamin" },
      { kode: "INF-001", nama: "NaCl 0.9% 500ml",    generik: "Sodium Chloride",satuan: "Botol",  stok: 50,  harga: 25_000, hargaBeli: 18_000, kategori: "Cairan Infus" },
    ];
    for (const o of obatData) {
      await prisma.obat.upsert({
        where: { kode: o.kode },
        update: { stok: o.stok },
        create: o,
      });
    }
    console.log("✓ Obat (8)");

    // ── Poli Gigi untuk dokter gigi (opsional, bisa dikembangkan) ──
    void poliGigi; // referenced for future use

    console.log("\n✅ Seeding selesai!");
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error("❌ Seed gagal:", e);
  process.exit(1);
});
