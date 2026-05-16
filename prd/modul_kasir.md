# PRD: Modul Billing & Kasir (modul_billing.md)

## 1. Pendahuluan
Modul Billing digunakan oleh petugas kasir untuk mengelola siklus keuangan pelayanan pasien di fasilitas kesehatan, mulai dari pembukaan kas (open shift), penarikan tagihan klinis terintegrasi, pemrosesan diskon, berbagai metode settlement, hingga penutupan kas (close shift).

## 2. Alur Kerja Utama (Workflow)
1. **Open Shift:** Kasir menginput modal awal untuk mengaktifkan fungsi transaksi.
2. **Tarik Tagihan:** Kasir memanggil data registrasi pasien untuk menarik semua biaya dari unit pemeriksaan dan farmasi.
3. **Penyesuaian & Diskon:** Kasir dapat memodifikasi item non-obat dan menerapkan diskon jika diperlukan.
4. **Pembayaran:** Kasir memproses pembayaran (Tunai, Non-Tunai, atau Piutang Asuransi).
5. **Close Shift:** Kasir menutup operasional shift dan melakukan rekonsiliasi uang fisik.

---

## 3. Spesifikasi Fungsional

### A. Manajemen Shift Kasir (Open / Close Kas)
- **Open Kas (Awal Shift):**
  - Petugas kasir wajib menginput **Uang Modal Awal** saat membuka sistem di awal shift kerja.
  - **Hard Rule:** Sistem akan mengunci (disable) fitur pencarian pasien, entri data, dan pembuatan tagihan jika kasir belum melakukan proses Open Kas.
- **Close Kas (Akhir Shift):**
  - Dilakukan saat operasional shift petugas berakhir.
  - Kasir wajib melakukan input **Uang Fisik Akhir** yang ada di laci kasir (pencatatan sistem vs uang fisik).
  - Setelah close kas selesai, sistem otomatis mengunci akun kasir tersebut dari transaksi baru hingga shift berikutnya dibuka.

### B. Pemrosesan & Modifikasi Tagihan (Billing Pasien)
- **Penarikan Data Otomatis (Fetch Bill):**
  - Kasir mencari nomor registrasi pasien yang aktif.
  - Sistem otomatis menarik data biaya dari:
    - **Modul Pemeriksaan:** Biaya pendaftaran, pemeriksaan awal, tindakan (Prosedur), penggunaan alat medis (Equipment), dan penunjang (Lab/Radiologi).
    - **Modul Farmasi:** Biaya obat reguler dan obat racikan yang statusnya sudah `Confirmed` oleh apoteker.
- **Modifikasi Item oleh Kasir:**
  - **Tambah Item:** Kasir diizinkan menambah item tagihan non-klinis (contoh: biaya cetak kartu, biaya administrasi, atau sarana prasarana).
  - **Proteksi Obat:** Kasir **dilarang keras** menambah atau mengubah item obat. Segala bentuk transaksi obat wajib melalui modul Farmasi.
  - **Hapus Item:** Kasir dapat menghapus item tagihan penunjang/tindakan (selama belum dibayar dan sudah berkoordinasi dengan unit terkait).

### C. Manajemen Diskon
Sistem mendukung dua jenis pemotongan harga yang dapat diterapkan oleh Kasir:
1. **Diskon Per Item (Item-Level Discount):**
   - Kasir dapat memberikan diskon khusus pada item tindakan, penunjang, atau jasa tertentu.
   - Format input: Nominal (Rupiah) atau Persentase (%).
2. **Diskon Global (Invoice-Level Discount):**
   - Diskon yang memotong total keseluruhan (Grand Total) dari invoice pasien setelah akumulasi semua item.
   - Format input: Nominal (Rupiah) atau Persentase (%).

### D. Metode Pembayaran (Settlement)
Sistem membagi metode pembayaran ke dalam 3 kategori utama:
1. **Tunai (Cash):** Input jumlah uang tunai yang diterima, sistem otomatis menghitung uang kembalian.
2. **Non-Tunai (Card/QRIS/Transfer):** Input nama bank, nomor kartu/referensi, dan tipe kartu (Debit/Kredit).
3. **Asuransi / BPJS (Piutang):** 
   - Digunakan jika penjamin pasien adalah pihak ketiga.
   - Tagihan tidak menghasilkan kas masuk hari itu, melainkan otomatis dialihkan ke **Buku Besar Piutang (Account Receivable)** atas nama institusi asuransi terkait.

---

## 4. Aturan Bisnis & Keamanan (Business Rules)

1. **Kunci Transaksi:** Segera setelah tombol "Bayar" atau "Simpan Tagihan" ditekan, status billing pasien berubah menjadi `Closed/Saved`. Data di modul SOAP, Tindakan, dan Farmasi ikut terkunci (Read-Only) dan tidak bisa di-cancel oleh kasir.
2. **Larangan Pembatalan oleh Kasir:**
   - Petugas Kasir **tidak memiliki hak akses/wewenang** untuk membatalkan (*Cancel*) billing pasien yang sudah berstatus `Saved` atau `Closed`. Tombol *Cancel Bill* akan disembunyikan pada akun role Kasir.
3. **Otorisasi Super Admin:**
   - Pembatalan tagihan yang sudah tersimpan hanya dapat dilakukan melalui akun **Super Admin** atau melalui mekanisme bypass approval (memasukkan PIN/Password Super Admin di layar Kasir).
   - Setiap pembatalan oleh Super Admin wajib mengisi **Alasan Pembatalan** (Reason) untuk kebutuhan log audit internal.
4. **Validasi Obat:** Sistem akan menolak penyerahan nota jika ada item resep obat pasien yang masih berstatus `Pending` di modul Farmasi.
5. **Audit Trail Shift:** Setiap transaksi pembayaran yang sukses akan otomatis tercatat di bawah ID Shift kasir yang sedang aktif untuk mencegah manipulasi laporan keuangan.

---

## 5. Komponen Laporan Shift (Closing Report)
Saat kasir melakukan *Close Kas*, sistem akan menerbitkan laporan ringkas berisi:
- Total Pendapatan Tunai.
- Total Pendapatan Non-Tunai (Per Bank).
- Total Piutang Asuransi/BPJS.
- Selisih Kas (Uang Sistem vs Uang Fisik Akhir yang diinput kasir).

---

## 6. Struktur Data Tambahan



| Field | Tipe | Deskripsi |
| :--- | :--- | :--- |
| `Shift_Status` | Enum | Status kasir: `Open` atau `Closed`. |
| `Discount_Item` | Currency / Percentage | Diskon yang ditempelkan langsung pada baris item tagihan. |
| `Discount_Global` | Currency / Percentage | Diskon akhir untuk memotong total satu invoice. |
| `Cancelled_By` | Foreign Key (User ID) | Hanya dapat diisi oleh User ID yang memiliki role `Super Admin`. |
| `Cancel_Reason` | Text | Catatan wajib mengapa tagihan tersebut dibatalkan. |
