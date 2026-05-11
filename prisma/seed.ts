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

    // Master Tindakan lama dihapus — digantikan oleh seedMasterdataV2

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

    // ── Masterdata V2 ──────────────────────────────────────
    await seedMasterdataV2(prisma);

    console.log("\n✅ Seeding selesai!");
    console.log("📋 Default password semua akun: Admin@1234");
    console.log("⚠️  Segera ganti password setelah login pertama!");
  } finally {
    await prisma.$disconnect();
  }
}

async function seedMasterdataV2(prisma: Awaited<ReturnType<typeof import("../src/lib/db").createPrismaClient>>) {
  // Poli
  const poliData = [
    { nama: "Poli Umum",      kode: "PU",  lantai: "Lantai 1" },
    { nama: "Poli Mata",      kode: "PM",  lantai: "Lantai 1" },
    { nama: "Poli Gigi",      kode: "PG",  lantai: "Lantai 2" },
    { nama: "Poli Bedah",     kode: "PB",  lantai: "Lantai 2" },
    { nama: "Poli Anak",      kode: "PA",  lantai: "Lantai 1" },
    { nama: "Poli Kebidanan", kode: "PKB", lantai: "Lantai 3" },
  ];
  const polis = await Promise.all(poliData.map(p =>
    prisma.poli.upsert({ where: { kode: p.kode }, update: {}, create: p })
  ));
  const poliMap = Object.fromEntries(polis.map(p => [p.kode, p.id]));
  console.log(`✓ Poli V2 (${polis.length})`);

  // Tindakan (Lokal)
  const tindakanData = [
    { kode: "T001", nama: "Pemeriksaan Fisik Umum",  tarif: 50000,  poliKodes: ["PU","PA","PKB"] },
    { kode: "T002", nama: "Pemeriksaan Visus",        tarif: 75000,  poliKodes: ["PM"] },
    { kode: "T003", nama: "Tonometri",                tarif: 100000, poliKodes: ["PM"] },
    { kode: "T004", nama: "Ekstraksi Gigi",           tarif: 150000, poliKodes: ["PG"] },
    { kode: "T005", nama: "Pemasangan Tambal Gigi",   tarif: 200000, poliKodes: ["PG"] },
    { kode: "T006", nama: "Pemasangan Infus",          tarif: 85000,  poliKodes: ["PU","PB","PA","PKB"] },
    { kode: "T007", nama: "Jahit Luka",                tarif: 120000, poliKodes: ["PU","PB"] },
    { kode: "T008", nama: "Sirkumsisi",                tarif: 500000, poliKodes: ["PB"] },
    { kode: "T009", nama: "USG Obstetri",              tarif: 250000, poliKodes: ["PKB"] },
    { kode: "T010", nama: "Nebulisasi",                tarif: 60000,  poliKodes: ["PU","PA"] },
  ];
  for (const t of tindakanData) {
    const tindakan = await prisma.masterTindakan.upsert({
      where: { kode: t.kode }, update: {},
      create: { kode: t.kode, nama: t.nama, tarif: t.tarif, kategori: "TINDAKAN" },
    });
    await prisma.tindakanPoli.createMany({
      data: t.poliKodes.map(k => ({ masterTindakanId: tindakan.id, poliId: poliMap[k] })),
      skipDuplicates: true,
    });
  }
  console.log(`✓ Tindakan (${tindakanData.length}) + mapping`);

  // Lab
  const labData = [
    { kode: "L001", nama: "Darah Lengkap",                       tarif: 85000,  satuanWaktu: "2 jam" },
    { kode: "L002", nama: "Urinalisis",                          tarif: 45000,  satuanWaktu: "1 jam" },
    { kode: "L003", nama: "Gula Darah Sewaktu",                  tarif: 30000,  satuanWaktu: "30 menit" },
    { kode: "L004", nama: "HbA1C",                               tarif: 120000, satuanWaktu: "3 jam" },
    { kode: "L005", nama: "Fungsi Ginjal (Ureum/Kreatinin)",      tarif: 95000,  satuanWaktu: "2 jam" },
    { kode: "L006", nama: "Fungsi Hati (SGOT/SGPT)",             tarif: 95000,  satuanWaktu: "2 jam" },
    { kode: "L007", nama: "Profil Lipid",                        tarif: 110000, satuanWaktu: "3 jam" },
    { kode: "L008", nama: "Kultur Darah",                        tarif: 250000, satuanWaktu: "5 hari kerja" },
  ];
  await prisma.itemPenunjang.createMany({
    data: labData.map(l => ({ ...l, kategori: "LAB" as const })),
    skipDuplicates: true,
  });
  console.log(`✓ Lab (${labData.length})`);

  // Radiologi
  const radData = [
    { kode: "R001", nama: "Foto Thorax PA",      tarif: 150000,  satuanWaktu: "1 jam" },
    { kode: "R002", nama: "USG Abdomen",         tarif: 300000,  satuanWaktu: "30 menit" },
    { kode: "R003", nama: "CT-Scan Kepala",      tarif: 900000,  satuanWaktu: "2 jam" },
    { kode: "R004", nama: "MRI Lumbal",          tarif: 2500000, satuanWaktu: "2 jam" },
    { kode: "R005", nama: "EKG 12 Lead",         tarif: 120000,  satuanWaktu: "30 menit" },
    { kode: "R006", nama: "Foto Panoramik Gigi", tarif: 200000,  satuanWaktu: "30 menit" },
  ];
  await prisma.itemPenunjang.createMany({
    data: radData.map(r => ({ ...r, kategori: "RADIOLOGI" as const })),
    skipDuplicates: true,
  });
  console.log(`✓ Radiologi (${radData.length})`);

  // Peralatan
  const peralatanData = [
    { kode: "A001", nama: "Oxymeter",           merk: "Contec",        nomorSeri: "CX8001" },
    { kode: "A002", nama: "Tensimeter Digital", merk: "Omron",         nomorSeri: "OM7200" },
    { kode: "A003", nama: "Nebulizer",          merk: "Omron",         nomorSeri: "NEB001" },
    { kode: "A004", nama: "ECG Monitor 12 Lead",merk: "GE Healthcare", nomorSeri: "GE1200" },
    { kode: "A005", nama: "Glucometer",         merk: "Accu-Check",    nomorSeri: "AC4500" },
    { kode: "A006", nama: "Infusion Pump",      merk: "Terumo",        nomorSeri: "TE2200" },
  ];
  await prisma.peralatanMedis.createMany({ data: peralatanData, skipDuplicates: true });
  console.log(`✓ Peralatan (${peralatanData.length})`);
}

main().catch((e) => {
  console.error("❌ Seed gagal:", e);
  process.exit(1);
});
