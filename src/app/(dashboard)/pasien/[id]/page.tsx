'use client';

import { use } from 'react';
import Link from 'next/link';
import { format } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import {
  ChevronLeft, Pencil, Phone, Mail, MapPin, Calendar,
  ShieldAlert, Heart, CreditCard, Stethoscope,
  UserCheck, UserX, Clock,
} from 'lucide-react';
import { Button }   from '@/components/ui/button';
import { Badge }    from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { NomorRMBadge }    from '@/features/pasien/components/NomorRMBadge';
import { TipePasienBadge } from '@/features/pasien/components/TipePasienBadge';
import { usePasienDetail, useTogglePasienActive } from '@/features/pasien/hooks/usePasien';
import {
  HUBUNGAN_LABELS, JENIS_KELAMIN_LABELS, GOLONGAN_DARAH_LABELS,
  STATUS_KUNJUNGAN_LABELS,
  type PasienDetail,
} from '@/features/pasien/types/pasien.types';

function InfoRow({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-sm font-medium">{value || '—'}</span>
    </div>
  );
}

function StatusKunjunganBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    MENUNGGU:          'bg-yellow-100 text-yellow-800',
    DALAM_ANTRIAN:     'bg-blue-100 text-blue-800',
    DIPANGGIL:         'bg-orange-100 text-orange-800',
    DALAM_PEMERIKSAAN: 'bg-purple-100 text-purple-800',
    SELESAI:           'bg-green-100 text-green-800',
    BATAL:             'bg-gray-100 text-gray-600',
  };
  return (
    <Badge className={`text-xs ${colors[status] ?? 'bg-gray-100 text-gray-600'} hover:opacity-90`}>
      {STATUS_KUNJUNGAN_LABELS[status] ?? status}
    </Badge>
  );
}

