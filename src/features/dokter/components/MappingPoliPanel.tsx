'use client';

import { useState } from 'react';
import { Badge }  from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Trash2, PlusCircle, Building2 } from 'lucide-react';
import { useAddPoliMapping, useRemovePoliMapping } from '../hooks/useDokter';

interface PoliOption { id: string; nama: string; kode: string }
interface MappingRow {
  id:      string;
  poliId:  string;
  isAktif: boolean;
  poli:    PoliOption;
}

interface Props {
  dokterProfileId: string;
  mappings:        MappingRow[];
  allPoli:         PoliOption[];
}

export function MappingPoliPanel({ dokterProfileId, mappings, allPoli }: Props) {
  const [selectedPoli, setSelectedPoli] = useState('');
  const { mutate: add,    isPending: adding   } = useAddPoliMapping(dokterProfileId);
  const { mutate: remove, isPending: removing } = useRemovePoliMapping(dokterProfileId);

  const mappedPoliIds = new Set(mappings.filter(m => m.isAktif).map(m => m.poliId));
  const availablePoli = allPoli.filter(p => !mappedPoliIds.has(p.id));

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-medium mb-3">Poli yang Di-mapping</h3>
        {mappings.filter(m => m.isAktif).length === 0 ? (
          <p className="text-sm text-muted-foreground">Belum ada poli yang di-mapping.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {mappings.filter(m => m.isAktif).map(m => (
              <div key={m.id} className="flex items-center gap-1 rounded-md border px-3 py-1.5">
                <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                <Badge variant="secondary" className="text-xs mr-1">{m.poli.kode}</Badge>
                <span className="text-sm">{m.poli.nama}</span>
                <Button
                  variant="ghost" size="icon"
                  className="h-5 w-5 ml-1 text-destructive hover:text-destructive"
                  disabled={removing}
                  onClick={() => remove(m.poliId)}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      {availablePoli.length > 0 && (
        <div>
          <h3 className="text-sm font-medium mb-3">Tambah Mapping Poli</h3>
          <div className="flex gap-2">
            <Select value={selectedPoli} onValueChange={(v) => setSelectedPoli(v ?? '')}>
              <SelectTrigger className="w-64">
                <SelectValue placeholder="— Pilih Poli —" />
              </SelectTrigger>
              <SelectContent>
                {availablePoli.map(p => (
                  <SelectItem key={p.id} value={p.id}>
                    [{p.kode}] {p.nama}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              disabled={!selectedPoli || adding}
              onClick={() => {
                if (selectedPoli) {
                  add(selectedPoli, { onSuccess: () => setSelectedPoli('') });
                }
              }}
            >
              <PlusCircle className="h-4 w-4 mr-2" />
              {adding ? 'Menambahkan...' : 'Tambah'}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
