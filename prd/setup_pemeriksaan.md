# PRD: Fitur Pemeriksaan Tahap 1 (setup_pemeriksaan.md)

## 1. Tab 1: List Pasien (Waiting Area)
**Tujuan:** Mengelola antrean pasien yang telah terdaftar dan mencatat waktu tunggu secara akurat.

### Fitur Utama:
- **Daftar Antrean Real-time:** Menampilkan pasien dengan status "Terdaftar" dari bagian pendaftaran.
- **Konfirmasi Kedatangan (Timestamps):** 
    - Perawat menekan tombol **"Panggil/Konfirmasi"** saat pasien tiba di area pemeriksaan.
    - Sistem mencatat `Waiting_Time_Start` secara otomatis untuk audit *Service Level Agreement* (SLA).
- **Indikator Prioritas:** Menampilkan label jenis penjamin (Umum/BPJS) dan kategori urgensi (jika ada).

---

## 2. Tab 2: Dashboard Pemeriksaan (Detail Pasien)
**Tujuan:** Menampilkan profil lengkap pasien untuk entri data medis awal. Tampilan ini mengacu pada komponen di Gambar Referensi.

### Komponen Header (Data Identitas):
- **Identitas Utama:** Foto pasien, Nama Lengkap, Nomor Rekam Medis (MRN), Jenis Kelamin, dan Usia.
- **Vitals Summary:** 
    - Input/Display: Berat Badan (Weight), Tinggi Badan (Height), Body Mass Index (BMI), dan Golongan Darah.
- **Registration Info:** Menampilkan dokter penanggung jawab, unit layanan (Poliklinik), dan nomor registrasi.

### Komponen Informasi Klinis:
- **Informasi Rujukan:** Menampilkan asal kedatangan (contoh: Keinginan Sendiri).
- **Alert System:** Panel khusus untuk **Catatan Penting** dan **Alergi** (harus terlihat mencolok/highlight merah jika ada alergi).

### Komponen Info Registrasi & Data Perawatan:
- **Status Perawatan:** Menampilkan tanggal masuk dan status (contoh: "Pasien masih dalam perawatan").
- **Detail Layanan:** Poliklinik tujuan, Dokter pemeriksa, dan kolom input ICD-10 (jika sudah ada diagnosa awal).
- **Panel Aksi (Data Perawatan):**
    - **Batal Registrasi:** Untuk membatalkan kunjungan jika pasien urung diperiksa.
    - **Pasien Keluar:** Untuk menyelesaikan sesi pemeriksaan perawat dan meneruskan ke dokter.

---

## 3. Sidebar Menu Navigasi
Panel kiri menyediakan akses cepat ke modul-modul berikut (Detail spesifikasi akan dibahas pada PRD terpisah):
1. **Data Identitas:** Profil lengkap sosial pasien.
2. **Riwayat Kunjungan:** Rekam jejak medis sebelumnya.
3. **Medical Notes:** Catatan SOAP perawat/dokter.
4. **Penunjang Medis:** Order/Hasil Lab dan Radiologi.
5. **Procedure & Equipment:** Tindakan medis yang dilakukan.
6. **Medication:** Resep obat pasien.
7. **Visite Dokter:** Catatan kunjungan harian (untuk rawat inap).

---

## 4. Aturan Bisnis (Business Rules)
- **Timestamps:** Waktu tunggu dihitung sejak status "Registered" hingga perawat menekan tombol "Konfirmasi" di List Pasien.
- **Sinkronisasi Data:** Perubahan data berat badan atau tinggi badan di Tab Pemeriksaan akan otomatis memperbarui database rekam medis pusat.
- **Akses Kontrol:** Hanya user dengan role "Perawat" atau "Dokter" yang dapat mengubah data klinis di dashboard ini.
