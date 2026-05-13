# PRD: Fitur Manajemen Resep Obat (resep_obat.md)

## 1. Pendahuluan
Dokumen ini mendefinisikan alur kerja pemberian obat kepada pasien, mulai dari input resep oleh Dokter (Medication) hingga verifikasi dan penyerahan oleh Apoteker (Farmasi).

## 2. Alur Kerja Utama (Workflow)
1. **Input Resep:** Dokter menginput resep melalui menu Pemeriksaan. Jika terkendala, Apoteker dapat melakukan input langsung di menu Farmasi.
2. **Validasi Stok:** Sistem mengecek ketersediaan stok dan status aktif obat secara real-time.
3. **Verifikasi Farmasi:** Apoteker memeriksa list resep masuk, melakukan penyesuaian (edit/hapus) jika diperlukan.
4. **Finalisasi:** Apoteker mengonfirmasi resep, mengunci transaksi, mencetak etiket, dan memotong stok.

---

## 3. Spesifikasi Fungsional

### A. Input Obat Non-Racikan (Obat Jadi)
- **Pencarian:** Data muncul setelah mengetik nama obat. 
- **Filter:** Hanya menampilkan obat dengan `Status = Aktif` dan `Stok > 0`.
- **Field Input:**
    - Nama Obat (Autocomplete).
    - Jumlah (Satuan Kecil).
    - Dosis & Aturan Pakai (Signa).

### B. Input Obat Racikan (Puyer/Kapsul/Salep)
- **Header Racikan:** Input Nama Racikan (misal: Puyer Batuk), Metode (Puyer/Kapsul), Jumlah Sediaan, dan Aturan Pakai.
- **Komposisi Bahan:** Multi-input bahan obat ke dalam satu nama racikan.
- **Validasi:** Semua bahan penyusun harus berstatus `Aktif`.
- **Stok:** Pemotongan stok dilakukan per masing-masing bahan penyusun.

### C. Menu Farmasi (Konfirmasi & Verifikasi)
- **Dashboard Resep:** Menampilkan daftar resep `Pending` dari dokter.
- **Otoritas Apoteker:**
    - Dapat mengubah (Edit) jumlah atau jenis obat.
    - Dapat menghapus (Delete) item resep jika stok kosong/tidak sesuai.
- **Konfirmasi Final:** Tombol untuk mengunci transaksi. Setelah diklik, data tidak dapat diubah (Read-Only) dan status tagihan masuk ke Billing.

---

## 4. Aturan Bisnis (Business Rules)

1. **Status Aktif:** Obat yang di-nonaktifkan di Master Data tidak akan muncul dalam pencarian transaksi baru.
2. **Ketersediaan Stok:** Sistem mencegah penyimpanan resep jika `Jumlah Input > Stok Tersedia`.
3. **Satuan Transaksi:**
    - **Satuan Besar:** Digunakan saat penerimaan barang/logistik.
    - **Satuan Kecil:** Digunakan saat input resep (tablet, pcs, ml, dll).
4. **Locking System:** Setelah Apoteker menekan tombol konfirmasi, resep terkunci total untuk menjaga integritas data keuangan dan stok.
5. **Privilese:** Dokter hanya bisa input & lihat. Apoteker bisa input, lihat, edit, hapus, dan konfirmasi.

---

## 5. Struktur Data (Requirement)


| Field | Tipe | Sumber Data |
| :--- | :--- | :--- |
| **Obat_ID** | UUID | Master Data Apoteker |
| **Jenis_Resep** | Dropdown | Non-Racikan / Racikan |
| **Status_Obat** | String | Wajib 'Aktif' |
| **Stok_Current** | Integer | Real-time dari Gudang |
| **Aturan_Pakai** | Text | Input Dokter/Apoteker |
| **Status_Resep** | Enum | `Pending`, `Confirmed`, `Cancelled` |

---

## 6. Output Sistem
- **Cetak Etiket:** Berisi Nama Pasien, Nama Obat/Racikan, dan Aturan Pakai.
- **Integrasi Billing:** Total harga (Harga Umum/BPJS) otomatis terakumulasi ke invoice pasien.
- **Log Stok:** Mencatat pengurangan stok per unit gudang secara otomatis.
