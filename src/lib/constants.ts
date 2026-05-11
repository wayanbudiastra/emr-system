// Re-export dari lokasi baru agar tidak break import yang sudah ada
export * from "@/utils/format";
export * from "@/utils/medical";

// ── Konstanta domain ──────────────────────────────────────
export const GENDER_OPTIONS = [
  { label: "Laki-laki", value: "LAKI_LAKI" },
  { label: "Perempuan", value: "PEREMPUAN" },
] as const;

export const GOLONGAN_DARAH_OPTIONS = ["A", "B", "AB", "O", "A+", "B+", "AB+", "O+"] as const;

export const STATUS_KUNJUNGAN_LABEL: Record<string, string> = {
  MENUNGGU:           "Menunggu",
  DALAM_PEMERIKSAAN:  "Dalam Pemeriksaan",
  SELESAI:            "Selesai",
  DIBATALKAN:         "Dibatalkan",
};

export const STATUS_BILLING_LABEL: Record<string, string> = {
  BELUM_BAYAR: "Belum Bayar",
  SEBAGIAN:    "Sebagian",
  LUNAS:       "Lunas",
  DIBATALKAN:  "Dibatalkan",
};

export const METODE_PEMBAYARAN_OPTIONS = [
  { label: "Tunai",       value: "TUNAI" },
  { label: "Transfer",    value: "TRANSFER" },
  { label: "BPJS",        value: "BPJS" },
  { label: "Asuransi",    value: "ASURANSI" },
  { label: "Kartu Debit", value: "KARTU_DEBIT" },
  { label: "Kartu Kredit",value: "KARTU_KREDIT" },
] as const;

export const ROLE_LABEL: Record<string, string> = {
  SUPER_ADMIN:  "Super Admin",
  ADMIN:        "Admin",
  DOKTER:       "Dokter",
  PERAWAT:      "Perawat",
  APOTEKER:     "Apoteker",
  KASIR:        "Kasir",
  REKAM_MEDIS:  "Rekam Medis",
  PASIEN:       "Pasien",
};

export const PAGINATION_DEFAULT = {
  page:    1,
  limit:   20,
  maxLimit: 100,
} as const;
