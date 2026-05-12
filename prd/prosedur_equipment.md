# PRD: Detail Pemeriksaan - Prosedur & Peralatan (prosedur_equipment.md)

## 1. Pendahuluan
Modul ini digunakan untuk mencatat tindakan medis (prosedur) dan penggunaan alat kesehatan (equipment) yang pada pemeriksaan detail diberikan kepada pasien selama masa pemeriksaan di poliklinik.

## 2. Spesifikasi Fungsional

### A. Input Data Tindakan (Prosedur)
**Tujuan:** Mencatat tindakan medis yang dilakukan oleh dokter atau perawat.
- **Filter Pintar (Mapping Poli):** 
    - Sistem secara otomatis hanya menampilkan daftar tindakan yang sudah di-mapping untuk **Poliklinik tujuan pasien** saat ini.
    - Contoh: Jika pasien di Poli Gigi, maka tindakan Poli Mata tidak akan muncul.
- **Validasi Status:** Hanya menampilkan tindakan dengan `status = 'Aktif'`.
- **Atribut Input:**
    - **Nama Tindakan:** Pencarian/Dropdown tindakan terpilih.
    - **Pelaksana:** Pilih Dokter atau Perawat yang melakukan tindakan.
    - **Jumlah:** Default 1 (dapat diubah jika tindakan dilakukan berkali-kali).
    - **Tanggal & Jam:** Otomatis mengikuti waktu input (dapat diedit manual).

### B. Input Data Peralatan (Equipment & BMHP)
**Tujuan:** Mencatat penggunaan alat medis atau Bahan Medis Habis Pakai (BMHP) yang digunakan saat tindakan.
- **Filter Status:** Hanya menampilkan data alat/barang dengan `status = 'Aktif'`.
- **Atribut Input:**
    - **Nama Alat/Barang:** Search bar berdasarkan master data logistik/farmasi.
    - **Jumlah (Qty):** Input angka sesuai penggunaan.
    - **Satuan:** Otomatis muncul (misal: Pcs, Set, Box).
- **Validasi Stok:** Sistem memberikan peringatan jika jumlah yang diinput melebihi stok tersedia (Opsional/Integrasi Logistik).

---

## 3. Aturan Bisnis (Business Rules)
1. **Rule Mapping:** Admin harus melakukan mapping `Tindakan -> Poliklinik` di Master Data agar fitur pencarian di tab ini berfungsi akurat.
2. **Keterkaitan:** Satu tindakan bisa diikuti oleh banyak penggunaan peralatan (One-to-Many).
3. **Status Aktif:** Item (tindakan/alat) yang sudah di-non-aktifkan oleh manajemen tidak boleh muncul di pencarian untuk menghindari kesalahan input tarif dan stok.
4. **Otomasi Billing:** Setiap tindakan dan alat yang disimpan akan langsung masuk ke tagihan (billing) pasien dengan status `Unpaid`.

---

## 4. Tabel Monitoring (List Prosedur & Alat)
Menampilkan daftar yang sudah diinput dalam bentuk tabel:

| No | Jam | Item (Tindakan/Alat) | Kategori | Pelaksana | Qty | Aksi |
|:---|:---|:---|:---|:---|:---|:---|
| 1 | 10:15 | Nebulizer | Tindakan | dr. Andi | 1 | [Hapus] |
| 2 | 10:15 | Masker Nebu | Alat | - | 1 | [Hapus] |

---

## 5. Keamanan & Pembatalan
- **Hak Akses:** Hanya perawat dan dokter di poli terkait yang dapat menambah atau menghapus data.
- **Penghapusan:** Data tindakan/alat hanya bisa dihapus jika status billing pasien belum dibayar/closed.
