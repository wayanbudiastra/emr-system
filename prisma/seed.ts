import * as dotenv from "dotenv";
dotenv.config();

import { Role } from "@prisma/client";
import bcrypt from "bcryptjs";
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
    await prisma.poli.upsert({
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

    // ── Password default ───────────────────────────────────
    const defaultPassword = await bcrypt.hash("Admin@1234", 12);

    const users = [
      { nama: "Super Administrator", email: "superadmin@emr.local", role: Role.SUPER_ADMIN, nip: "SA001" },
      { nama: "Staff Admission",      email: "admission@emr.local",  role: Role.ADMISSION,   nip: "ADM001" },
      { nama: "Staff Kasir",          email: "kasir@emr.local",      role: Role.KASIR,        nip: "KSR001" },
      { nama: "dr. Ahmad Fauzi",      email: "dokter@emr.local",     role: Role.DOKTER,       nip: "DKT001" },
      { nama: "Ns. Siti Rahayu",      email: "perawat@emr.local",    role: Role.PERAWAT,      nip: "PRW001" },
      { nama: "Apt. Budi Santoso",    email: "apoteker@emr.local",   role: Role.APOTEKER,     nip: "APT001" },
    ];

    for (const u of users) {
      await prisma.user.upsert({
        where: { email: u.email },
        update: { password: defaultPassword, nip: u.nip },
        create: { ...u, password: defaultPassword, isActive: true },
      });
      console.log(`  ✓ ${u.nama} [${u.role}]`);
    }
    console.log("✓ Users (6)");

    // ── Profil Dokter ──────────────────────────────────────
    const dokterUser = await prisma.user.findUnique({ where: { email: "dokter@emr.local" } });
    if (dokterUser) {
      await prisma.dokter.upsert({
        where: { userId: dokterUser.id },
        update: {},
        create: { userId: dokterUser.id, sip: "SIP-DKT-001", spesialisasi: "Umum", poliId: poliUmum.id },
      });
    }
    console.log("✓ Profil Dokter");

    // ── Kamar ──────────────────────────────────────────────
    for (const k of [
      { nomorKamar: "101", kelas: "VIP",     kapasitas: 1, tarif: 500_000 },
      { nomorKamar: "201", kelas: "Kelas 1", kapasitas: 2, tarif: 300_000 },
      { nomorKamar: "301", kelas: "Kelas 2", kapasitas: 4, tarif: 150_000 },
    ]) {
      await prisma.kamar.upsert({ where: { nomorKamar: k.nomorKamar }, update: {}, create: k });
    }
    console.log("✓ Kamar (3)");

    // ── Master Tindakan ────────────────────────────────────
    for (const t of [
      { kode: "KST-001", nama: "Konsultasi Umum",     tarif: 50_000,  kategori: "Konsultasi" },
      { kode: "KST-002", nama: "Konsultasi Spesialis", tarif: 150_000, kategori: "Konsultasi" },
      { kode: "LAB-001", nama: "Cek Darah Lengkap",    tarif: 120_000, kategori: "Laboratorium" },
      { kode: "LAB-002", nama: "Urine Lengkap",         tarif: 75_000,  kategori: "Laboratorium" },
      { kode: "RAD-001", nama: "Rontgen Thorax",        tarif: 200_000, kategori: "Radiologi" },
      { kode: "TND-001", nama: "Injeksi",               tarif: 30_000,  kategori: "Tindakan" },
      { kode: "TND-002", nama: "Pemasangan Infus",      tarif: 80_000,  kategori: "Tindakan" },
      { kode: "TND-003", nama: "Hecting",               tarif: 100_000, kategori: "Tindakan" },
    ]) {
      await prisma.masterTindakan.upsert({ where: { kode: t.kode }, update: {}, create: t });
    }
    console.log("✓ Master Tindakan (8)");

    // ── Obat ───────────────────────────────────────────────
    for (const o of [
      { kode: "OBT-001", nama: "Paracetamol 500mg",  generik: "Paracetamol",   satuan: "Tablet", stok: 500, harga: 2_000,  hargaBeli: 1_000,  kategori: "Analgesik" },
      { kode: "OBT-002", nama: "Amoxicillin 500mg",   generik: "Amoxicillin",   satuan: "Kapsul", stok: 200, harga: 5_000,  hargaBeli: 3_000,  kategori: "Antibiotik" },
      { kode: "OBT-003", nama: "Omeprazole 20mg",     generik: "Omeprazole",    satuan: "Kapsul", stok: 150, harga: 8_000,  hargaBeli: 5_000,  kategori: "Antasida" },
      { kode: "OBT-004", nama: "Cetirizine 10mg",     generik: "Cetirizine",    satuan: "Tablet", stok: 300, harga: 3_500,  hargaBeli: 2_000,  kategori: "Antihistamin" },
      { kode: "OBT-005", nama: "Metformin 500mg",     generik: "Metformin",     satuan: "Tablet", stok: 100, harga: 4_000,  hargaBeli: 2_500,  kategori: "Antidiabetik" },
      { kode: "OBT-006", nama: "Amlodipine 5mg",      generik: "Amlodipine",    satuan: "Tablet", stok: 80,  harga: 6_000,  hargaBeli: 4_000,  kategori: "Antihipertensi" },
      { kode: "VIT-001", nama: "Vitamin C 500mg",     generik: "Ascorbic Acid", satuan: "Tablet", stok: 400, harga: 2_500,  hargaBeli: 1_200,  kategori: "Vitamin" },
      { kode: "INF-001", nama: "NaCl 0.9% 500ml",    generik: "Sodium Chloride",satuan: "Botol",  stok: 50,  harga: 25_000, hargaBeli: 18_000, kategori: "Cairan Infus" },
    ]) {
      await prisma.obat.upsert({ where: { kode: o.kode }, update: { stok: o.stok }, create: o });
    }
    console.log("✓ Obat (8)");

    console.log("\n✅ Seeding selesai!");
    console.log("📋 Default password semua akun: Admin@1234");
    console.log("⚠️  Segera ganti password setelah login pertama!");
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error("❌ Seed gagal:", e);
  process.exit(1);
});
