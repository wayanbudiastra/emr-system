'use client';

import { use } from 'react';
import Link from 'next/link';
import { Pencil, ChevronLeft } from 'lucide-react';
import { Button }   from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { NomorRMBadge }    from '@/features/pasien/components/NomorRMBadge';
import { TipePasienBadge } from '@/features/pasien/components/TipePasienBadge';
import { PasienForm } from '@/features/pasien/components/PasienForm';
import { usePasienDetail } from '@/features/pasien/hooks/usePasien';
import type { PasienDetail } from '@/features/pasien/types/pasien.types';
import type { CreatePasienDTO } from '@/features/pasien/schemas/pasien.schema';

function pasienToFormValues(p: PasienDetail): Partial<CreatePasienDTO> {
  return {
    nama:          p.nama,
    tempatLahir:   p.tempatLahir,
    tanggalLahir:  new Date(p.tanggalLahir),
    jenisKelamin:  p.jenisKelamin,
    tipePasien:    p.tipePasien,
    nik:           p.nik ?? undefined,
    noPaspor:      p.noPaspor ?? undefined,
    negaraAsal:    p.negaraAsal ?? undefined,
    alamat:        p.alamat,
    telepon:       p.telepon,
    email:         p.email ?? '',
    golonganDarah: p.golonganDarah ?? undefined,
    alergi:        p.alergi ?? '',
    noBPJS:        p.noBPJS ?? '',
    noAsuransi:    p.noAsuransi ?? undefined,
    kontakDarurat: p.kontakDarurat.map((k) => ({
      id:        k.id,
      nama:      k.nama,
      nomorHP:   k.nomorHP,
      hubungan:  k.hubungan,
      alamat:    k.alamat ?? undefined,
      isPrimary: k.isPrimary,
    })),
  };
}

export default function EditPasienPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: pasien, isLoading, isError } = usePasienDetail(id);

  if (isLoading) return <EditSkeleton />;
  if (isError || !pasien) {
    return (
      <div className="text-center py-20 text-muted-foreground">
        <p>Pasien tidak ditemukan.</p>
        <Button asChild variant="link" className="mt-2">
          <Link href="/pasien">Kembali ke daftar</Link>
        </Button>
      </div>
    );
  }

  const p = pasien as PasienDetail;

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild className="shrink-0">
          <Link href={`/pasien/${id}`}>
            <ChevronLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Pencil className="h-5 w-5 text-primary" />
            Edit Data Pasien
          </h1>
          <div className="flex items-center gap-2 mt-1">
            <NomorRMBadge nomorRM={p.nomorRM} />
            <TipePasienBadge tipe={p.tipePasien} />
          </div>
        </div>
      </div>

      <PasienForm
        mode="edit"
        pasienId={id}
        defaultValues={pasienToFormValues(p)}
      />
    </div>
  );
}

function EditSkeleton() {
  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div className="flex items-center gap-3">
        <Skeleton className="h-9 w-9 rounded-md" />
        <div className="space-y-2">
          <Skeleton className="h-7 w-48" />
          <Skeleton className="h-5 w-40" />
        </div>
      </div>
      <Skeleton className="h-96 w-full rounded-lg" />
      <Skeleton className="h-64 w-full rounded-lg" />
    </div>
  );
}
