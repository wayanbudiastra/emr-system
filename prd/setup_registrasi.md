# PRD: Fitur Pendaftaran Pasien (setup_registrasi.md)

## 1. Tab 1: Appointment (Reservasi)
**Tujuan:** Mengelola pemesanan jadwal dokter oleh pasien sebelum kunjungan.

### Fitur Utama:
- **Pilih Jadwal:** Filter berdasarkan Spesialisasi, Nama Dokter, dan Tanggal (hanya menampilkan dokter dengan status jadwal 'Aktif').
- **Input Data Pasien:**
  - Cari Pasien (berdasarkan No. RM/Nama) untuk pasien lama.
  - Input Nama, NIK, No. HP, dan Keluhan untuk pasien baru.
- **Validasi Kuota:** Sistem memvalidasi sisa kuota per sesi dokter secara real-time.
- **Output:** Nomor Antrean Appointment & Kode Booking.

---

## 2. Tab 2: Pendaftaran (Registrasi Rawat Jalan)
**Tujuan:** Proses check-in kedatangan atau pendaftaran langsung (Walk-in).

### Alur Kerja:
- **Skenario A (Berdasarkan Appointment):**
  - Input Kode Booking atau Nama Pasien.
  - Sistem otomatis menarik data profil dan jadwal dokter dari Tab Appointment.
  - Admin melengkapi data penjamin (Umum/BPJS/Asuransi).
- **Skenario B (Pendaftaran Langsung/Walk-in):**
  - Jika belum ada appointment, Admin langsung menginput data pasien, memilih dokter yang sedang aktif saat itu, dan menentukan penjamin.
- **Validasi:** Memastikan dokter tujuan memiliki jadwal aktif pada hari pendaftaran.
- **Output:** Status berubah menjadi 'Terdaftar' dan data dikirim ke List Pendaftaran.

---

## 3. Tab 3: List Pendaftaran
**Tujuan:** Monitoring dan manajemen data pasien yang sudah melakukan registrasi.

### Fitur Utama:
- **Tabel Monitoring:** Menampilkan kolom No. Antrean, Nama Pasien, Dokter, Jam Daftar, Penjamin, dan Status (Antre/Diperiksa/Selesai).
- **Fungsi Pembatalan (Cancel):**
  - **Syarat:** Tombol 'Cancel' hanya muncul/aktif jika status billing pasien tersebut belum ditutup (`Status Billing != Closed`).
  - **Efek:** Menghapus pasien dari antrean layanan dan mengembalikan slot kuota dokter jika diperlukan.
- **Filter & Search:** Memudahkan pencarian berdasarkan tanggal kunjungan atau nama pasien.

---

## 4. Parameter Status (Rekomendasi)
- **Status Appointment:** `Booked`, `Checked-in` (Selesai Daftar), `Cancelled`.
- **Status Registrasi:** `Registered`, `In-Progress`, `Completed`, `Cancelled`.
