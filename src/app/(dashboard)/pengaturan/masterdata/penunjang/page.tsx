"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/constants";
import { Plus, Search, RefreshCw, Pencil, FlaskConical, RadioTower } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";

type Item = { id: string; kode: string; nama: string; kategori: string; tarif: number; tarifBPJS?: number | null; satuanWaktu?: string | null; isActive: boolean };

async function fetchPenunjang(kategori: string, search: string) {
  const q = new URLSearchParams({ limit: "50" });
  if (kategori !== "ALL") q.set("kategori", kategori);
  if (search) q.set("search", search);
  const r = await fetch(`/api/masterdata/penunjang?${q}`);
  if (!r.ok) throw new Error();
  return r.json();
}

function PenunjangForm({ open, onClose, item, onSuccess }: { open: boolean; onClose: () => void; item?: Item | null; onSuccess: () => void }) {
  const [form, setForm] = useState({ kode: item?.kode ?? "", nama: item?.nama ?? "", kategori: item?.kategori ?? "LAB", tarif: item?.tarif ?? 0, tarifBPJS: item?.tarifBPJS ?? "", satuanWaktu: item?.satuanWaktu ?? "", deskripsi: "" });

  const mutation = useMutation({
    mutationFn: async () => {
      const url = item ? `/api/masterdata/penunjang/${item.id}` : "/api/masterdata/penunjang";
      const method = item ? "PUT" : "POST";
      const body = { ...form, tarif: Number(form.tarif), tarifBPJS: form.tarifBPJS ? Number(form.tarifBPJS) : undefined, kode: form.kode.toUpperCase() };
      const r = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      if (!r.ok) { const e = await r.json(); throw new Error(e.error?.formErrors?.[0] ?? e.error ?? "Error"); }
    },
    onSuccess: () => { toast.success("Data disimpan"); onSuccess(); onClose(); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={o => !o && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle>{item ? "Edit Item" : "Tambah Item Penunjang"}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            {!item && <><div className="space-y-1"><Label>Kode *</Label><Input value={form.kode} onChange={e => setForm(p => ({ ...p, kode: e.target.value }))} /></div>
            <div className="space-y-1"><Label>Kategori *</Label>
              <Select value={form.kategori} onValueChange={v => setForm(p => ({ ...p, kategori: v ?? "LAB" }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="LAB">Laboratorium</SelectItem><SelectItem value="RADIOLOGI">Radiologi</SelectItem></SelectContent>
              </Select>
            </div></>}
            <div className="col-span-2 space-y-1"><Label>Nama *</Label><Input value={form.nama} onChange={e => setForm(p => ({ ...p, nama: e.target.value }))} /></div>
            <div className="space-y-1"><Label>Tarif (Rp) *</Label><Input type="number" value={form.tarif} onChange={e => setForm(p => ({ ...p, tarif: Number(e.target.value) }))} /></div>
            <div className="space-y-1"><Label>Tarif BPJS</Label><Input type="number" value={form.tarifBPJS} onChange={e => setForm(p => ({ ...p, tarifBPJS: e.target.value }))} /></div>
            <div className="col-span-2 space-y-1"><Label>Waktu Pengerjaan</Label><Input value={form.satuanWaktu} onChange={e => setForm(p => ({ ...p, satuanWaktu: e.target.value }))} placeholder="2 jam, 1 hari kerja" /></div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Batal</Button>
          <Button onClick={() => mutation.mutate()} disabled={mutation.isPending}>{mutation.isPending ? "Menyimpan..." : "Simpan"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function PenunjangPage() {
  const qc = useQueryClient();
  const [tab, setTab] = useState("ALL");
  const [search, setSearch] = useState("");
  const [editItem, setEditItem] = useState<Item | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const refresh = () => qc.invalidateQueries({ queryKey: ["penunjang"] });

  const { data, isLoading } = useQuery({ queryKey: ["penunjang", tab, search], queryFn: () => fetchPenunjang(tab, search) });
  const items: Item[] = data?.data ?? [];

  const toggleMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      fetch(`/api/masterdata/penunjang/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ isActive }) }),
    onSuccess: () => { toast.success("Status diperbarui"); refresh(); },
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList>
            <TabsTrigger value="ALL">Semua</TabsTrigger>
            <TabsTrigger value="LAB" className="gap-1"><FlaskConical className="h-3 w-3" />Lab</TabsTrigger>
            <TabsTrigger value="RADIOLOGI" className="gap-1"><RadioTower className="h-3 w-3" />Radiologi</TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="flex gap-2">
          <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder="Cari..." className="pl-9 w-48" value={search} onChange={e => setSearch(e.target.value)} /></div>
          <Button variant="ghost" size="icon" onClick={refresh}><RefreshCw className="h-4 w-4" /></Button>
          <Button onClick={() => setCreateOpen(true)} className="gap-2"><Plus className="h-4 w-4" />Tambah</Button>
        </div>
      </div>

      <Card><CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Item</TableHead>
              <TableHead>Kategori</TableHead>
              <TableHead>Tarif</TableHead>
              <TableHead className="hidden md:table-cell">Waktu</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-16"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? Array.from({ length: 5 }).map((_, i) => (
              <TableRow key={i}>{Array.from({ length: 6 }).map((_, j) => <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>)}</TableRow>
            )) : items.map(item => (
              <TableRow key={item.id}>
                <TableCell><div><p className="font-medium text-sm">{item.nama}</p><p className="text-xs text-muted-foreground">{item.kode}</p></div></TableCell>
                <TableCell><Badge variant={item.kategori === "LAB" ? "default" : "secondary"} className="gap-1">{item.kategori === "LAB" ? <FlaskConical className="h-3 w-3" /> : <RadioTower className="h-3 w-3" />}{item.kategori}</Badge></TableCell>
                <TableCell><div><p className="text-sm">{formatCurrency(item.tarif)}</p>{item.tarifBPJS && <p className="text-xs text-muted-foreground">BPJS: {formatCurrency(item.tarifBPJS)}</p>}</div></TableCell>
                <TableCell className="hidden md:table-cell text-sm text-muted-foreground">{item.satuanWaktu ?? "—"}</TableCell>
                <TableCell><Badge variant={item.isActive ? "default" : "secondary"}>{item.isActive ? "Aktif" : "Nonaktif"}</Badge></TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => setEditItem(item)}><Pencil className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => toggleMutation.mutate({ id: item.id, isActive: !item.isActive })}>
                      <span className={`text-xs font-medium ${item.isActive ? "text-yellow-600" : "text-green-600"}`}>{item.isActive ? "OFF" : "ON"}</span>
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent></Card>

      <PenunjangForm open={createOpen} onClose={() => setCreateOpen(false)} onSuccess={refresh} />
      <PenunjangForm open={Boolean(editItem)} onClose={() => setEditItem(null)} item={editItem} onSuccess={refresh} />
    </div>
  );
}
