"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Building2, RefreshCw, Pencil, ToggleLeft, ToggleRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { PageControls } from "@/components/ui/page-controls";

type Poli = { id: string; nama: string; kode: string; deskripsi?: string | null; lantai?: string | null; isActive: boolean };

async function fetchPoli() {
  const res = await fetch("/api/masterdata/poli?all=true");
  if (!res.ok) throw new Error("Gagal memuat poli");
  return res.json() as Promise<Poli[]>;
}

function PoliForm({ open, onClose, poli, onSuccess }: { open: boolean; onClose: () => void; poli?: Poli | null; onSuccess: () => void }) {
  const [form, setForm] = useState({ nama: poli?.nama ?? "", kode: poli?.kode ?? "", deskripsi: poli?.deskripsi ?? "", lantai: poli?.lantai ?? "" });
  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));

  const mutation = useMutation({
    mutationFn: async () => {
      const url = poli ? `/api/masterdata/poli/${poli.id}` : "/api/masterdata/poli";
      const res = await fetch(url, { method: poli ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...form, kode: form.kode.toUpperCase() }) });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error?.formErrors?.[0] ?? e.error); }
      return res.json();
    },
    onSuccess: () => { toast.success(poli ? "Poli diperbarui" : "Poli dibuat"); onSuccess(); onClose(); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={o => !o && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle>{poli ? "Edit Poli" : "Tambah Poli"}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          {[["Nama Poliklinik *", "nama", "Poli Umum"], ["Kode *", "kode", "PU"], ["Lantai / Lokasi", "lantai", "Lantai 1"], ["Deskripsi", "deskripsi", ""]].map(([label, key, ph]) => (
            <div key={key} className="space-y-1">
              <Label>{label}</Label>
              <Input value={form[key as keyof typeof form]} onChange={e => set(key, e.target.value)} placeholder={ph} />
            </div>
          ))}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Batal</Button>
          <Button onClick={() => mutation.mutate()} disabled={mutation.isPending}>{mutation.isPending ? "Menyimpan..." : "Simpan"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

const PAGE_SIZE = 10;

export default function PoliPage() {
  const qc = useQueryClient();
  const [editPoli, setEditPoli] = useState<Poli | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [page, setPage] = useState(1);
  const refresh = () => qc.invalidateQueries({ queryKey: ["poli"] });

  const { data: poliList = [], isLoading } = useQuery({ queryKey: ["poli"], queryFn: fetchPoli });

  const total      = poliList.length;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const paginated  = poliList.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const toggleMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const res = await fetch(`/api/masterdata/poli/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ isActive }) });
      if (!res.ok) throw new Error("Gagal mengubah status");
    },
    onSuccess: () => { toast.success("Status poli diperbarui"); refresh(); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{total} poliklinik terdaftar</p>
        <div className="flex gap-2">
          <Button variant="ghost" size="icon" onClick={refresh}><RefreshCw className="h-4 w-4" /></Button>
          <Button onClick={() => setCreateOpen(true)} className="gap-2"><Plus className="h-4 w-4" />Tambah Poli</Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Poliklinik</TableHead>
                <TableHead>Kode</TableHead>
                <TableHead className="hidden md:table-cell">Lantai</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-20"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? Array.from({ length: 4 }).map((_, i) => (
                <TableRow key={i}>{Array.from({ length: 5 }).map((_, j) => <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>)}</TableRow>
              )) : paginated.map(p => (
                <TableRow key={p.id} className={!p.isActive ? "opacity-50" : ""}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="font-medium text-sm">{p.nama}</p>
                        {p.deskripsi && <p className="text-xs text-muted-foreground">{p.deskripsi}</p>}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell><Badge variant="outline">{p.kode}</Badge></TableCell>
                  <TableCell className="hidden md:table-cell text-sm text-muted-foreground">{p.lantai ?? "—"}</TableCell>
                  <TableCell><Badge variant={p.isActive ? "default" : "secondary"}>{p.isActive ? "Aktif" : "Nonaktif"}</Badge></TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => setEditPoli(p)}><Pencil className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => toggleMutation.mutate({ id: p.id, isActive: !p.isActive })}>
                        {p.isActive ? <ToggleRight className="h-4 w-4 text-green-600" /> : <ToggleLeft className="h-4 w-4" />}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <PageControls page={page} totalPages={totalPages} total={total} limit={PAGE_SIZE} onPageChange={setPage} />
        </CardContent>
      </Card>

      <PoliForm open={createOpen} onClose={() => setCreateOpen(false)} onSuccess={refresh} />
      <PoliForm open={Boolean(editPoli)} onClose={() => setEditPoli(null)} poli={editPoli} onSuccess={refresh} />
    </div>
  );
}
