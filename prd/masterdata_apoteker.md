# PRD: Master Data & Manajemen Stok Apoteker (masterdata_apoteker.md)

## 1. Pendahuluan
Dokumen ini mengatur pengelolaan data master farmasi (obat/alkes) serta sistem pengendalian stok untuk memastikan ketersediaan barang dan akurasi inventaris di apotek/gudang farmasi.menu di letakan pada menu farmasi

---

## 2. Master Data Referensi

### A. Data Satuan
Mengelola list satuan yang digunakan dalam operasional farmasi.
- **Field:** Nama Satuan (contoh: Tablet, Botol, Box, Strip, Pcs).
- **Status:** Aktif/Non-Aktif.

### B. Jenis Barang
Kategorisasi dasar untuk membedakan perlakuan barang.
- **Pilihan:** Obat, Alkes (Alat Kesehatan).

---

## 3. Data Apoteker (Master Obat & Alkes)
Modul utama untuk mendaftarkan item farmasi ke dalam sistem.

### Spesifikasi Field (Updated):


| Field | Tipe | Deskripsi |
| :--- | :--- | :--- |
| **Kode** | String (Unique) | Kode internal barang. |
| **Barcode** | String | Kode fisik barang untuk scan scanner. |
| **Nama Barang** | String | Nama lengkap obat/alkes. |
| **Status** | Boolean / Toggle | **Aktif / Non-Aktif** (Default: Aktif). |
| **Satuan Besar** | Dropdown | Digunakan saat Penerimaan Barang (Contoh: Box). |
| **Satuan Kecil** | Dropdown | Digunakan saat Input ke Pasien/Resep (Contoh: Tablet). |
| **Is Paten** | Boolean | Penentu kategori: Obat Paten atau Generik. |
| **Harga Umum** | Currency | Tarif jual untuk pasien kategori Umum. |
| **Harga BPJS** | Currency | Tarif jual sesuai plafon/regulasi BPJS. |
---

## 4. Manajemen Stok
Fitur untuk mengontrol lalu lintas barang dan keamanan inventaris.

### A. Kontrol Min-Max
- **Min Stock:** Batas minimum stok. Sistem memberikan peringatan (alert) "Reorder Point" jika stok menyentuh angka ini.
- **Max Stock:** Batas maksimum stok di gudang untuk menghindari penumpukan barang berlebih (*overstock*).

### B. Manajemen Expired (Kadaluarsa)
- **Log Expired:** Pencatatan tanggal kadaluarsa per batch nomor produksi.
- **Early Warning:** Laporan otomatis untuk barang yang akan expired dalam kurun waktu 3, 6, atau 12 bulan ke depan.

### C. Gudang Penyimpanan
- **Lokasi:** Definisi lokasi penyimpanan (Contoh: Gudang Utama, Apotek Rawat Jalan, Apotek IGD).
- **Stok per Lokasi:** Sistem harus mampu menampilkan jumlah stok yang berbeda di setiap gudang untuk satu item yang sama.

---

## 5. Aturan Bisnis (Business Rules) - Tambahan Validasi Status

1. **Filter Transaksi (Hard Rule):** 
   - Hanya data dengan **Status = 'Aktif'** yang akan muncul dan dapat dipilih pada modul:
     - Input Resep/Obat di Tab SOAP atau Medication.
     - Input Peralatan (Alkes) di Tab Procedure & Equipment.
     - Proses Penjualan di Apotek.
     - Pembuatan Surat Pesanan (PO) ke Supplier.
2. **Data Non-Aktif:** 
   - Data dengan status **'Non-Aktif'** tetap tersimpan di database untuk keperluan laporan historis (Audit Trail), namun disembunyikan dari semua kolom pencarian (*search/lookup*) transaksi baru.
3. **Perubahan Status:** 
   - Admin dapat mengubah status dari Aktif menjadi Non-Aktif kapan saja (misal: jika obat sudah tidak diproduksi lagi), namun tidak akan membatalkan transaksi yang sudah berjalan sebelumnya.
4. **Validasi Satuan:** User wajib mengisi konversi antara Satuan Besar ke Satuan Kecil agar sistem bisa melakukan *stock breakdown* otomatis.
---

## 6. Laporan (Reporting)
- Laporan Stok Opname.
- Laporan Barang Slow Moving & Fast Moving.
- Laporan Rekapitulasi Barang Expired.
