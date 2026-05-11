"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/constants";
import { Plus, Search, RefreshCw, Pencil, Cpu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { PageControls } from "@/components/ui/page-controls";

type Peralatan = {
  id: string; kode: string; nama: string; merk?: string | null;
  nomorSeri?: string | null; status: string; lokasiTerakhir?: string | null;
  tarif?: number | null; tarifBPJS?: number | null;
};

const STATUS_COLORS: Record<string, string> = {
  TERSEDIA:    "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  DIGUNAKAN:   "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  MAINTENANCE: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
  RUSAK:       "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
};

async function fetchPeralatan(status: string, search: string, page: number) {
  const q = new URLSearchParams({ limit: "10", page: String(page) });
  if (status !== "ALL") q.set("status", status);
  if (search) q.set("search", search);
  const r = await fetch(`/api/masterdata/peralatan?${q}`);
  if (!r.ok) throw new Error();
  return r.json();
}

function PeralatanForm({ open, onClose, item, onSuccess }: { open: boolean; onClose: () => void; item?: Peralatan | null; onSuccess: () => void }) {
  const [form, setForm] = useState({
    kode: "", nama: "", merk: "", nomorSeri: "", deskripsi: "",
    tarif: "" as string | number, tarifBPJS: "" as string | number,
    status: "TERSEDIA", lokasiTerakhir: "",
  });

  useEffect(() => {
    setForm({
      kode: item?.kode ?? "",
      nama: item?.nama ?? "",
      merk: item?.merk ?? "",
      nomorSeri: item?.nomorSeri ?? "",
      deskripsi: "",
      tarif: item?.tarif ?? "",
      tarifBPJS: item?.tarifBPJS ?? "",
      status: item?.status ?? "TERSEDIA",
      lokasiTerakhir: item?.lokasiTerakhir ?? "",
    });
  }, [open]);

  const mutation = useMutation({
    mutationFn: async () => {
      const url = item ? `/api/masterdata/peralatan/${item.id}` : "/api/masterdata/peralatan";
      const method = item ? "PUT" : "POST";
      const body = {
        ...form,
        kode: form.kode.toUpperCase(),
        tarif:     form.tarif     ? Number(form.tarif)     : undefined,
        tarifBPJS: form.tarifBPJS ? Number(form.tarifBPJS) : undefined,
      };
      const r = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      if (!r.ok) { const e = await r.json(); throw new Error(e.error?.formErrors?.[0] ?? e.error ?? "Error"); }
    },
    onSuccess: () => { toast.success("Data disimpan"); onSuccess(); onClose(); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={o => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>{item ? "Edit Peralatan" : "Tambah Peralatan"}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            {!item && (
              <div className="space-y-1">
                <Label>Kode *</Label>
                <Input value={form.kode} onChange={e => setForm(p => ({ ...p, kode: e.target.value }))} placeholder="A001" />
              </div>
            )}
            <div className={`space-y-1 ${!item ? "" : "col-span-2"}`}>
              <Label>Nama *</Label>
              <Input value={form.nama} onChange={e => setForm(p => ({ ...p, nama: e.target.value }))} />
            </div>
            <div className="space-y-1"><Label>Merk</Label><Input value={form.merk} onChange={e => setForm(p => ({ ...p, merk: e.target.value }))} /></div>
            <div className="space-y-1"><Label>No. Seri</Label><Input value={form.nomorSeri} onChange={e => setForm(p => ({ ...p, nomorSeri: e.target.value }))} /></div>
            <div className="space-y-1">
              <Label>Tarif (Rp)</Label>
              <Input type="number" value={form.tarif} onChange={e => setForm(p => ({ ...p, tarif: e.target.value }))} placeholder="0" />
            </div>
            <div className="space-y-1">
              <Label>Tarif BPJS (Rp)</Label>
              <Input type="number" value={form.tarifBPJS} onChange={e => setForm(p => ({ ...p, tarifBPJS: e.target.value }))} placeholder="0" />
            </div>
            {item && <>
              <div className="space-y-1">
                <Label>Status</Label>
                <Select value={form.status} onValueChange={v => setForm(p => ({ ...p, status: v ?? "TERSEDIA" }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{["TERSEDIA","DIGUNAKAN","MAINTENANCE","RUSAK"].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1"><Label>Lokasi</Label><Input value={form.lokasiTerakhir} onChange={e => setForm(p => ({ ...p, lokasiTerakhir: e.target.value }))} placeholder="Ruang 1" /></div>
            </>}
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

export default function PeralatanPage() {
  const qc = useQueryClient();
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [editItem, setEditItem] = useState<Peralatan | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const refresh = () => qc.invalidateQueries({ queryKey: ["peralatan"] });

  useEffect(() => { setPage(1); }, [search, statusFilter]);

  const { data, isLoading } = useQuery({ queryKey: ["peralatan", statusFilter, search, page], queryFn: () => fetchPeralatan(statusFilter, search, page) });
  const items: Peralatan[] = data?.data ?? [];
  const total              = data?.total ?? 0;
  const totalPages         = data?.totalPages ?? 1;

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Cari peralatan..." className="pl-9 w-48" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <Select value={statusFilter} onValueChange={v => setStatusFilter(v ?? "ALL")}>
            <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Semua Status</SelectItem>
              {["TERSEDIA","DIGUNAKAN","MAINTENANCE","RUSAK"].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" size="icon" onClick={refresh}><RefreshCw className="h-4 w-4" /></Button>
          <Button onClick={() => setCreateOpen(true)} className="gap-2"><Plus className="h-4 w-4" />Tambah</Button>
        </div>
      </div>

      <Card><CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Peralatan</TableHead>
              <TableHead>Tarif</TableHead>
              <TableHead className="hidden md:table-cell">No. Seri</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="hidden lg:table-cell">Lokasi</TableHead>
              <TableHead className="w-16"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? Array.from({ length: 5 }).map((_, i) => (
              <TableRow key={i}>{Array.from({ length: 6 }).map((_, j) => <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>)}</TableRow>
            )) : items.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-center py-12 text-muted-foreground">Tidak ada peralatan</TableCell></TableRow>
            ) : items.map(item => (
              <TableRow key={item.id}>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Cpu className="h-4 w-4 text-muted-foreground shrink-0" />
                    <div>
                      <p className="font-medium text-sm">{item.nama}</p>
                      <p className="text-xs text-muted-foreground">{item.kode}{item.merk ? ` · ${item.merk}` : ""}</p>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  {item.tarif ? (
                    <div>
                      <p className="text-sm">{formatCurrency(item.tarif)}</p>
                      {item.tarifBPJS && <p className="text-xs text-muted-foreground">BPJS: {formatCurrency(item.tarifBPJS)}</p>}
                    </div>
                  ) : (
                    <span className="text-xs text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell className="hidden md:table-cell text-sm text-muted-foreground">{item.nomorSeri ?? "—"}</TableCell>
                <TableCell>
                  <Badge className={STATUS_COLORS[item.status]}>{item.status}</Badge>
                </TableCell>
                <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">{item.lokasiTerakhir ?? "—"}</TableCell>
                <TableCell>
                  <Button variant="ghost" size="icon" onClick={() => setEditItem(item)}><Pencil className="h-4 w-4" /></Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <PageControls page={page} totalPages={totalPages} total={total} limit={10} onPageChange={setPage} />
      </CardContent></Card>

      <PeralatanForm open={createOpen} onClose={() => setCreateOpen(false)} onSuccess={refresh} />
      <PeralatanForm open={Boolean(editItem)} onClose={() => setEditItem(null)} item={editItem} onSuccess={refresh} />
    </div>
  );
}
