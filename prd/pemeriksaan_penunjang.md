# PRD: Detail Pemeriksaan - Penunjang Medis (pemeriksaan_penunjang.md)

## 1. Pendahuluan
Modul ini digunakan oleh perawat atau dokter untuk membuat permintaan pemeriksaan penunjang (Laboratorium dan Radiologi) selama proses pemeriksaan pasien berlangsung.

## 2. Alur Kerja (Workflow)
1. User masuk ke Tab **Penunjang Medis**.
2. User memilih kategori pemeriksaan (Lab atau Radiologi).
3. User mencari dan memilih jenis pemeriksaan dari katalog (Hanya data dengan **Status Aktif**).
4. User menyimpan permintaan (Order) -> Data terkirim ke modul unit terkait (Lab/Rad).

---

## 3. Spesifikasi Fungsional

### A. Sub-Tab: Laboratorium
**Tujuan:** Input permintaan pemeriksaan sampel (darah, urine, dll).
- **Fitur Pencarian:** Search bar untuk mencari item pemeriksaan (contoh: Darah Rutin, Gula Darah).
- **Filter Otomatis:** Sistem hanya menampilkan item pemeriksaan laboratorium yang memiliki `status = 'Aktif'` di master data.
- **Input Tambahan:**
    - **Prioritas:** Radio button (Cito / Normal).
    - **Catatan Klinis:** Textbox untuk instruksi khusus ke petugas lab.
- **Daftar Order:** Menampilkan list pemeriksaan yang baru saja dipilih sebelum di-submit.

### B. Sub-Tab: Radiologi
**Tujuan:** Input permintaan pemeriksaan pencitraan (X-Ray, USG, MRI, dll).
- **Fitur Pencarian:** Search bar untuk mencari jenis tindakan radiologi (contoh: Thorax PA, USG Abdomen).
- **Filter Otomatis:** Sistem hanya menampilkan item tindakan radiologi yang memiliki `status = 'Aktif'` di master data.
- **Input Tambahan:**
    - **Lokasi Tubuh:** Input/pilihan bagian tubuh (jika diperlukan).
    - **Indikasi Klinis:** Alasan dilakukan pemeriksaan sebagai panduan Dokter Spesialis Radiologi.
- **Daftar Order:** Menampilkan list tindakan yang dipilih.

---

## 4. Komponen Tabel & Data (Data Requirement)
Setiap baris data penunjang yang dipilih harus mengandung informasi:

| Field | Deskripsi |
| :--- | :--- |
| `Item_ID` | Kode unik pemeriksaan (PK). |
| `Item_Name` | Nama pemeriksaan (Lab/Rad). |
| `Category` | Kategori (Laboratorium / Radiologi). |
| `Status` | Wajib 'Aktif' untuk dapat dipilih. |
| `Price` | Harga layanan (otomatis muncul sesuai tarif aktif). |

---

## 5. Aturan Bisnis (Business Rules)
1. **Validasi Status:** Item penunjang yang sudah non-aktif (status = 'Non-Aktif') tidak boleh muncul dalam pencarian/lookup untuk mencegah kesalahan input.
2. **Double Entry:** Sistem memberikan peringatan jika ada pemeriksaan yang sama diinput dua kali untuk satu nomor registrasi yang sama di hari yang sama.
3. **Integration:** Setelah data di-save, sistem otomatis membuat tagihan sementara (pending billing) yang akan dikirim ke unit Lab/Radiologi.
4. **Pembatalan:** Item penunjang hanya bisa dibatalkan jika unit tujuan (Lab/Rad) belum melakukan *accept* atau pengerjaan sampel.

---

## 6. Riwayat Penunjang (History)
Di bagian bawah halaman, tampilkan tabel riwayat pemeriksaan yang sudah dilakukan sebelumnya:
- **Tampilan:** Tanggal Order, Nama Pemeriksaan, Status Hasil (Pending / Terbit Hasil), Link Lihat Hasil (jika sudah ada).
