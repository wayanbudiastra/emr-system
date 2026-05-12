"use client";

import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import {
  Users, Plus, Search, RefreshCw, MoreHorizontal,
  Pencil, KeyRound, UserCheck, UserX, Trash2, Shield,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import type { UserRow } from "@/types/user.types";

// ── Konstanta ──────────────────────────────────────────────

const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: "Super Admin",
  ADMISSION:   "Admission",
  KASIR:       "Kasir",
  DOKTER:      "Dokter",
  PERAWAT:     "Perawat",
  APOTEKER:    "Apoteker",
};

const ROLE_COLORS: Record<string, string> = {
  SUPER_ADMIN: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
  ADMISSION:   "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  KASIR:       "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
  DOKTER:      "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  PERAWAT:     "bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-300",
  APOTEKER:    "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300",
};

const ASSIGNABLE_ROLES = ["ADMISSION", "KASIR", "DOKTER", "PERAWAT", "APOTEKER", "SUPER_ADMIN"];

// ── API helpers ────────────────────────────────────────────

async function fetchUsers(params: { search?: string; role?: string; isActive?: string }) {
  const q = new URLSearchParams();
  if (params.search)   q.set("search",   params.search);
  if (params.role)     q.set("role",     params.role);
  if (params.isActive) q.set("isActive", params.isActive);
  const res = await fetch(`/api/users?${q}`);
  if (!res.ok) throw new Error("Gagal memuat data user");
  return res.json();
}