export default function PasienDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: pasien, isLoading, isError } = usePasienDetail(id);
  const { mutate: toggleActive, isPending: isToggling } = useTogglePasienActive(id);

  if (isLoading) return <DetailSkeleton />;
  if (isError || !pasien) {
    return (
      <div className="text-center py-20 text-muted-foreground">
        <p>Pasien tidak ditemukan.</p>
        <Button variant="link" className="mt-2" render={<Link href="/pasien" />}>Kembali ke daftar</Button>
      </div>
    );
  }

  const p = pasien as PasienDetail;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" className="shrink-0" render={<Link href="/pasien" />}>
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-bold">{p.nama}</h1>
              {!p.isActive && <Badge variant="secondary">Nonaktif</Badge>}
            </div>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <NomorRMBadge nomorRM={p.nomorRM} />
              <TipePasienBadge tipe={p.tipePasien} />
              <Badge variant="outline" className="text-xs">
                {JENIS_KELAMIN_LABELS[p.jenisKelamin]}
              </Badge>
            </div>
          </div>
        </div>

        <div className="flex gap-2 shrink-0">
          <Button
            variant="outline"
            size="sm"
            disabled={isToggling}
            onClick={() => toggleActive(!p.isActive)}
            className={p.isActive
              ? 'text-destructive hover:text-destructive'
              : 'text-green-600 hover:text-green-600'}
          >
            {p.isActive
              ? <><UserX className="h-4 w-4 mr-1.5" />Nonaktifkan</>
              : <><UserCheck className="h-4 w-4 mr-1.5" />Aktifkan</>
            }
          </Button>
          <Button size="sm" render={<Link href={`/pasien/${p.id}/edit`} />}>
            <Pencil className="h-4 w-4 mr-1.5" />Edit
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Kolom kiri: identitas + kontak */}
        <div className="lg:col-span-2 space-y-4">

          {/* Identitas */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <CreditCard className="h-4 w-4" /> Identitas
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
              <InfoRow label="Nama Lengkap" value={p.nama} />
              <InfoRow label="Tempat, Tanggal Lahir"
                value={`${p.tempatLahir}, ${format(new Date(p.tanggalLahir), 'dd MMMM yyyy', { locale: localeId })}`} />
              <InfoRow label="Jenis Kelamin" value={JENIS_KELAMIN_LABELS[p.jenisKelamin]} />
              <InfoRow label="Golongan Darah"
                value={p.golonganDarah ? GOLONGAN_DARAH_LABELS[p.golonganDarah] : undefined} />

              {p.tipePasien === 'WNI' && <>
                <InfoRow label="NIK" value={p.nik} />
                <InfoRow label="No. BPJS" value={p.noBPJS} />
              </>}

              {p.tipePasien === 'WNA' && <>
                <InfoRow label="No. Paspor" value={p.noPaspor} />
                <InfoRow label="Negara Asal" value={p.negaraAsal} />
                <InfoRow label="No. Asuransi" value={p.noAsuransi} />
              </>}
            </CardContent>
          </Card>

          {/* Kontak */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Phone className="h-4 w-4" /> Kontak & Domisili
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-start gap-2">
                <Phone className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                <span className="text-sm">{p.telepon}</span>
              </div>
              {p.email && (
                <div className="flex items-start gap-2">
                  <Mail className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                  <span className="text-sm">{p.email}</span>
                </div>
              )}
              <div className="flex items-start gap-2">
                <MapPin className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                <span className="text-sm">{p.alamat}</span>
              </div>
            </CardContent>
          </Card>

          {/* Alergi */}
          {p.alergi && (
            <Card className="border-orange-200 bg-orange-50/50 dark:border-orange-900/40 dark:bg-orange-950/20">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2 text-orange-700 dark:text-orange-400">
                  <ShieldAlert className="h-4 w-4" /> Riwayat Alergi
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-orange-800 dark:text-orange-300">{p.alergi}</p>
              </CardContent>
            </Card>
          )}

          {/* Riwayat Kunjungan */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Stethoscope className="h-4 w-4" /> Riwayat Kunjungan (5 terbaru)
              </CardTitle>
            </CardHeader>
            <CardContent>
              {p.kunjungan.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">Belum ada kunjungan</p>
              ) : (
                <div className="space-y-2">
                  {p.kunjungan.map((k) => (
                    <div key={k.id}
                      className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
                      <div className="flex items-center gap-3">
                        <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                        <div>
                          <p className="font-medium text-xs">
                            {format(new Date(k.tanggal), 'dd MMM yyyy', { locale: localeId })}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {k.poli.nama} · dr. {k.dokter.user.nama}
                          </p>
                        </div>
                      </div>
                      <StatusKunjunganBadge status={k.status} />
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Kolom kanan: kontak darurat + meta */}
        <div className="space-y-4">
          {/* Kontak Darurat */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Heart className="h-4 w-4" /> Kontak Darurat
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {p.kontakDarurat.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-2">Belum ada kontak darurat</p>
              ) : (
                p.kontakDarurat.map((k, i) => (
                  <div key={k.id}>
                    {i > 0 && <Separator className="my-3" />}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">{k.nama}</span>
                        {k.isPrimary && (
                          <Badge className="text-xs bg-blue-100 text-blue-700 hover:bg-blue-100">
                            Utama
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {HUBUNGAN_LABELS[k.hubungan]}
                      </p>
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Phone className="h-3 w-3" />
                        {k.nomorHP}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {/* Meta info */}
          <Card>
            <CardContent className="pt-4 space-y-2">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Clock className="h-3.5 w-3.5" />
                Didaftarkan {format(new Date(p.createdAt), 'dd MMM yyyy', { locale: localeId })}
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Clock className="h-3.5 w-3.5" />
                Diperbarui {format(new Date(p.updatedAt), 'dd MMM yyyy HH:mm', { locale: localeId })}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function DetailSkeleton() {
  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-3">
        <Skeleton className="h-9 w-9 rounded-md" />
        <div className="space-y-2">
          <Skeleton className="h-7 w-48" />
          <Skeleton className="h-5 w-64" />
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-40 w-full rounded-lg" />)}
        </div>
        <div className="space-y-4">
          {[1, 2].map(i => <Skeleton key={i} className="h-32 w-full rounded-lg" />)}
        </div>
      </div>
    </div>
  );
}
