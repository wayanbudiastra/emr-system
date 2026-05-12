'use client';

import Link from 'next/link';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Badge }          from '@/components/ui/badge';
import { Button }         from '@/components/ui/button';
import { SIPStatusBadge } from './SIPStatusBadge';
import { Eye, Stethoscope } from 'lucide-react';

interface DokterRow {
  id:             string;
  tglExpiredSIP?: string | Date | null;
  spesialisasi?:  string | null;
  user: {
    nama:     string;
    email:    string;
    telepon?: string | null;
    isActive: boolean;
  };
  poliMapping: Array<{
    poli: { nama: string; kode: string };
  }>;
}

interface Props {
  data:    DokterRow[];
  isLoading?: boolean;
}

export function DokterTable({ data, isLoading }: Props) {
  if (isLoading) {
    return <div className="py-10 text-center text-muted-foreground">Memuat data dokter...</div>;
  }

  if (!data.length) {
    return (
      <div className="py-10 text-center text-muted-foreground">
        <Stethoscope className="mx-auto h-10 w-10 mb-2 opacity-30" />
        <p>Belum ada data dokter.</p>
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Nama Dokter</TableHead>
          <TableHead>Spesialisasi</TableHead>
          <TableHead>Poli</TableHead>
          <TableHead>Status SIP</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="w-20">Aksi</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.map(d => (
          <TableRow key={d.id}>
            <TableCell>
              <div className="font-medium">{d.user.nama}</div>
              <div className="text-xs text-muted-foreground">{d.user.email}</div>
            </TableCell>
            <TableCell className="text-sm">{d.spesialisasi ?? '—'}</TableCell>
            <TableCell>
              <div className="flex flex-wrap gap-1">
                {d.poliMapping.length === 0
                  ? <span className="text-xs text-muted-foreground">Belum ada</span>
                  : d.poliMapping.map(m => (
                    <Badge key={m.poli.kode} variant="secondary" className="text-xs">
                      {m.poli.kode}
                    </Badge>
                  ))}
              </div>
            </TableCell>
            <TableCell>
              <SIPStatusBadge tglExpired={d.tglExpiredSIP} />
            </TableCell>
            <TableCell>
              <Badge variant={d.user.isActive ? 'default' : 'secondary'}>
                {d.user.isActive ? 'Aktif' : 'Nonaktif'}
              </Badge>
            </TableCell>
            <TableCell>
              <Button variant="ghost" size="icon" asChild>
                <Link href={`/data-dokter/${d.id}`}>
                  <Eye className="h-4 w-4" />
                </Link>
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
