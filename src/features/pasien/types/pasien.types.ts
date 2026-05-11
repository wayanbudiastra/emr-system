export type TipePasien = 'WNI' | 'WNA';
export type JenisKelamin = 'LAKI_LAKI' | 'PEREMPUAN';
export type GolonganDarah = 'A' | 'B' | 'AB' | 'O' | 'TIDAK_DIKETAHUI';
export type HubunganKontak =
  | 'SUAMI' | 'ISTRI' | 'AYAH' | 'IBU' | 'ANAK'
  | 'KAKAK' | 'ADIK' | 'KAKEK' | 'NENEK'
  | 'PAMAN' | 'BIBI' | 'KEPONAKAN'
  | 'TEMAN' | 'REKAN_KERJA' | 'LAINNYA';

export interface KontakDarurat {
  id: string;
  pasienId: string;
  nama: string;
  nomorHP: string;
  hubungan: HubunganKontak;
  alamat?: string | null;
  isPrimary: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface KunjunganRingkas {
  id: string;
  nomorAntrean: string;
  tanggal: string;
  status: string;
  poli: { nama: string };
  dokter: { user: { nama: string } };
}

export interface PasienRow {
  id: string;
  nomorRM: string;
  nama: string;
  tempatLahir: string;
  tanggalLahir: string;
  jenisKelamin: JenisKelamin;
  tipePasien: TipePasien;
  telepon: string;
  alamat: string;
  isActive: boolean;
  createdAt: string;
  kontakDarurat: Pick<KontakDarurat, 'nama' | 'nomorHP' | 'hubungan'>[];
}

export interface PasienDetail {
  id: string;
  nomorRM: string;
  nama: string;
  tempatLahir: string;
  tanggalLahir: string;
  jenisKelamin: JenisKelamin;
  tipePasien: TipePasien;
  nik?: string | null;
  noPaspor?: string | null;
  negaraAsal?: string | null;
  alamat: string;
  telepon: string;
  email?: string | null;
  golonganDarah?: GolonganDarah | null;
  alergi?: string | null;
  noBPJS?: string | null;
  noAsuransi?: string | null;
  foto?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  kontakDarurat: KontakDarurat[];
  kunjungan: KunjunganRingkas[];
}

export const HUBUNGAN_LABELS: Record<HubunganKontak, string> = {
  SUAMI: 'Suami', ISTRI: 'Istri', AYAH: 'Ayah', IBU: 'Ibu',
  ANAK: 'Anak', KAKAK: 'Kakak', ADIK: 'Adik', KAKEK: 'Kakek',
  NENEK: 'Nenek', PAMAN: 'Paman', BIBI: 'Bibi', KEPONAKAN: 'Keponakan',
  TEMAN: 'Teman', REKAN_KERJA: 'Rekan Kerja', LAINNYA: 'Lainnya',
};

export const JENIS_KELAMIN_LABELS: Record<JenisKelamin, string> = {
  LAKI_LAKI: 'Laki-laki',
  PEREMPUAN: 'Perempuan',
};

export const GOLONGAN_DARAH_LABELS: Record<GolonganDarah, string> = {
  A: 'A', B: 'B', AB: 'AB', O: 'O', TIDAK_DIKETAHUI: 'Tidak Diketahui',
};

export const STATUS_KUNJUNGAN_LABELS: Record<string, string> = {
  MENUNGGU: 'Menunggu', DALAM_ANTRIAN: 'Dalam Antrian',
  DIPANGGIL: 'Dipanggil', DALAM_PEMERIKSAAN: 'Dalam Pemeriksaan',
  SELESAI: 'Selesai', BATAL: 'Batal',
};
