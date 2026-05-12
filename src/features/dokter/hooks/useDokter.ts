'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import type {
  DokterProfileValues,
  JadwalPraktekValues,
  SharingFeeFormValues,
} from '../schemas/dokter.schema';

export const dokterKeys = {
  all:    ['dokter'] as const,
  lists:  () => [...dokterKeys.all, 'list'] as const,
  list:   (p: object) => [...dokterKeys.lists(), p] as const,
  detail: (id: string) => [...dokterKeys.all, 'detail', id] as const,
  fee:    (id: string) => [...dokterKeys.all, 'fee', id] as const,
  jadwal: (id: string) => [...dokterKeys.all, 'jadwal', id] as const,
};

export function useDokterList(params?: { q?: string; page?: number; limit?: number }) {
  return useQuery({
    queryKey: dokterKeys.list(params ?? {}),
    queryFn: async () => {
      const sp = new URLSearchParams();
      if (params?.q)     sp.set('q',     params.q);
      if (params?.page)  sp.set('page',  String(params.page));
      if (params?.limit) sp.set('limit', String(params.limit));
      const res = await fetch(`/api/dokter?${sp}`);
      if (!res.ok) throw new Error('Gagal memuat data dokter');
      return res.json();
    },
    staleTime: 30_000,
  });
}

export function useDokterDetail(id: string) {
  return useQuery({
    queryKey: dokterKeys.detail(id),
    queryFn: async () => {
      const res = await fetch(`/api/dokter/${id}`);
      if (!res.ok) throw new Error('Dokter tidak ditemukan');
      return res.json();
    },
    enabled: !!id,
  });
}

export function useSaveProfilDokter(userId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: DokterProfileValues) => {
      const res = await fetch(`/api/dokter/${userId}/profil`, {
        method:  'PUT',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(data),
      });
      if (!res.ok) {
        const e = await res.json();
        throw new Error(e.error ?? 'Gagal menyimpan profil');
      }
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: dokterKeys.lists() });
      qc.invalidateQueries({ queryKey: dokterKeys.detail(userId) });
      toast.success('Profil dokter berhasil disimpan');
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useAddPoliMapping(dokterProfileId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (poliId: string) => {
      const res = await fetch(`/api/dokter/${dokterProfileId}/mapping-poli`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ poliId }),
      });
      if (!res.ok) {
        const e = await res.json();
        throw new Error(e.error ?? 'Gagal mapping poli');
      }
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: dokterKeys.detail(dokterProfileId) });
      toast.success('Poli berhasil ditambahkan');
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useRemovePoliMapping(dokterProfileId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (poliId: string) => {
      const res = await fetch(`/api/dokter/${dokterProfileId}/mapping-poli/${poliId}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const e = await res.json();
        throw new Error(e.error ?? 'Gagal hapus mapping');
      }
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: dokterKeys.detail(dokterProfileId) });
      toast.success('Mapping poli dihapus');
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useSaveSharingFee(dokterProfileId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: SharingFeeFormValues) => {
      const res = await fetch(`/api/dokter/${dokterProfileId}/sharing-fee`, {
        method:  'PUT',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(data),
      });
      if (!res.ok) {
        const e = await res.json();
        throw new Error(e.error ?? 'Gagal simpan fee');
      }
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: dokterKeys.fee(dokterProfileId) });
      qc.invalidateQueries({ queryKey: dokterKeys.detail(dokterProfileId) });
      toast.success('Sharing fee berhasil disimpan');
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useCreateJadwal(dokterProfileId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: JadwalPraktekValues) => {
      const res = await fetch(`/api/dokter/${dokterProfileId}/jadwal`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(data),
      });
      if (!res.ok) {
        const e = await res.json();
        throw new Error(e.error ?? 'Gagal buat jadwal');
      }
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: dokterKeys.detail(dokterProfileId) });
      toast.success('Jadwal praktek berhasil ditambahkan');
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useUpdateJadwal(dokterProfileId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ jadwalId, data }: { jadwalId: string; data: Partial<JadwalPraktekValues> }) => {
      const res = await fetch(`/api/dokter/${dokterProfileId}/jadwal/${jadwalId}`, {
        method:  'PUT',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(data),
      });

      let body: Record<string, unknown> | null = null;
      try { body = await res.json(); } catch { /* empty body */ }

      if (!res.ok) {
        throw new Error((body as { error?: string })?.error ?? 'Gagal memperbarui jadwal');
      }
      return body;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: dokterKeys.detail(dokterProfileId) });
      toast.success('Jadwal berhasil diperbarui');
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useToggleJadwal(dokterProfileId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ jadwalId, isAktif }: { jadwalId: string; isAktif: boolean }) => {
      const res = await fetch(`/api/dokter/${dokterProfileId}/jadwal/${jadwalId}/toggle`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ isAktif }),
      });
      if (!res.ok) throw new Error('Gagal mengubah status jadwal');
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: dokterKeys.detail(dokterProfileId) });
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useDeleteJadwal(dokterProfileId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (jadwalId: string) => {
      const res = await fetch(`/api/dokter/${dokterProfileId}/jadwal/${jadwalId}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Gagal menghapus jadwal');
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: dokterKeys.detail(dokterProfileId) });
      toast.success('Jadwal berhasil dihapus');
    },
    onError: (e: Error) => toast.error(e.message),
  });
}
