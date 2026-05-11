'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import type { CreatePasienDTO, UpdatePasienDTO } from '../schemas/pasien.schema';

// Query Keys
export const pasienKeys = {
  all:    ['pasien'] as const,
  lists:  () => [...pasienKeys.all, 'list'] as const,
  list:   (p: object) => [...pasienKeys.lists(), p] as const,
  detail: (id: string) => [...pasienKeys.all, 'detail', id] as const,
};

// List
export function usePasienList(params?: {
  q?: string; tipe?: string; page?: number; limit?: number; isActive?: boolean;
}) {
  return useQuery({
    queryKey: pasienKeys.list(params ?? {}),
    queryFn: async () => {
      const sp = new URLSearchParams();
      if (params?.q)                sp.set('q',        params.q);
      if (params?.tipe)             sp.set('tipe',     params.tipe);
      if (params?.page)             sp.set('page',     String(params.page));
      if (params?.limit)            sp.set('limit',    String(params.limit));
      if (params?.isActive === false) sp.set('isActive', 'false');
      const res = await fetch(`/api/pasien?${sp}`);
      if (!res.ok) throw new Error('Gagal memuat data pasien');
      return res.json();
    },
    staleTime: 30_000,
  });
}

// Detail
export function usePasienDetail(id: string) {
  return useQuery({
    queryKey: pasienKeys.detail(id),
    queryFn: async () => {
      const res = await fetch(`/api/pasien/${id}`);
      if (!res.ok) throw new Error('Pasien tidak ditemukan');
      return res.json();
    },
    enabled: !!id,
  });
}

// Create
export function useCreatePasien() {
  const qc     = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: async (data: CreatePasienDTO) => {
      const res = await fetch('/api/pasien', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? 'Gagal mendaftarkan pasien');
      }
      return res.json();
    },
    onSuccess: (pasien) => {
      qc.invalidateQueries({ queryKey: pasienKeys.lists() });
      toast.success('Pasien berhasil didaftarkan', { description: `NoRM: ${pasien.nomorRM}` });
      router.push(`/pasien/${pasien.id}`);
    },
    onError: (err: Error) => {
      toast.error('Gagal mendaftarkan pasien', { description: err.message });
    },
  });
}

// Update
export function useUpdatePasien(id: string) {
  const qc     = useQueryClient();
  const router = useRouter();
  return useMutation({
    mutationFn: async (data: UpdatePasienDTO) => {
      const res = await fetch(`/api/pasien/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error ?? 'Gagal memperbarui'); }
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: pasienKeys.detail(id) });
      qc.invalidateQueries({ queryKey: pasienKeys.lists() });
      toast.success('Data pasien berhasil diperbarui');
      router.push(`/pasien/${id}`);
    },
    onError: (err: Error) => {
      toast.error('Gagal memperbarui', { description: err.message });
    },
  });
}

// Toggle aktif
export function useTogglePasienActive(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (isActive: boolean) => {
      const res = await fetch(`/api/pasien/${id}/toggle`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive }),
      });
      if (!res.ok) throw new Error('Gagal mengubah status pasien');
      return res.json();
    },
    onSuccess: (_, isActive) => {
      qc.invalidateQueries({ queryKey: pasienKeys.detail(id) });
      qc.invalidateQueries({ queryKey: pasienKeys.lists() });
      toast.success(isActive ? 'Pasien diaktifkan' : 'Pasien dinonaktifkan');
    },
    onError: (err: Error) => {
      toast.error('Gagal mengubah status', { description: err.message });
    },
  });
}

// Search debounced (untuk dropdown/combobox di form kunjungan)
export function usePasienSearch(q: string) {
  return useQuery({
    queryKey: ['pasien', 'search', q],
    queryFn: async () => {
      const res = await fetch(`/api/pasien/search?q=${encodeURIComponent(q)}`);
      if (!res.ok) throw new Error('Gagal mencari pasien');
      return res.json();
    },
    enabled: q.length >= 2,
    staleTime: 10_000,
  });
}
