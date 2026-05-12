export function getSIPStatus(tglExpired: Date | null | undefined): {
  status: 'AKTIF' | 'SEGERA_EXPIRED' | 'EXPIRED' | 'TIDAK_ADA';
  sisaHari?: number;
} {
  if (!tglExpired) return { status: 'TIDAK_ADA' };

  const now     = new Date();
  const expired = new Date(tglExpired);
  const selisih = Math.ceil((expired.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  if (selisih < 0)   return { status: 'EXPIRED',        sisaHari: selisih };
  if (selisih <= 30) return { status: 'SEGERA_EXPIRED', sisaHari: selisih };
  return               { status: 'AKTIF',              sisaHari: selisih };
}