async function createUser(data: Record<string, string>) {
  const res = await fetch("/api/users", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
  if (!res.ok) { const err = await res.json(); throw new Error(err.error?.formErrors?.[0] ?? err.error ?? "Gagal membuat user"); }
  return res.json();
}

async function updateUser(id: string, data: Record<string, unknown>) {
  const res = await fetch(`/api/users/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
  if (!res.ok) { const err = await res.json(); throw new Error(err.error ?? "Gagal memperbarui user"); }
  return res.json();
}

async function toggleUser(id: string, isActive: boolean) {
  const res = await fetch(`/api/users/${id}/toggle`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ isActive }) });
  if (!res.ok) { const err = await res.json(); throw new Error(err.error ?? "Gagal mengubah status"); }
  return res.json();
}

async function resetPassword(id: string, newPassword: string, confirmPassword: string) {
  const res = await fetch(`/api/users/${id}/reset-password`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ newPassword, confirmPassword }) });
  if (!res.ok) { const err = await res.json(); throw new Error(err.error?.fieldErrors?.newPassword?.[0] ?? err.error ?? "Gagal reset password"); }
  return res.json();
}

async function deleteUser(id: string) {
  const res = await fetch(`/api/users/${id}`, { method: "DELETE" });
  if (!res.ok) { const err = await res.json(); throw new Error(err.error ?? "Gagal menghapus user"); }
  return res.json();
}

// ── Sub-components ─────────────────────────────────────────

function UserFormDialog({
  open, onClose, user, onSuccess,
}: {
  open: boolean;
  onClose: () => void;
  user?: UserRow | null;
  onSuccess: () => void;
}) {
  const isEdit = Boolean(user);
  const [form, setForm] = useState({
    nama: user?.nama ?? "", email: user?.email ?? "", password: "",
    role: user?.role ?? "ADMISSION", nip: user?.nip ?? "", telepon: user?.telepon ?? "",
    noSIP: user?.dokterProfile?.noSIP ?? "", spesialisasi: user?.dokterProfile?.spesialisasi ?? "",
  });

  const set = (k: string, v: string) => setForm((p) => ({ ...p, [k]: v }));

  const mutation = useMutation({
    mutationFn: () =>
      isEdit
        ? updateUser(user!.id, { nama: form.nama, role: form.role, nip: form.nip || undefined, telepon: form.telepon || undefined, sip: form.sip || undefined, spesialisasi: form.spesialisasi || undefined })
        : createUser({ ...form, nip: form.nip || undefined, telepon: form.telepon || undefined, sip: form.sip || undefined, spesialisasi: form.spesialisasi || undefined } as Record<string, string>),
    onSuccess: () => { toast.success(isEdit ? "User diperbarui" : "User dibuat"); onSuccess(); onClose(); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit User" : "Tambah User Baru"}</DialogTitle>
          <DialogDescription>Isi data pengguna dengan lengkap dan benar.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2 space-y-1">
              <Label>Nama Lengkap *</Label>
              <Input value={form.nama} onChange={(e) => set("nama", e.target.value)} placeholder="Nama lengkap" />
            </div>
            {!isEdit && (
              <div className="col-span-2 space-y-1">
                <Label>Email *</Label>
                <Input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} placeholder="email@domain.com" />
              </div>
            )}
            {!isEdit && (
              <div className="col-span-2 space-y-1">
                <Label>Password *</Label>
                <Input type="password" value={form.password} onChange={(e) => set("password", e.target.value)} placeholder="Min. 8 karakter" />
              </div>
            )}
            <div className="space-y-1">
              <Label>Role *</Label>
              <Select value={form.role} onValueChange={(v) => set("role", v ?? "ADMISSION")}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ASSIGNABLE_ROLES.map((r) => (
                    <SelectItem key={r} value={r}>{ROLE_LABELS[r]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>NIP</Label>
              <Input value={form.nip} onChange={(e) => set("nip", e.target.value)} placeholder="Nomor Induk Pegawai" />
            </div>
            <div className="col-span-2 space-y-1">
              <Label>Telepon</Label>
              <Input value={form.telepon} onChange={(e) => set("telepon", e.target.value)} placeholder="08xxxxxxxxxx" />
            </div>
            {form.role === "DOKTER" && (
              <>
                <div className="space-y-1">
                  <Label>SIP *</Label>
                  <Input value={form.sip} onChange={(e) => set("sip", e.target.value)} placeholder="Nomor SIP" />
                </div>
                <div className="space-y-1">
                  <Label>Spesialisasi</Label>
                  <Input value={form.spesialisasi} onChange={(e) => set("spesialisasi", e.target.value)} placeholder="Umum, Anak, dll" />
                </div>
              </>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Batal</Button>
          <Button onClick={() => mutation.mutate()} disabled={mutation.isPending}>
            {mutation.isPending ? "Menyimpan..." : isEdit ? "Simpan Perubahan" : "Buat User"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ResetPasswordDialog({ open, onClose, user, onSuccess }: { open: boolean; onClose: () => void; user: UserRow | null; onSuccess: () => void }) {
  const [pw, setPw]   = useState("");
  const [cpw, setCpw] = useState("");

  const mutation = useMutation({
    mutationFn: () => resetPassword(user!.id, pw, cpw),
    onSuccess: () => { toast.success("Password berhasil direset"); onSuccess(); onClose(); setPw(""); setCpw(""); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Reset Password</DialogTitle>
          <DialogDescription>Reset password untuk <strong>{user?.nama}</strong></DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1">
            <Label>Password Baru *</Label>
            <Input type="password" value={pw} onChange={(e) => setPw(e.target.value)} placeholder="Min. 8 karakter" />
          </div>
          <div className="space-y-1">
            <Label>Konfirmasi Password *</Label>
            <Input type="password" value={cpw} onChange={(e) => setCpw(e.target.value)} placeholder="Ulangi password" />
          </div>
          <p className="text-xs text-muted-foreground">Password harus mengandung huruf kapital dan angka.</p>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Batal</Button>
          <Button onClick={() => mutation.mutate()} disabled={mutation.isPending || !pw || !cpw}>
            {mutation.isPending ? "Mereset..." : "Reset Password"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DeleteDialog({ open, onClose, user, onSuccess }: { open: boolean; onClose: () => void; user: UserRow | null; onSuccess: () => void }) {
  const mutation = useMutation({
    mutationFn: () => deleteUser(user!.id),
    onSuccess: () => { toast.success("User dihapus"); onSuccess(); onClose(); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Hapus User</DialogTitle>
          <DialogDescription>
            Hapus akun <strong>{user?.nama}</strong>? Tindakan ini tidak dapat dibatalkan.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Batal</Button>
          <Button variant="destructive" onClick={() => mutation.mutate()} disabled={mutation.isPending}>
            {mutation.isPending ? "Menghapus..." : "Hapus"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Main Page ──────────────────────────────────────────────

export default function PenggunaPage() {
  const qc = useQueryClient();

  const [search, setSearch]     = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const [createOpen, setCreateOpen] = useState(false);
  const [editUser,   setEditUser]   = useState<UserRow | null>(null);
  const [resetUser,  setResetUser]  = useState<UserRow | null>(null);
  const [deleteUser_, setDeleteUser_] = useState<UserRow | null>(null);

  const refresh = useCallback(() => qc.invalidateQueries({ queryKey: ["users"] }), [qc]);

  const { data, isLoading } = useQuery({
    queryKey: ["users", search, roleFilter, statusFilter],
    queryFn: () => fetchUsers({
      search:   search || undefined,
      role:     roleFilter !== "all" ? roleFilter : undefined,
      isActive: statusFilter !== "all" ? statusFilter : undefined,
    }),
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) => toggleUser(id, isActive),
    onSuccess: () => { toast.success("Status user diperbarui"); refresh(); },
    onError: (e: Error) => toast.error(e.message),
  });

  const users: UserRow[] = data?.data ?? [];
  const total: number    = data?.total ?? 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Users className="h-6 w-6 text-primary" />
            Manajemen Pengguna
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Kelola akun, role, dan hak akses pengguna sistem
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" /> Tambah User
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {Object.entries(ROLE_LABELS).map(([role, label]) => {
          const count = users.filter((u) => u.role === role).length;
          return (
            <Card key={role} className="p-3">
              <div className="text-2xl font-bold">{isLoading ? "—" : count}</div>
              <div className="text-xs text-muted-foreground">{label}</div>
            </Card>
          );
        })}
      </div>

      {/* Filter */}
      <Card>
        <CardContent className="pt-4 pb-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Cari nama, email, atau NIP..."
                className="pl-9" value={search}
                onChange={(e) => setSearch(e.target.value)} />
            </div>
            <Select value={roleFilter} onValueChange={(v) => setRoleFilter(v ?? "all")}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="Semua Role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Role</SelectItem>
                {Object.entries(ROLE_LABELS).map(([r, l]) => (
                  <SelectItem key={r} value={r}>{l}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v ?? "all")}>
              <SelectTrigger className="w-full sm:w-36">
                <SelectValue placeholder="Semua Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Status</SelectItem>
                <SelectItem value="true">Aktif</SelectItem>
                <SelectItem value="false">Nonaktif</SelectItem>
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
            {isLoading ? "Memuat..." : `${total} pengguna ditemukan`}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Pengguna</TableHead>
                <TableHead>Role</TableHead>
                <TableHead className="hidden md:table-cell">NIP</TableHead>
                <TableHead className="hidden lg:table-cell">Terakhir Login</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-10"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading
                ? Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 6 }).map((_, j) => (
                        <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                      ))}
                    </TableRow>
                  ))
                : users.length === 0
                ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                      <Users className="h-10 w-10 mx-auto mb-2 opacity-30" />
                      Tidak ada pengguna ditemukan
                    </TableCell>
                  </TableRow>
                )
                : users.map((user) => (
                  <TableRow key={user.id} className={!user.isActive ? "opacity-50" : ""}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="gradient-primary text-white text-xs font-semibold">
                            {user.nama.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium text-sm leading-none">{user.nama}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">{user.email}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${ROLE_COLORS[user.role]}`}>
                        {user.role === "SUPER_ADMIN" && <Shield className="h-3 w-3" />}
                        {ROLE_LABELS[user.role]}
                      </span>
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                      {user.nip ?? "—"}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-xs text-muted-foreground">
                      {user.lastLoginAt
                        ? format(new Date(user.lastLoginAt), "dd MMM yyyy HH:mm", { locale: id })
                        : "Belum pernah"}
                    </TableCell>
                    <TableCell>
                      <Badge variant={user.isActive ? "default" : "secondary"} className="text-xs">
                        {user.isActive ? "Aktif" : "Nonaktif"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger className="h-8 w-8 flex items-center justify-center rounded hover:bg-accent">
                          <MoreHorizontal className="h-4 w-4" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => setEditUser(user)}>
                            <Pencil className="h-4 w-4 mr-2" /> Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setResetUser(user)}>
                            <KeyRound className="h-4 w-4 mr-2" /> Reset Password
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => toggleMutation.mutate({ id: user.id, isActive: !user.isActive })}
                            className={user.isActive ? "text-yellow-600" : "text-green-600"}>
                            {user.isActive
                              ? <><UserX className="h-4 w-4 mr-2" />Nonaktifkan</>
                              : <><UserCheck className="h-4 w-4 mr-2" />Aktifkan</>}
                          </DropdownMenuItem>
                          {user.role !== "SUPER_ADMIN" && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => setDeleteUser_(user)}
                                className="text-destructive focus:text-destructive">
                                <Trash2 className="h-4 w-4 mr-2" /> Hapus User
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Dialogs */}
      <UserFormDialog open={createOpen} onClose={() => setCreateOpen(false)} onSuccess={refresh} />
      <UserFormDialog open={Boolean(editUser)} onClose={() => setEditUser(null)} user={editUser} onSuccess={refresh} />
      <ResetPasswordDialog open={Boolean(resetUser)} onClose={() => setResetUser(null)} user={resetUser} onSuccess={refresh} />
      <DeleteDialog open={Boolean(deleteUser_)} onClose={() => setDeleteUser_(null)} user={deleteUser_} onSuccess={refresh} />
    </div>
  );
}
