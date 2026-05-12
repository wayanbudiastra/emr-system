# PRD: Detail Pemeriksaan - SOAP (pemeriksaan_SOAP.md)

## 1. Pendahuluan
Modul SOAP (*Subjective, Objective, Assessment, Planning*) digunakan oleh dokter untuk mencatat perkembangan klinis pasien secara sistematis selama proses konsultasi.

## 2. Struktur Konten & Spesifikasi Input

### A. Subjective (S)
**Tujuan:** Mencatat keluhan dan riwayat yang disampaikan oleh pasien.
- **Format:** Free Text (Text Area).
- **Field yang tersedia:**
    - `CC + HPI` (Chief Complaint & History of Present Illness)
    - `Past Medical History`
    - `Past Surgical History`
    - `Allergies`
    - `Other`

### B. Objective (O)
**Tujuan:** Mencatat hasil pemeriksaan fisik dan tanda-tanda vital.
- **Vitals (Automated):** Sistem secara otomatis menarik data (*fetch*) dari pemeriksaan awal (Tab Pemeriksaan) seperti: *Weight, Height, BMI, BP, PR, RR, Temp,* dan *Lingkar Kepala*.
- **Field Lainnya (Free Text):**
    - `Physical Examination`
    - `Systemic Examination`
    - `Observation`
    - `Other`

### C. Assessment (A)
**Tujuan:** Menentukan diagnosa dan identifikasi masalah medis.
- **Diagnosis (Mandatory):** 
    - **Metode:** Menggunakan fitur pencarian (*Autocomplete/Lookup*) dari Master Data Diagnosa (ICD-10).
    - **Sifat:** Wajib diisi minimal satu diagnosa utama.
- **Field Lainnya (Free Text):**
    - `Problems`
    - `Progress Note`
    - `Other`

### D. Planning (P)
**Tujuan:** Menyusun rencana tindakan, terapi, dan instruksi selanjutnya.
- **Order (Automated):** Menampilkan ringkasan data yang telah diinput pada tab *Penunjang Medis* dan *Procedure & Equipment* sebagai referensi dokter.
- **Field Lainnya (Free Text):**
    - `Advice`: Saran medis untuk pasien.
    - `Other`: Catatan perencanaan lainnya.
- *(Catatan: Berdasarkan permintaan, field Konsul Internal, Order OK/VK, dan Prescription tidak diimplementasikan sesuai capture).*

---

## 3. Fitur Utama & Tombol Aksi
1. **Fetch Data Otomatis:** Tombol atau fungsi otomatis untuk memperbarui data `Vitals` dan `Order` jika ada perubahan di tab lain sebelum SOAP disimpan.
2. **Simpan SOAP:** 
    - Melakukan validasi apakah `Diagnosis Utama` sudah terisi.
    - Menyimpan seluruh record ke dalam database Rekam Medis Elektronik (RME).
    - Setelah disimpan, data menjadi *Read-Only* (hanya bisa diubah melalui mekanisme koreksi/audit trail tertentu).

---

## 4. Aturan Bisnis (Business Rules)
1. **Integritas Data:** Data pada bagian `Objective -> Vitals` bersifat sinkron. Jika perawat mengubah data di pemeriksaan awal, maka data di SOAP akan ikut berubah selama belum disimpan secara permanen.
2. **Mandatory Diagnosis:** Sistem akan mencegah proses simpan jika dokter belum memasukkan minimal satu kode ICD-10 pada kolom Assessment.
3. **Pencarian Diagnosa:** Pencarian harus mendukung kata kunci berupa kode (contoh: L73.9) atau deskripsi teks (contoh: Follicular disorder).

---

## 5. Alur Pengguna (User Flow)
1. Dokter membuka tab SOAP.
2. Dokter meninjau data `Objective` (Vitals) yang sudah terisi otomatis.
3. Dokter mengisi keluhan pasien di bagian `Subjective`.
4. Dokter mencari kode ICD-10 di bagian `Assessment`.
5. Dokter memberikan instruksi pada bagian `Planning -> Advice`.
6. Dokter menekan tombol **Simpan SOAP**.
