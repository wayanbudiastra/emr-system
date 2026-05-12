'use client';

import { use }            from 'react';
import Link               from 'next/link';
import { useQuery }       from '@tanstack/react-query';
import { ArrowLeft, UserRoundCheck } from 'lucide-react';
import { Button, buttonVariants } from '@/components/ui/button';
import { cn }             from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge }          from '@/components/ui/badge';
import { Skeleton }       from '@/components/ui/skeleton';
import { SIPStatusBadge } from '@/features/dokter/components/SIPStatusBadge';
import { DokterProfilForm }    from '@/features/dokter/components/DokterProfilForm';
import { MappingPoliPanel }    from '@/features/dokter/components/MappingPoliPanel';
import { SharingFeeForm }      from '@/features/dokter/components/SharingFeeForm';
import { JadwalPraktekTable }  from '@/features/dokter/components/JadwalPraktekTable';
import { useDokterDetail }     from '@/features/dokter/hooks/useDokter';

interface Props { params: Promise<{ id: string }> }

export default function DokterDetailPage({ params }: Props) {
  const { id } = use(params);

  const { data: dokter, isLoading } = useDokterDetail(id);

  const { data: allPoli } = useQuery({
    queryKey: ['poli-list'],
    queryFn:  async () => {
      const res = await fetch('/api/masterdata/poli');
      if (!res.ok) throw new Error('Gagal memuat poli');
      return res.json() as Promise<Array<{ id: string; nama: string; kode: string }>>;
    },
    staleTime: 60_000,
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!dokter) {
    return (
      <div className="text-center py-16">
        <p className="text-muted-foreground">Data dokter tidak ditemukan.</p>
        <Button asChild variant="outline" className="mt-4">
          <Link href="/data-dokter">Kembali</Link>
        </Button>
      </div>
    );
  }

  const sharingFeeDefault = dokter.sharingFee?.length > 0
    ? {
        fees: ['TINDAKAN', 'LAB', 'RADIOLOGI', 'PERALATAN'].map(k => ({
          kategori:   k as 'TINDAKAN' | 'LAB' | 'RADIOLOGI' | 'PERALATAN',
          persentase: dokter.sharingFee.find((f: { kategori: string }) => f.kategori === k)?.persentase ?? 0,
        })),
      }
    : undefined;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/data-dokter" className={cn(buttonVariants({ variant: 'ghost', size: 'icon' }))}>
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <UserRoundCheck className="h-5 w-5 text-primary" />
        <div>
          <h1 className="text-xl font-bold">{dokter.user.nama}</h1>
          <p className="text-sm text-muted-foreground">{dokter.user.email}</p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <Badge variant={dokter.user.isActive ? 'default' : 'secondary'}>
            {dokter.user.isActive ? 'Aktif' : 'Nonaktif'}
          </Badge>
          <SIPStatusBadge tglExpired={dokter.tglExpiredSIP} />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 text-sm">
        <Card>
          <CardContent className="pt-4">
            <p className="text-muted-foreground text-xs">NIP</p>
            <p className="font-medium">{dokter.user.nip ?? '—'}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-muted-foreground text-xs">Telepon</p>
            <p className="font-medium">{dokter.user.telepon ?? '—'}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-muted-foreground text-xs">Spesialisasi</p>
            <p className="font-medium">{dokter.spesialisasi ?? '—'}</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="profil">
        <TabsList className="grid grid-cols-4 w-full">
          <TabsTrigger value="profil">Profil Klinis</TabsTrigger>
          <TabsTrigger value="mapping">Mapping Poli</TabsTrigger>
          <TabsTrigger value="fee">Sharing Fee</TabsTrigger>
          <TabsTrigger value="jadwal">Jadwal Praktek</TabsTrigger>
        </TabsList>

        <TabsContent value="profil">
          <Card>
            <CardHeader><CardTitle className="text-base">Data Klinis Dokter</CardTitle></CardHeader>
            <CardContent>
              <DokterProfilForm
                userId={dokter.userId}
                defaultValues={{
                  nik:           dokter.nik           ?? '',
                  noSIP:         dokter.noSIP          ?? '',
                  tglExpiredSIP: dokter.tglExpiredSIP ?? null,
                  spesialisasi:  dokter.spesialisasi   ?? '',
                }}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="mapping">
          <Card>
            <CardHeader><CardTitle className="text-base">Mapping Poli</CardTitle></CardHeader>
            <CardContent>
              <MappingPoliPanel
                dokterProfileId={dokter.id}
                mappings={dokter.poliMapping ?? []}
                allPoli={allPoli ?? []}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="fee">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Sharing Fee per Kategori</CardTitle>
            </CardHeader>
            <CardContent>
              <SharingFeeForm
                dokterProfileId={dokter.id}
                defaultValues={sharingFeeDefault}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="jadwal">
          <Card>
            <CardHeader><CardTitle className="text-base">Jadwal Praktek</CardTitle></CardHeader>
            <CardContent>
              <JadwalPraktekTable
                dokterProfileId={dokter.id}
                poliMappings={dokter.poliMapping ?? []}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
