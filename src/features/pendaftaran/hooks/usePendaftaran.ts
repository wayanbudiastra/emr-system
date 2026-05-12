'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import type { CreateAppointmentValues, WalkinValues } from '../schemas/pendaftaran.schema';

const qk = {
  jadwalTersedia: (p: object) => ['jadwal-tersedia', p] as const,
  appointments:   (p: object) => ['appointments', p]    as const,
  listPendaftaran:(p: object) => ['list-pendaftaran', p] as const,
  bookingByKode:  (kode: string) => ['booking', kode]   as const,
};

// ── Jadwal Tersedia ──────────────────────────────────────────
export function useJadwalTersedia(params: {
  tanggal:        string;
  spesialisasi?:  string;
  dokterProfileId?: string;
}) {
  return useQuery({
    queryKey: qk.jadwalTersedia(params),
    queryFn: async () => {
      const sp = new URLSearchParams({ tanggal: params.tanggal });
      if (params.spesialisasi)   sp.set('spesialisasi',   params.spesialisasi);
      if (params.dokterProfileId) sp.set('dokterProfileId', params.dokterProfileId);
      const res = await fetch(`/api/jadwal-tersedia?${sp}`);
      if (!res.ok) throw new Error('Gagal memuat jadwal');
      return res.json();
    },
    enabled: !!params.tanggal,
    staleTime: 30_000,
  });
}

// ── Appointment List ─────────────────────────────────────────
export function useAppointmentList(params: { tanggal: string; q?: string }) {
  return useQuery({
    queryKey: qk.appointments(params),
    queryFn: async () => {
      const sp = new URLSearchParams({ tanggal: params.tanggal });
      if (params.q) sp.set('q', params.q);
      const res = await fetch(`/api/appointment?${sp}`);
      if (!res.ok) throw new Error('Gagal memuat appointment');
      return res.json();
    },
    staleTime: 15_000,
  });
}

// ── Booking by Kode ──────────────────────────────────────────
export function useBookingByKode(kode: string) {
  return useQuery({
    queryKey: qk.bookingByKode(kode),
    queryFn: async () => {
      const res = await fetch(`/api/appointment/booking/${encodeURIComponent(kode)}`);
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        throw new Error(e.error ?? 'Kode booking tidak valid');
      }
      return res.json();
    },
    enabled: kode.length >= 5,
    retry: false,
    staleTime: 0,
  });
}

// ── List Pendaftaran (kunjungan hari ini) ─────────────────────
export function useListPendaftaran(params: { tanggal: string; q?: string; page?: number }) {
  return useQuery({
    queryKey: qk.listPendaftaran(params),
    queryFn: async () => {
      const sp = new URLSearchParams({ tanggal: params.tanggal });
      if (params.q)    sp.set('q',    params.q);
      if (params.page) sp.set('page', String(params.page));
      const res = await fetch(`/api/kunjungan/list-pendaftaran?${sp}`);
      if (!res.ok) throw new Error('Gagal memuat list pendaftaran');
      return res.json();
    },
    staleTime: 10_000,
  });
}

// ── Mutations ─────────────────────────────────────────────────
export function useCreateAppointment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: CreateAppointmentValues) => {
      const res = await fetch('/api/appointment', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error ?? 'Gagal buat appointment');
      return body;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['appointments'] });
      qc.invalidateQueries({ queryKey: ['jadwal-tersedia'] });
      toast.success('Appointment berhasil dibuat');
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useCheckinAppointment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: { kodeBooking: string; penjamin?: string }) => {
      const res = await fetch('/api/appointment/checkin', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error ?? 'Gagal check-in');
      return body;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['appointments'] });
      qc.invalidateQueries({ queryKey: ['list-pendaftaran'] });
      toast.success('Check-in berhasil — pasien terdaftar');
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useWalkin() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: WalkinValues) => {
      const res = await fetch('/api/kunjungan/walkin', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error ?? 'Gagal daftarkan pasien');
      return body;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['list-pendaftaran'] });
      qc.invalidateQueries({ queryKey: ['jadwal-tersedia'] });
      toast.success('Pasien berhasil didaftarkan');
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useCancelAppointment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/appointment/${id}/cancel`, { method: 'PATCH' });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error ?? 'Gagal batalkan appointment');
      return body;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['appointments'] });
      toast.success('Appointment dibatalkan');
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useCancelKunjungan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/kunjungan/${id}/cancel`, { method: 'PATCH' });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error ?? 'Gagal batalkan pendaftaran');
      return body;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['list-pendaftaran'] });
      toast.success('Pendaftaran dibatalkan');
    },
    onError: (e: Error) => toast.error(e.message),
  });
}
