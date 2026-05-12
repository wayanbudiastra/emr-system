'use client';

import { useState, useCallback } from 'react';
import { useQueryClient }        from '@tanstack/react-query';
import { UserRoundCheck, Search, RefreshCw } from 'lucide-react';
import { Input }                 from '@/components/ui/input';
import { Button }                from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DokterTable }           from '@/features/dokter/components/DokterTable';
import { useDokterList, dokterKeys } from '@/features/dokter/hooks/useDokter';

export default function DataDokterPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [page,   setPage]   = useState(1);
  const limit = 20;

  const { data, isLoading } = useDokterList({ q: search || undefined, page, limit });

  const refresh = useCallback(
    () => qc.invalidateQueries({ queryKey: dokterKeys.lists() }),
    [qc]
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <UserRoundCheck className="h-6 w-6 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">Data Dokter</h1>
          <p className="text-sm text-muted-foreground">
            Manajemen profil dokter, mapping poli, sharing fee, dan jadwal praktek
          </p>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-4">
            <CardTitle className="text-base">Daftar Dokter</CardTitle>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Cari nama / email..."
                  className="pl-9 w-64"
                  value={search}
                  onChange={e => { setSearch(e.target.value); setPage(1); }}
                />
              </div>
              <Button variant="outline" size="icon" onClick={refresh}>
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <DokterTable data={data?.data ?? []} isLoading={isLoading} />
        </CardContent>
      </Card>

      {data && data.totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            Menampilkan {((page - 1) * limit) + 1}–{Math.min(page * limit, data.total)} dari {data.total} dokter
          </span>
          <div className="flex gap-1">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
              Sebelumnya
            </Button>
            <Button variant="outline" size="sm" disabled={page >= data.totalPages} onClick={() => setPage(p => p + 1)}>
              Berikutnya
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
