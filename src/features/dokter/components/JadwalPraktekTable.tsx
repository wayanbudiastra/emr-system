'use client';

import { useState }  from 'react';
import { Badge }     from '@/components/ui/badge';
import { Button }    from '@/components/ui/button';
import { Switch }    from '@/components/ui/switch';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Trash2, CalendarPlus } from 'lucide-react';
import { useToggleJadwal, useDeleteJadwal } from '../hooks/useDokter';
import { JadwalPraktekForm } from './JadwalPraktekForm';

const HARI_LABEL: Record<string, string> = {
  SENIN: 'Senin', SELASA: 'Selasa', RABU: 'Rabu', KAMIS: 'Kamis',
  JUMAT: 'Jumat', SABTU: 'Sabtu', MINGGU: 'Minggu',
};

interface JadwalRow {
  id:          string;
  hari:        string;
  jamMulai:    string;
  jamSelesai:  string;
  kuotaPasien: number;
  isAktif:     boolean;
  keterangan?: string | null;
}

interface DokterPoliRow {
  id:            string;
  isAktif:       boolean;
  poli:          { nama: string; kode: string };
  jadwalPraktek: JadwalRow[];
}

interface Props {
  dokterProfileId: string;
  poliMappings:    DokterPoliRow[];
}

export function JadwalPraktekTable({ dokterProfileId, poliMappings }: Props) {
  const [showForm, setShowForm] = useState(false);
  const { mutate: toggle } = useToggleJadwal(dokterProfileId);
  const { mutate: del }    = useDeleteJadwal(dokterProfileId);

  const aktifMappings = poliMappings.filter(m => m.isAktif);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">
          Jadwal per poli, diurutkan hari & jam mulai.
        </p>
        <Button size="sm" onClick={() => setShowForm(v => !v)}>
          <CalendarPlus className="h-4 w-4 mr-2" />
          Tambah Jadwal
        </Button>
      </div>

      {showForm && (
        <div className="rounded-lg border p-4">
          <h3 className="text-sm font-medium mb-4">Form Jadwal Baru</h3>
          <JadwalPraktekForm
            dokterProfileId={dokterProfileId}
            dokterPoliList={aktifMappings}
            onSuccess={() => setShowForm(false)}
          />
        </div>
      )}

      <Accordion type="multiple" defaultValue={aktifMappings.map(m => m.id)}>
        {aktifMappings.map(mapping => (
          <AccordionItem key={mapping.id} value={mapping.id}>
            <AccordionTrigger className="text-sm font-medium">
              [{mapping.poli.kode}] {mapping.poli.nama}
              <Badge variant="secondary" className="ml-2 text-xs">
                {mapping.jadwalPraktek.length} jadwal
              </Badge>
            </AccordionTrigger>
            <AccordionContent>
              {mapping.jadwalPraktek.length === 0 ? (
                <p className="text-sm text-muted-foreground py-2">Belum ada jadwal untuk poli ini.</p>
              ) : (
                <div className="space-y-2">
                  {mapping.jadwalPraktek.map(j => (
                    <div key={j.id} className="flex items-center justify-between rounded-md border px-3 py-2">
                      <div className="flex items-center gap-3">
                        <Badge variant={j.isAktif ? 'default' : 'secondary'} className="w-20 justify-center text-xs">
                          {HARI_LABEL[j.hari] ?? j.hari}
                        </Badge>
                        <span className="text-sm tabular-nums">
                          {j.jamMulai} – {j.jamSelesai}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          Kuota: {j.kuotaPasien}
                        </span>
                        {j.keterangan && (
                          <span className="text-xs text-muted-foreground italic">· {j.keterangan}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={j.isAktif}
                          onCheckedChange={v => toggle({ jadwalId: j.id, isAktif: v })}
                        />
                        <Button
                          variant="ghost" size="icon"
                          className="h-7 w-7 text-destructive hover:text-destructive"
                          onClick={() => del(j.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>

      {aktifMappings.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-4">
          Dokter belum memiliki mapping poli. Tambahkan mapping poli terlebih dahulu.
        </p>
      )}
    </div>
  );
}
