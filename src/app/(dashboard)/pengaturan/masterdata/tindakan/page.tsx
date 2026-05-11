"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/constants";
import { Plus, Search, RefreshCw, Pencil, Tags } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";

type Poli = { id: string; nama: string; kode: string };
type Tindakan = { id: string; kode: string; nama: string; tarif: number; tarifBPJS?: number | null; isActive: boolean; poliMapping: { poli: Poli }[] };

async function fetchPoli() { const r = await fetch("/api/masterdata/poli"); if (!r.ok) throw new Error(); return r.json() as Promise<Poli[]>; }
async function fetchTindakan(search: string) { const r = await fetch(`/api/masterdata/tindakan?search=${search}&limit=50`); if (!r.ok) throw new Error(); return r.json(); }

function TindakanForm({ open, onClose, item, poliList, onSuccess }: { open: boolean; onClose: () => void; item?: Tindakan | null; poliList: Poli[]; onSuccess: () => void }) {
  const [form, setForm] = useState({ nama: "", kode: "", tarif: 0, tarifBPJS: "" as string | number, deskripsi: "" });
  const [selectedPoli, setSelectedPoli] = useState<string[]>([]);

  useEffect(() => {
    setForm({ nama: item?.nama ?? "", kode: item?.kode ?? "", tarif: item?.tarif ?? 0, tarifBPJS: item?.tarifBPJS ?? "", deskripsi: "" });
    setSelectedPoli(item?.poliMapping.map(m => m.poli.id) ?? []);
  }, [open]);

  const togglePoli = (id: string) => setSelectedPoli(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  const mutation = useMutation({
    mutationFn: async () => {
      const url = item ? `/api/masterdata/tindakan/${item.id}` : "/api/masterdata/tindakan";
      const method = item ? "PUT" : "POST";
      const body = item
        ? { nama: form.nama, tarif: Number(form.tarif), tarifBPJS: form.tarifBPJS ? Number(form.tarifBPJS) : undefined }
        : { ...form, kode: form.kode.toUpperCase(), tarif: Number(form.tarif), tarifBPJS: form.tarifBPJS ? Number(form.tarifBPJS) : undefined, poliIds: selectedPoli };
      const r = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      if (!r.ok) { const e = await r.json(); throw new Error(e.error?.formErrors?.[0] ?? e.error ?? "Error"); }
      if (item) {
        await fetch(`/api/masterdata/tindakan/${item.id}/mapping`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ poliIds: selectedPoli }) });
      }
    },
    onSuccess: () => { toast.success(item ? "Tindakan diperbarui" : "Tindakan dibuat"); onSuccess(); onClose(); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={o => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{item ? "Edit Tindakan" : "Tambah Tindakan"}</DialogTitle>
          <DialogDescription>Tindakan wajib dipetakan ke minimal satu poli.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            {!item && <div className="space-y-1"><Label>Kode *</Label><Input value={form.kode} onChange={e => setForm(p => ({ ...p, kode: e.target.value }))} placeholder="T001" /></div>}
            <div className={`space-y-1 ${!item ? "" : "col-span-2"}`}><Label>Nama *</Label><Input value={form.nama} onChange={e => setForm(p => ({ ...p, nama: e.target.value }))} /></div>
            <div className="space-y-1"><Label>Tarif (Rp) *</Label><Input type="number" value={form.tarif} onChange={e => setForm(p => ({ ...p, tarif: Number(e.target.value) }))} /></div>
            <div className="space-y-1"><Label>Tarif BPJS</Label><Input type="number" value={form.tarifBPJS} onChange={e => setForm(p => ({ ...p, tarifBPJS: e.target.value }))} /></div>
          </div>
          <div className="space-y-2">
            <Label>Mapping Poli *</Label>
            <div className="grid grid-cols-2 gap-2 max-h-36 overflow-y-auto border rounded-md p-2">
              {poliList.map(p => (
                <div key={p.id} className="flex items-center gap-2">
                  <Checkbox id={p.id} checked={selectedPoli.includes(p.id)} onCheckedChange={() => togglePoli(p.id)} />
                  <label htmlFor={p.id} className="text-sm cursor-pointer">{p.nama}</label>
                </div>
              ))}
            </div>
            {selectedPoli.length === 0 && <p className="text-xs text-destructive">Pilih minimal satu poli</p>}
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Batal</Button>
          <Button onClick={() => mutation.mutate()} disabled={mutation.isPending || selectedPoli.length === 0}>{mutation.isPending ? "Menyimpan..." : "Simpan"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function TindakanPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [editItem, setEditItem] = useState<Tindakan | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const refresh = () => qc.invalidateQueries({ queryKey: ["tindakan"] });

  const { data: poliList = [] } = useQuery({ queryKey: ["poli"], queryFn: fetchPoli });
  const { data, isLoading } = useQuery({ queryKey: ["tindakan", search], queryFn: () => fetchTindakan(search) });
  const tindakanList: Tindakan[] = data?.data ?? [];

  const toggleMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      fetch(`/api/masterdata/tindakan/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ isActive }) }),
    onSuccess: () => { toast.success("Status diperbarui"); refresh(); },
    onError: () => toast.error("Gagal memperbarui status"),
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Cari tindakan..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" size="icon" onClick={refresh}><RefreshCw className="h-4 w-4" /></Button>
          <Button onClick={() => setCreateOpen(true)} className="gap-2"><Plus className="h-4 w-4" />Tambah Tindakan</Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tindakan</TableHead>
                <TableHead>Tarif</TableHead>
                <TableHead className="hidden lg:table-cell">Mapping Poli</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-16"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>{Array.from({ length: 5 }).map((_, j) => <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>)}</TableRow>
              )) : tindakanList.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-center py-12 text-muted-foreground">Tidak ada tindakan</TableCell></TableRow>
              ) : tindakanList.map(t => (
                <TableRow key={t.id} className={!t.isActive ? "opacity-60" : ""}>
                  <TableCell>
                    <div>
                      <p className="font-medium text-sm">{t.nama}</p>
                      <p className="text-xs text-muted-foreground">{t.kode}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="text-sm">{formatCurrency(t.tarif)}</p>
                      {t.tarifBPJS && <p className="text-xs text-muted-foreground">BPJS: {formatCurrency(t.tarifBPJS)}</p>}
                    </div>
                  </TableCell>
                  <TableCell className="hidden lg:table-cell">
                    <div className="flex flex-wrap gap-1">
                      {t.poliMapping.map(m => <Badge key={m.poli.id} variant="secondary" className="text-xs">{m.poli.kode}</Badge>)}
                      {t.poliMapping.length === 0 && <span className="text-xs text-destructive flex items-center gap-1"><Tags className="h-3 w-3" />Belum dipetakan</span>}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={t.isActive ? "default" : "secondary"}>{t.isActive ? "Aktif" : "Nonaktif"}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => setEditItem(t)}><Pencil className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => toggleMutation.mutate({ id: t.id, isActive: !t.isActive })}>
                        <span className={`text-xs font-medium ${t.isActive ? "text-yellow-600" : "text-green-600"}`}>{t.isActive ? "OFF" : "ON"}</span>
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <TindakanForm open={createOpen} onClose={() => setCreateOpen(false)} poliList={poliList} onSuccess={refresh} />
      <TindakanForm open={Boolean(editItem)} onClose={() => setEditItem(null)} item={editItem} poliList={poliList} onSuccess={refresh} />
    </div>
  );
}
