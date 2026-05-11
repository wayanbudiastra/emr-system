'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { Users, Plus, Search, RefreshCw, Eye, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { PageControls } from '@/components/ui/page-controls';
import { usePasienList } from '@/features/pasien/hooks/usePasien';
import { NomorRMBadge } from '@/features/pasien/components/NomorRMBadge';
import { TipePasienBadge } from '@/features/pasien/components/TipePasienBadge';
import { useQueryClient } from '@tanstack/react-query';
import { pasienKeys } from '@/features/pasien/hooks/usePasien';

export default function PasienPage() {
  const router    = useRouter();
  const qc        = useQueryClient();
  const [search,  setSearch]  = useState('');
  const [tipe,    setTipe]    = useState('all');
  const [page,    setPage]    = useState(1);
  const limit = 20;

  const { data, isLoading } = usePasienList({
    q:     search || undefined,
    tipe:  tipe !== 'all' ? tipe : undefined,
    page,
    limit,
  });

  const refresh = useCallback(() => qc.invalidateQueries({ queryKey: pasienKeys.lists() }), [qc]);

  const pasienList = data?.data ?? [];
  const total      = data?.total ?? 0;
  const totalPages = data?.totalPages ?? 1;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Users className="h-6 w-6 text-primary" />
            Data Pasien
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Kelola pendaftaran dan data demografi pasien
          </p>
        </div>
        <Button asChild className="gap-2">
          <Link href="/pasien/tambah">
            <Plus className="h-4 w-4" /> Daftar Pasien Baru
          </Link>
        </Button>
      </div>

      {/* Filter */}
      <Card>
        <CardContent className="pt-4 pb-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Cari nama, No. RM, NIK, atau No. Paspor..."
                className="pl-9"
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              />
            </div>
            <Select value={tipe} onValueChange={(v) => { setTipe(v ?? 'all'); setPage(1); }}>
              <SelectTrigger className="w-full sm:w-36">
                <SelectValue placeholder="Semua Tipe" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Tipe</SelectItem>
                <SelectItem value="WNI">WNI</SelectItem>
                <SelectItem value="WNA">WNA</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="ghost" size="icon" onClick={refresh} title="Refresh">
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            {isLoading ? 'Memuat...' : `${total} pasien ditemukan`}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>No. RM</TableHead>
                <TableHead>Nama</TableHead>
                <TableHead>Tipe</TableHead>
                <TableHead className="hidden md:table-cell">Telepon</TableHead>
                <TableHead className="hidden lg:table-cell">Alamat</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-20 text-center">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading
                ? Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 7 }).map((_, j) => (
                        <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                      ))}
                    </TableRow>
                  ))
                : pasienList.length === 0
                ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                      <Users className="h-10 w-10 mx-auto mb-2 opacity-30" />
                      Tidak ada pasien ditemukan
                    </TableCell>
                  </TableRow>
                )
                : pasienList.map((pasien: {
                    id: string;
                    nomorRM: string;
                    nama: string;
                    tipePasien: 'WNI' | 'WNA';
                    telepon: string;
                    alamat: string;
                    isActive: boolean;
                    tanggalLahir: string;
                  }) => (
                  <TableRow
                    key={pasien.id}
                    className={`cursor-pointer hover:bg-muted/50 ${!pasien.isActive ? 'opacity-50' : ''}`}
                    onClick={() => router.push(`/pasien/${pasien.id}`)}
                  >
                    <TableCell onClick={e => e.stopPropagation()}>
                      <NomorRMBadge nomorRM={pasien.nomorRM} />
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium text-sm">{pasien.nama}</p>
                        <p className="text-xs text-muted-foreground">
                          {pasien.tanggalLahir
                            ? format(new Date(pasien.tanggalLahir), 'dd MMM yyyy', { locale: id })
                            : '—'}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <TipePasienBadge tipe={pasien.tipePasien} />
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                      {pasien.telepon}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-sm text-muted-foreground max-w-[200px]">
                      <span className="truncate block">{pasien.alamat}</span>
                    </TableCell>
                    <TableCell>
                      <Badge variant={pasien.isActive ? 'default' : 'secondary'} className="text-xs">
                        {pasien.isActive ? 'Aktif' : 'Nonaktif'}
                      </Badge>
                    </TableCell>
                    <TableCell onClick={e => e.stopPropagation()}>
                      <div className="flex items-center justify-center gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                          <Link href={`/pasien/${pasien.id}`}>
                            <Eye className="h-3.5 w-3.5" />
                          </Link>
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                          <Link href={`/pasien/${pasien.id}/edit`}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Link>
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>

          <PageControls
            page={page}
            totalPages={totalPages}
            total={total}
            limit={limit}
            onPageChange={setPage}
          />
        </CardContent>
      </Card>
    </div>
  );
}
