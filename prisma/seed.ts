import * as dotenv from "dotenv";
dotenv.config();

import { PrismaClient, Role } from "@prisma/client";
import bcrypt from "bcryptjs";
import { prisma } from "../src/lib/prisma";

async function main() {
  console.log("Seeding database...");
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

    // Profil Dokter V3 akan di-seed lewat seedDokterV3() setelah seedMasterdataV2

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

    // ── Dokter V3 ──────────────────────────────────────────
    await seedDokterV3(prisma);

    // ── Pasien ─────────────────────────────────────────────
    await seedPasien(prisma);

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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function seedPasien(prisma: any) {
  type KontakInput = { nama: string; nomorHP: string; hubungan: string; isPrimary: boolean };
  type PasienInput = {
    nomorRM: string; nama: string; tempatLahir: string; tanggalLahir: Date;
    jenisKelamin: string; tipePasien: string;
    nik?: string; noBPJS?: string;
    noPaspor?: string; negaraAsal?: string; noAsuransi?: string;
    alamat: string; telepon: string; email?: string;
    golonganDarah?: string; alergi?: string;
    kontakDarurat: KontakInput[];
  };

  const wniPasien: PasienInput[] = [
    { nomorRM: 'RM-000001', nama: 'Budi Santoso', tempatLahir: 'Jakarta', tanggalLahir: new Date('1985-03-15'), jenisKelamin: 'LAKI_LAKI', tipePasien: 'WNI', nik: '3174051503850001', noBPJS: '0001234567890', alamat: 'Jl. Merdeka No. 12, Kelurahan Gambir, Jakarta Pusat', telepon: '081234567890', email: 'budi.santoso@email.com', golonganDarah: 'A', kontakDarurat: [{ nama: 'Siti Santoso', nomorHP: '081298765432', hubungan: 'ISTRI', isPrimary: true }] },
    { nomorRM: 'RM-000002', nama: 'Dewi Rahayu', tempatLahir: 'Bandung', tanggalLahir: new Date('1992-07-22'), jenisKelamin: 'PEREMPUAN', tipePasien: 'WNI', nik: '3273226207920001', noBPJS: '0001234567891', alamat: 'Jl. Sukajadi No. 45, Sukajadi, Bandung', telepon: '082234567891', email: 'dewi.rahayu@email.com', golonganDarah: 'B', kontakDarurat: [{ nama: 'Agus Rahayu', nomorHP: '082298765432', hubungan: 'SUAMI', isPrimary: true }] },
    { nomorRM: 'RM-000003', nama: 'Ahmad Fauzi', tempatLahir: 'Surabaya', tanggalLahir: new Date('1978-11-08'), jenisKelamin: 'LAKI_LAKI', tipePasien: 'WNI', nik: '3578080811780001', alamat: 'Jl. Raya Gubeng No. 33, Gubeng, Surabaya', telepon: '083334567892', golonganDarah: 'O', alergi: 'Penisilin', kontakDarurat: [{ nama: 'Fatimah Fauzi', nomorHP: '083398765432', hubungan: 'ISTRI', isPrimary: true }] },
    { nomorRM: 'RM-000004', nama: 'Siti Nurhaliza', tempatLahir: 'Yogyakarta', tanggalLahir: new Date('1995-04-30'), jenisKelamin: 'PEREMPUAN', tipePasien: 'WNI', nik: '3471706404950001', noBPJS: '0001234567892', alamat: 'Jl. Malioboro No. 88, Gedong Tengen, Yogyakarta', telepon: '084456789012', golonganDarah: 'AB', kontakDarurat: [{ nama: 'Hasan Nurhaliza', nomorHP: '084498765432', hubungan: 'AYAH', isPrimary: true }] },
    { nomorRM: 'RM-000005', nama: 'Rizky Pratama', tempatLahir: 'Medan', tanggalLahir: new Date('1990-09-14'), jenisKelamin: 'LAKI_LAKI', tipePasien: 'WNI', nik: '1271141409900001', alamat: 'Jl. Gatot Subroto No. 21, Medan Baru, Medan', telepon: '085556789013', golonganDarah: 'A', kontakDarurat: [{ nama: 'Linda Pratama', nomorHP: '085598765432', hubungan: 'IBU', isPrimary: true }] },
    { nomorRM: 'RM-000006', nama: 'Nurul Hidayah', tempatLahir: 'Makassar', tanggalLahir: new Date('1988-02-19'), jenisKelamin: 'PEREMPUAN', tipePasien: 'WNI', nik: '7371796102880001', noBPJS: '0001234567893', alamat: 'Jl. Penghibur No. 10, Ujung Pandang, Makassar', telepon: '086612345678', email: 'nurul.hidayah@email.com', golonganDarah: 'B', kontakDarurat: [{ nama: 'Rahmat Hidayah', nomorHP: '086698765432', hubungan: 'SUAMI', isPrimary: true }] },
    { nomorRM: 'RM-000007', nama: 'Dian Permata', tempatLahir: 'Semarang', tanggalLahir: new Date('1993-06-25'), jenisKelamin: 'PEREMPUAN', tipePasien: 'WNI', nik: '3374696506930001', alamat: 'Jl. Pemuda No. 77, Semarang Tengah, Semarang', telepon: '087712345679', golonganDarah: 'O', kontakDarurat: [{ nama: 'Teguh Permata', nomorHP: '087798765432', hubungan: 'AYAH', isPrimary: true }] },
    { nomorRM: 'RM-000008', nama: 'Hendra Wijaya', tempatLahir: 'Palembang', tanggalLahir: new Date('1975-12-03'), jenisKelamin: 'LAKI_LAKI', tipePasien: 'WNI', nik: '1671030312750001', noBPJS: '0001234567894', alamat: 'Jl. Merdeka No. 55, Ilir Timur, Palembang', telepon: '088812345680', golonganDarah: 'A', alergi: 'Seafood', kontakDarurat: [{ nama: 'Rini Wijaya', nomorHP: '088898765432', hubungan: 'ISTRI', isPrimary: true }, { nama: 'Eko Wijaya', nomorHP: '088887654321', hubungan: 'ANAK', isPrimary: false }] },
    { nomorRM: 'RM-000009', nama: 'Fitria Anggraini', tempatLahir: 'Balikpapan', tanggalLahir: new Date('1997-08-17'), jenisKelamin: 'PEREMPUAN', tipePasien: 'WNI', nik: '6471571708970001', alamat: 'Jl. Sudirman No. 34, Balikpapan Selatan, Balikpapan', telepon: '089912345681', email: 'fitria.anggraini@email.com', golonganDarah: 'AB', kontakDarurat: [{ nama: 'Wati Anggraini', nomorHP: '089998765432', hubungan: 'IBU', isPrimary: true }] },
    { nomorRM: 'RM-000010', nama: 'Wahyu Setiawan', tempatLahir: 'Denpasar', tanggalLahir: new Date('1983-05-28'), jenisKelamin: 'LAKI_LAKI', tipePasien: 'WNI', nik: '5171282805830001', noBPJS: '0001234567895', alamat: 'Jl. Raya Kuta No. 12, Kuta, Denpasar', telepon: '081012345682', golonganDarah: 'B', kontakDarurat: [{ nama: 'Sri Setiawan', nomorHP: '081098765432', hubungan: 'ISTRI', isPrimary: true }] },
    { nomorRM: 'RM-000011', nama: 'Rina Kusumawati', tempatLahir: 'Malang', tanggalLahir: new Date('1991-01-10'), jenisKelamin: 'PEREMPUAN', tipePasien: 'WNI', nik: '3573776101910001', alamat: 'Jl. Ijen No. 23, Klojen, Malang', telepon: '081112345683', email: 'rina.kusumawati@email.com', golonganDarah: 'O', kontakDarurat: [{ nama: 'Joko Kusumawati', nomorHP: '081198765432', hubungan: 'SUAMI', isPrimary: true }] },
    { nomorRM: 'RM-000012', nama: 'Andi Kurniawan', tempatLahir: 'Pekanbaru', tanggalLahir: new Date('1986-10-05'), jenisKelamin: 'LAKI_LAKI', tipePasien: 'WNI', nik: '1471051005860001', noBPJS: '0001234567896', alamat: 'Jl. Jenderal Sudirman No. 99, Pekanbaru', telepon: '081212345684', golonganDarah: 'A', alergi: 'Debu', kontakDarurat: [{ nama: 'Maya Kurniawan', nomorHP: '081298765433', hubungan: 'ISTRI', isPrimary: true }] },
    { nomorRM: 'RM-000013', nama: 'Lestari Wulandari', tempatLahir: 'Pontianak', tanggalLahir: new Date('1994-03-22'), jenisKelamin: 'PEREMPUAN', tipePasien: 'WNI', nik: '6171882203940001', alamat: 'Jl. Gajah Mada No. 67, Pontianak Kota, Pontianak', telepon: '081312345685', golonganDarah: 'B', kontakDarurat: [{ nama: 'Susilo Wulandari', nomorHP: '081398765433', hubungan: 'AYAH', isPrimary: true }] },
    { nomorRM: 'RM-000014', nama: 'Bambang Sutrisno', tempatLahir: 'Solo', tanggalLahir: new Date('1970-07-16'), jenisKelamin: 'LAKI_LAKI', tipePasien: 'WNI', nik: '3372161607700001', noBPJS: '0001234567897', alamat: 'Jl. Slamet Riyadi No. 44, Laweyan, Solo', telepon: '081412345686', email: 'bambang.sutrisno@email.com', golonganDarah: 'AB', kontakDarurat: [{ nama: 'Sri Sutrisno', nomorHP: '081498765433', hubungan: 'ISTRI', isPrimary: true }, { nama: 'Doni Sutrisno', nomorHP: '081487654321', hubungan: 'ANAK', isPrimary: false }] },
    { nomorRM: 'RM-000015', nama: 'Yuni Ratnasari', tempatLahir: 'Tasikmalaya', tanggalLahir: new Date('1996-12-07'), jenisKelamin: 'PEREMPUAN', tipePasien: 'WNI', nik: '3279876512960001', alamat: 'Jl. HZ Mustofa No. 15, Cihideung, Tasikmalaya', telepon: '081512345687', golonganDarah: 'O', kontakDarurat: [{ nama: 'Agus Ratnasari', nomorHP: '081598765433', hubungan: 'AYAH', isPrimary: true }] },
    { nomorRM: 'RM-000016', nama: 'Fajar Nugroho', tempatLahir: 'Banjarmasin', tanggalLahir: new Date('1982-04-11'), jenisKelamin: 'LAKI_LAKI', tipePasien: 'WNI', nik: '6371111104820001', noBPJS: '0001234567898', alamat: 'Jl. Ahmad Yani No. 88, Banjarmasin Selatan', telepon: '081612345688', golonganDarah: 'A', kontakDarurat: [{ nama: 'Dewi Nugroho', nomorHP: '081698765433', hubungan: 'ISTRI', isPrimary: true }] },
    { nomorRM: 'RM-000017', nama: 'Indah Permatasari', tempatLahir: 'Bogor', tanggalLahir: new Date('1989-09-29'), jenisKelamin: 'PEREMPUAN', tipePasien: 'WNI', nik: '3201896909890001', alamat: 'Jl. Pajajaran No. 56, Bogor Tengah, Bogor', telepon: '081712345689', email: 'indah.permatasari@email.com', golonganDarah: 'B', alergi: 'Udang', kontakDarurat: [{ nama: 'Hendi Permatasari', nomorHP: '081798765433', hubungan: 'SUAMI', isPrimary: true }] },
    { nomorRM: 'RM-000018', nama: 'Suprapto Hadi', tempatLahir: 'Purwokerto', tanggalLahir: new Date('1965-06-18'), jenisKelamin: 'LAKI_LAKI', tipePasien: 'WNI', nik: '3302181806650001', noBPJS: '0001234567899', alamat: 'Jl. Sudirman No. 11, Purwokerto Selatan, Banyumas', telepon: '081812345690', golonganDarah: 'O', kontakDarurat: [{ nama: 'Suminah Hadi', nomorHP: '081898765433', hubungan: 'ISTRI', isPrimary: true }] },
    { nomorRM: 'RM-000019', nama: 'Mega Putri', tempatLahir: 'Lampung', tanggalLahir: new Date('1998-02-14'), jenisKelamin: 'PEREMPUAN', tipePasien: 'WNI', nik: '1801946402980001', alamat: 'Jl. Raden Intan No. 33, Tanjung Karang, Bandar Lampung', telepon: '081912345691', golonganDarah: 'AB', kontakDarurat: [{ nama: 'Heni Putri', nomorHP: '081998765433', hubungan: 'IBU', isPrimary: true }] },
    { nomorRM: 'RM-000020', nama: 'Teguh Prasetyo', tempatLahir: 'Cirebon', tanggalLahir: new Date('1980-11-23'), jenisKelamin: 'LAKI_LAKI', tipePasien: 'WNI', nik: '3275232311800001', noBPJS: '0001234567900', alamat: 'Jl. Siliwangi No. 77, Kejaksan, Cirebon', telepon: '082012345692', golonganDarah: 'A', kontakDarurat: [{ nama: 'Tuti Prasetyo', nomorHP: '082098765433', hubungan: 'ISTRI', isPrimary: true }] },
    { nomorRM: 'RM-000021', nama: 'Putri Handayani', tempatLahir: 'Mataram', tanggalLahir: new Date('1993-08-07'), jenisKelamin: 'PEREMPUAN', tipePasien: 'WNI', nik: '5271944708930001', alamat: 'Jl. Pejanggik No. 22, Cakranegara, Mataram', telepon: '082112345693', email: 'putri.handayani@email.com', golonganDarah: 'B', kontakDarurat: [{ nama: 'Yayuk Handayani', nomorHP: '082198765433', hubungan: 'IBU', isPrimary: true }] },
    { nomorRM: 'RM-000022', nama: 'Rudi Hermawan', tempatLahir: 'Kupang', tanggalLahir: new Date('1977-05-31'), jenisKelamin: 'LAKI_LAKI', tipePasien: 'WNI', nik: '5371313105770001', noBPJS: '0001234567901', alamat: 'Jl. El Tari No. 44, Kelapa Lima, Kupang', telepon: '082212345694', golonganDarah: 'O', kontakDarurat: [{ nama: 'Ana Hermawan', nomorHP: '082298765434', hubungan: 'ISTRI', isPrimary: true }] },
    { nomorRM: 'RM-000023', nama: 'Sari Dewi Angkasa', tempatLahir: 'Manado', tanggalLahir: new Date('1987-10-16'), jenisKelamin: 'PEREMPUAN', tipePasien: 'WNI', nik: '7171941610870001', alamat: 'Jl. Sam Ratulangi No. 11, Wenang, Manado', telepon: '082312345695', golonganDarah: 'A', alergi: 'Kacang', kontakDarurat: [{ nama: 'Benny Angkasa', nomorHP: '082398765434', hubungan: 'SUAMI', isPrimary: true }] },
    { nomorRM: 'RM-000024', nama: 'Kurniadi Saputra', tempatLahir: 'Padang', tanggalLahir: new Date('1984-01-25'), jenisKelamin: 'LAKI_LAKI', tipePasien: 'WNI', nik: '1371252501840001', noBPJS: '0001234567902', alamat: 'Jl. Khatib Sulaiman No. 99, Padang Utara, Padang', telepon: '082412345696', golonganDarah: 'AB', kontakDarurat: [{ nama: 'Mila Saputra', nomorHP: '082498765434', hubungan: 'ISTRI', isPrimary: true }] },
    { nomorRM: 'RM-000025', nama: 'Laila Nuraini', tempatLahir: 'Jambi', tanggalLahir: new Date('1991-07-03'), jenisKelamin: 'PEREMPUAN', tipePasien: 'WNI', nik: '1571834307910001', alamat: 'Jl. Sultan Thaha No. 55, Pasar, Jambi', telepon: '082512345697', email: 'laila.nuraini@email.com', golonganDarah: 'B', kontakDarurat: [{ nama: 'Hamid Nuraini', nomorHP: '082598765434', hubungan: 'SUAMI', isPrimary: true }] },
    { nomorRM: 'RM-000026', nama: 'Irwan Syahputra', tempatLahir: 'Banda Aceh', tanggalLahir: new Date('1973-04-20'), jenisKelamin: 'LAKI_LAKI', tipePasien: 'WNI', nik: '1101202004730001', noBPJS: '0001234567903', alamat: 'Jl. Tgk Daud Bereueh No. 22, Baiturrahman, Banda Aceh', telepon: '082612345698', golonganDarah: 'O', kontakDarurat: [{ nama: 'Marlina Syahputra', nomorHP: '082698765434', hubungan: 'ISTRI', isPrimary: true }] },
    { nomorRM: 'RM-000027', nama: 'Novia Andriani', tempatLahir: 'Samarinda', tanggalLahir: new Date('1996-11-12'), jenisKelamin: 'PEREMPUAN', tipePasien: 'WNI', nik: '6472741211960001', alamat: 'Jl. Antasari No. 67, Samarinda Ulu, Samarinda', telepon: '082712345699', golonganDarah: 'A', kontakDarurat: [{ nama: 'Wawan Andriani', nomorHP: '082798765434', hubungan: 'KAKAK', isPrimary: true }] },
    { nomorRM: 'RM-000028', nama: 'Darmawan Kusuma', tempatLahir: 'Palu', tanggalLahir: new Date('1979-08-09'), jenisKelamin: 'LAKI_LAKI', tipePasien: 'WNI', nik: '7271090908790001', noBPJS: '0001234567904', alamat: 'Jl. Gajah Mada No. 33, Palu Barat, Palu', telepon: '082812345700', golonganDarah: 'AB', kontakDarurat: [{ nama: 'Yeni Kusuma', nomorHP: '082898765434', hubungan: 'ISTRI', isPrimary: true }] },
    { nomorRM: 'RM-000029', nama: 'Trisna Widyaningrum', tempatLahir: 'Kediri', tanggalLahir: new Date('1994-02-28'), jenisKelamin: 'PEREMPUAN', tipePasien: 'WNI', nik: '3517882802940001', alamat: 'Jl. Dhoho No. 44, Kota, Kediri', telepon: '082912345701', email: 'trisna.widya@email.com', golonganDarah: 'B', kontakDarurat: [{ nama: 'Sutomo Widyaningrum', nomorHP: '082998765434', hubungan: 'AYAH', isPrimary: true }] },
    { nomorRM: 'RM-000030', nama: 'Agus Budiman', tempatLahir: 'Bekasi', tanggalLahir: new Date('1988-06-15'), jenisKelamin: 'LAKI_LAKI', tipePasien: 'WNI', nik: '3275151506880001', noBPJS: '0001234567905', alamat: 'Jl. Ahmad Yani No. 88, Bekasi Timur, Bekasi', telepon: '083012345702', golonganDarah: 'O', kontakDarurat: [{ nama: 'Erna Budiman', nomorHP: '083098765434', hubungan: 'ISTRI', isPrimary: true }] },
  ];

  const wnaPasien: PasienInput[] = [
    { nomorRM: 'RM-000031', nama: 'John Smith', tempatLahir: 'New York', tanggalLahir: new Date('1985-04-12'), jenisKelamin: 'LAKI_LAKI', tipePasien: 'WNA', noPaspor: 'US1234567', negaraAsal: 'Amerika Serikat', noAsuransi: 'INS-US-001', alamat: 'Jl. Sunset Road No. 88, Kuta, Bali', telepon: '081311111001', email: 'john.smith@email.com', golonganDarah: 'A', kontakDarurat: [{ nama: 'Jane Smith', nomorHP: '081311112001', hubungan: 'ISTRI', isPrimary: true }] },
    { nomorRM: 'RM-000032', nama: 'Emma Johnson', tempatLahir: 'London', tanggalLahir: new Date('1990-09-25'), jenisKelamin: 'PEREMPUAN', tipePasien: 'WNA', noPaspor: 'GB9876543', negaraAsal: 'Inggris', noAsuransi: 'INS-GB-001', alamat: 'Jl. Raya Seminyak No. 12, Seminyak, Bali', telepon: '081311111002', email: 'emma.johnson@email.com', golonganDarah: 'B', kontakDarurat: [{ nama: 'James Johnson', nomorHP: '081311112002', hubungan: 'SUAMI', isPrimary: true }] },
    { nomorRM: 'RM-000033', nama: 'Yuki Tanaka', tempatLahir: 'Tokyo', tanggalLahir: new Date('1988-01-17'), jenisKelamin: 'LAKI_LAKI', tipePasien: 'WNA', noPaspor: 'JP5678901', negaraAsal: 'Jepang', noAsuransi: 'INS-JP-001', alamat: 'Jl. Bypass Ngurah Rai No. 45, Tuban, Bali', telepon: '081311111003', golonganDarah: 'O', kontakDarurat: [{ nama: 'Keiko Tanaka', nomorHP: '081311112003', hubungan: 'ISTRI', isPrimary: true }] },
    { nomorRM: 'RM-000034', nama: 'Sophie Martin', tempatLahir: 'Paris', tanggalLahir: new Date('1993-06-08'), jenisKelamin: 'PEREMPUAN', tipePasien: 'WNA', noPaspor: 'FR2345678', negaraAsal: 'Prancis', noAsuransi: 'INS-FR-001', alamat: 'Jl. Oberoi No. 7, Legian, Bali', telepon: '081311111004', email: 'sophie.martin@email.com', golonganDarah: 'AB', kontakDarurat: [{ nama: 'Pierre Martin', nomorHP: '081311112004', hubungan: 'SUAMI', isPrimary: true }] },
    { nomorRM: 'RM-000035', nama: 'Michael Brown', tempatLahir: 'Sydney', tanggalLahir: new Date('1982-11-30'), jenisKelamin: 'LAKI_LAKI', tipePasien: 'WNA', noPaspor: 'AU3456789', negaraAsal: 'Australia', noAsuransi: 'INS-AU-001', alamat: 'Jl. Pantai Kuta No. 18, Kuta, Bali', telepon: '081311111005', golonganDarah: 'A', alergi: 'Kacang', kontakDarurat: [{ nama: 'Sarah Brown', nomorHP: '081311112005', hubungan: 'ISTRI', isPrimary: true }] },
    { nomorRM: 'RM-000036', nama: 'Wei Chen', tempatLahir: 'Shanghai', tanggalLahir: new Date('1991-03-22'), jenisKelamin: 'LAKI_LAKI', tipePasien: 'WNA', noPaspor: 'CN4567890', negaraAsal: 'Tiongkok', noAsuransi: 'INS-CN-001', alamat: 'Jl. Raya Ubud No. 33, Ubud, Bali', telepon: '081311111006', golonganDarah: 'B', kontakDarurat: [{ nama: 'Li Chen', nomorHP: '081311112006', hubungan: 'ISTRI', isPrimary: true }] },
    { nomorRM: 'RM-000037', nama: 'Anna Mueller', tempatLahir: 'Berlin', tanggalLahir: new Date('1987-07-14'), jenisKelamin: 'PEREMPUAN', tipePasien: 'WNA', noPaspor: 'DE5678901', negaraAsal: 'Jerman', noAsuransi: 'INS-DE-001', alamat: 'Jl. Monkey Forest No. 5, Ubud, Bali', telepon: '081311111007', email: 'anna.mueller@email.com', golonganDarah: 'O', kontakDarurat: [{ nama: 'Hans Mueller', nomorHP: '081311112007', hubungan: 'SUAMI', isPrimary: true }] },
    { nomorRM: 'RM-000038', nama: 'Carlos Rodriguez', tempatLahir: 'Madrid', tanggalLahir: new Date('1984-12-05'), jenisKelamin: 'LAKI_LAKI', tipePasien: 'WNA', noPaspor: 'ES6789012', negaraAsal: 'Spanyol', alamat: 'Jl. Raya Canggu No. 21, Canggu, Bali', telepon: '081311111008', golonganDarah: 'AB', kontakDarurat: [{ nama: 'Maria Rodriguez', nomorHP: '081311112008', hubungan: 'ISTRI', isPrimary: true }] },
    { nomorRM: 'RM-000039', nama: 'Priya Sharma', tempatLahir: 'Mumbai', tanggalLahir: new Date('1995-05-19'), jenisKelamin: 'PEREMPUAN', tipePasien: 'WNA', noPaspor: 'IN7890123', negaraAsal: 'India', noAsuransi: 'INS-IN-001', alamat: 'Jl. Pantai Sanur No. 44, Sanur, Bali', telepon: '081311111009', email: 'priya.sharma@email.com', golonganDarah: 'A', alergi: 'Laktosa', kontakDarurat: [{ nama: 'Raj Sharma', nomorHP: '081311112009', hubungan: 'SUAMI', isPrimary: true }] },
    { nomorRM: 'RM-000040', nama: 'Sven Anderson', tempatLahir: 'Stockholm', tanggalLahir: new Date('1979-08-28'), jenisKelamin: 'LAKI_LAKI', tipePasien: 'WNA', noPaspor: 'SE8901234', negaraAsal: 'Swedia', noAsuransi: 'INS-SE-001', alamat: 'Jl. Raya Nusa Dua No. 77, Nusa Dua, Bali', telepon: '081311111010', golonganDarah: 'B', kontakDarurat: [{ nama: 'Ingrid Anderson', nomorHP: '081311112010', hubungan: 'ISTRI', isPrimary: true }] },
    { nomorRM: 'RM-000041', nama: 'Park Ji Hoon', tempatLahir: 'Seoul', tanggalLahir: new Date('1992-02-11'), jenisKelamin: 'LAKI_LAKI', tipePasien: 'WNA', noPaspor: 'KR9012345', negaraAsal: 'Korea Selatan', noAsuransi: 'INS-KR-001', alamat: 'Jl. Bypass Ngurah Rai No. 102, Jimbaran, Bali', telepon: '081311111011', golonganDarah: 'O', kontakDarurat: [{ nama: 'Kim Na Yeon', nomorHP: '081311112011', hubungan: 'ISTRI', isPrimary: true }] },
    { nomorRM: 'RM-000042', nama: 'Isabella Rossi', tempatLahir: 'Roma', tanggalLahir: new Date('1989-10-03'), jenisKelamin: 'PEREMPUAN', tipePasien: 'WNA', noPaspor: 'IT0123456', negaraAsal: 'Italia', noAsuransi: 'INS-IT-001', alamat: 'Jl. Raya Petitenget No. 9, Kerobokan, Bali', telepon: '081311111012', email: 'isabella.rossi@email.com', golonganDarah: 'AB', kontakDarurat: [{ nama: 'Marco Rossi', nomorHP: '081311112012', hubungan: 'SUAMI', isPrimary: true }] },
    { nomorRM: 'RM-000043', nama: 'David Wilson', tempatLahir: 'Toronto', tanggalLahir: new Date('1986-04-27'), jenisKelamin: 'LAKI_LAKI', tipePasien: 'WNA', noPaspor: 'CA1234567', negaraAsal: 'Kanada', noAsuransi: 'INS-CA-001', alamat: 'Jl. Raya Gianyar No. 56, Gianyar, Bali', telepon: '081311111013', golonganDarah: 'A', kontakDarurat: [{ nama: 'Emily Wilson', nomorHP: '081311112013', hubungan: 'ISTRI', isPrimary: true }] },
    { nomorRM: 'RM-000044', nama: 'Mia Van Der Berg', tempatLahir: 'Amsterdam', tanggalLahir: new Date('1994-09-14'), jenisKelamin: 'PEREMPUAN', tipePasien: 'WNA', noPaspor: 'NL2345678', negaraAsal: 'Belanda', noAsuransi: 'INS-NL-001', alamat: 'Jl. Raya Legian No. 33, Legian, Bali', telepon: '081311111014', email: 'mia.vanderberg@email.com', golonganDarah: 'B', kontakDarurat: [{ nama: 'Jan Van Der Berg', nomorHP: '081311112014', hubungan: 'SUAMI', isPrimary: true }] },
    { nomorRM: 'RM-000045', nama: 'Ahmed Hassan', tempatLahir: 'Cairo', tanggalLahir: new Date('1983-01-06'), jenisKelamin: 'LAKI_LAKI', tipePasien: 'WNA', noPaspor: 'EG3456789', negaraAsal: 'Mesir', alamat: 'Jl. Pantai Kedonganan No. 14, Jimbaran, Bali', telepon: '081311111015', golonganDarah: 'O', alergi: 'Penisilin', kontakDarurat: [{ nama: 'Fatima Hassan', nomorHP: '081311112015', hubungan: 'ISTRI', isPrimary: true }] },
    { nomorRM: 'RM-000046', nama: 'Natasha Ivanova', tempatLahir: 'Moscow', tanggalLahir: new Date('1990-06-22'), jenisKelamin: 'PEREMPUAN', tipePasien: 'WNA', noPaspor: 'RU4567890', negaraAsal: 'Rusia', noAsuransi: 'INS-RU-001', alamat: 'Jl. Raya Umalas No. 7, Kerobokan, Bali', telepon: '081311111016', email: 'natasha.ivanova@email.com', golonganDarah: 'AB', kontakDarurat: [{ nama: 'Dmitri Ivanov', nomorHP: '081311112016', hubungan: 'SUAMI', isPrimary: true }] },
    { nomorRM: 'RM-000047', nama: 'Liam O-Brien', tempatLahir: 'Dublin', tanggalLahir: new Date('1987-03-18'), jenisKelamin: 'LAKI_LAKI', tipePasien: 'WNA', noPaspor: 'IE5678901', negaraAsal: 'Irlandia', noAsuransi: 'INS-IE-001', alamat: 'Jl. Raya Berawa No. 29, Canggu, Bali', telepon: '081311111017', golonganDarah: 'A', kontakDarurat: [{ nama: 'Siobhan O-Brien', nomorHP: '081311112017', hubungan: 'ISTRI', isPrimary: true }] },
    { nomorRM: 'RM-000048', nama: 'Mei Lin Zhang', tempatLahir: 'Taipei', tanggalLahir: new Date('1996-11-09'), jenisKelamin: 'PEREMPUAN', tipePasien: 'WNA', noPaspor: 'TW6789012', negaraAsal: 'Taiwan', noAsuransi: 'INS-TW-001', alamat: 'Jl. Danau Tamblingan No. 55, Sanur, Bali', telepon: '081311111018', email: 'meilin.zhang@email.com', golonganDarah: 'B', kontakDarurat: [{ nama: 'Wei Zhang', nomorHP: '081311112018', hubungan: 'AYAH', isPrimary: true }] },
    { nomorRM: 'RM-000049', nama: 'Hans Zimmermann', tempatLahir: 'Zurich', tanggalLahir: new Date('1975-08-31'), jenisKelamin: 'LAKI_LAKI', tipePasien: 'WNA', noPaspor: 'CH7890123', negaraAsal: 'Swiss', noAsuransi: 'INS-CH-001', alamat: 'Jl. Raya Tanah Lot No. 8, Tabanan, Bali', telepon: '081311111019', golonganDarah: 'O', kontakDarurat: [{ nama: 'Heidi Zimmermann', nomorHP: '081311112019', hubungan: 'ISTRI', isPrimary: true }] },
    { nomorRM: 'RM-000050', nama: 'Olivia Santos', tempatLahir: 'Lisboa', tanggalLahir: new Date('1991-05-16'), jenisKelamin: 'PEREMPUAN', tipePasien: 'WNA', noPaspor: 'PT8901234', negaraAsal: 'Portugal', noAsuransi: 'INS-PT-001', alamat: 'Jl. Raya Penestanan No. 3, Ubud, Bali', telepon: '081311111020', email: 'olivia.santos@email.com', golonganDarah: 'AB', kontakDarurat: [{ nama: 'Miguel Santos', nomorHP: '081311112020', hubungan: 'SUAMI', isPrimary: true }] },
  ];

  const allPasien = [...wniPasien, ...wnaPasien];
  let seeded = 0;

  for (const p of allPasien) {
    const { kontakDarurat, ...fields } = p;
    await prisma.pasien.upsert({
      where:  { nomorRM: p.nomorRM },
      update: {},
      create: {
        ...fields,
        noPaspor:  fields.noPaspor?.toUpperCase() ?? undefined,
        kontakDarurat: { create: kontakDarurat },
      },
    });
    seeded++;
  }

  console.log(`✓ Pasien (${seeded}): ${wniPasien.length} WNI + ${wnaPasien.length} WNA`);
}

async function seedDokterV3(prisma: any) {
  const dokterUser = await prisma.user.findFirst({ where: { email: 'dokter@emr.local', role: 'DOKTER' } });
  if (!dokterUser) {
    console.log('⚠ User dokter tidak ditemukan. Lewati seedDokterV3.');
    return;
  }

  const poliUmum = await prisma.poli.findFirst({ where: { kode: 'PU' } });
  const poliMata = await prisma.poli.findFirst({ where: { kode: 'PM' } });
  if (!poliUmum || !poliMata) {
    console.log('⚠ Poli PU/PM tidak ditemukan. Lewati seedDokterV3.');
    return;
  }

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

  for (const f of [
    { kategori: 'TINDAKAN',  persentase: 15 },
    { kategori: 'LAB',       persentase: 10 },
    { kategori: 'RADIOLOGI', persentase: 10 },
    { kategori: 'PERALATAN', persentase: 0  },
  ]) {
    await prisma.sharingFee.upsert({
      where:  { dokterProfileId_kategori: { dokterProfileId: dokterProfile.id, kategori: f.kategori } },
      update: { persentase: f.persentase },
      create: { dokterProfileId: dokterProfile.id, kategori: f.kategori, persentase: f.persentase },
    });
  }
  console.log('✓ Sharing Fee: Tindakan 15% · Lab 10% · Rad 10% · Peralatan 0%');

  const jadwalData = [
    { dokterPoliId: mappingPU.id, hari: 'SENIN',  jamMulai: '08:00', jamSelesai: '12:00', kuotaPasien: 20 },
    { dokterPoliId: mappingPU.id, hari: 'SELASA', jamMulai: '08:00', jamSelesai: '12:00', kuotaPasien: 20 },
    { dokterPoliId: mappingPU.id, hari: 'RABU',   jamMulai: '08:00', jamSelesai: '12:00', kuotaPasien: 20 },
    { dokterPoliId: mappingPU.id, hari: 'KAMIS',  jamMulai: '13:00', jamSelesai: '17:00', kuotaPasien: 15, keterangan: 'Sesi Sore' },
    { dokterPoliId: mappingPU.id, hari: 'JUMAT',  jamMulai: '08:00', jamSelesai: '11:00', kuotaPasien: 12 },
    { dokterPoliId: mappingPM.id, hari: 'SENIN',  jamMulai: '13:00', jamSelesai: '16:00', kuotaPasien: 10 },
    { dokterPoliId: mappingPM.id, hari: 'KAMIS',  jamMulai: '08:00', jamSelesai: '11:00', kuotaPasien: 10 },
    { dokterPoliId: mappingPM.id, hari: 'SABTU',  jamMulai: '08:00', jamSelesai: '12:00', kuotaPasien: 15 },
  ];

  for (const j of jadwalData) {
    const exists = await prisma.jadwalPraktek.findFirst({
      where: { dokterPoliId: j.dokterPoliId, hari: j.hari, jamMulai: j.jamMulai },
    });
    if (!exists) await prisma.jadwalPraktek.create({ data: j });
  }
  console.log(`✓ Jadwal Praktek: ${jadwalData.length} slot`);
  console.log('\n✅ Seed dokter v3 selesai.');
}

main().catch((e) => {
  console.error("❌ Seed gagal:", e);
  process.exit(1);
});
