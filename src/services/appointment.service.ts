import { getPrisma } from '@/lib/prisma';
import { appointmentRepository } from '@/repositories/appointment.repository';
import type { CreateAppointmentValues, WalkinValues } from '@/features/pendaftaran/schemas/pendaftaran.schema';
import type { TipePenjamin } from '@prisma/client';

function generateKodeBooking(): string {
  const now    = new Date();
  const ymd    = now.toISOString().slice(0, 10).replace(/-/g, '');
  const random = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `APPT-${ymd}-${random}`;
}

function generateNomorAntrean(prefix: string, seq: number): string {
  return `${prefix}${String(seq).padStart(3, '0')}`;
}

export const appointmentService = {

  async getAll(params?: Parameters<typeof appointmentRepository.findAll>[0]) {
    return appointmentRepository.findAll(params);
  },

  async getByKode(kodeBooking: string) {
    const appt = await appointmentRepository.findByKode(kodeBooking);
    if (!appt) throw new Error(`Kode booking "${kodeBooking}" tidak ditemukan`);
    if (appt.status === 'CANCELLED') throw new Error('Appointment ini sudah dibatalkan');
    if (appt.status === 'CHECKED_IN') throw new Error('Pasien sudah melakukan check-in');
    return appt;
  },

  async create(data: CreateAppointmentValues) {
    // Cek kuota
    const terpakai = await appointmentRepository.countByJadwal(
      data.jadwalPraktekId,
      data.tanggalPraktek,
    );

    const prisma  = await getPrisma();
    const jadwal  = await prisma.jadwalPraktek.findUnique({ where: { id: data.jadwalPraktekId } });
    if (!jadwal) throw new Error('Jadwal tidak ditemukan');
    if (!jadwal.isAktif) throw new Error('Jadwal ini tidak aktif');
    if (terpakai >= jadwal.kuotaPasien) {
      throw new Error(`Kuota jadwal ini sudah penuh (${jadwal.kuotaPasien} pasien)`);
    }

    const kodeBooking = generateKodeBooking();

    return appointmentRepository.create({
      kodeBooking,
      pasienId:       data.pasienId       || null,
      namaPasien:     data.namaPasien     || null,
      nikSementara:   data.nikSementara   || null,
      noHP:           data.noHP           || null,
      dokterProfileId: data.dokterProfileId,
      jadwalPraktekId: data.jadwalPraktekId,
      tanggalPraktek:  data.tanggalPraktek,
      keluhan:         data.keluhan       || null,
      penjamin:        data.penjamin as TipePenjamin,
    });
  },

  async checkin(kodeBooking: string, penjaminOverride?: TipePenjamin) {
    const appt = await appointmentRepository.findByKode(kodeBooking);
    if (!appt) throw new Error('Kode booking tidak ditemukan');
    if (appt.status !== 'BOOKED') throw new Error(`Status appointment: ${appt.status}. Hanya BOOKED yang bisa check-in.`);

    if (!appt.pasienId) throw new Error('Appointment ini tidak memiliki pasien terdaftar. Daftarkan pasien terlebih dahulu.');

    const prisma = await getPrisma();

    // Hitung antrean hari ini untuk poli dokter tersebut
    const dokterPoli = await prisma.dokterPoli.findFirst({
      where: {
        dokterProfileId: appt.dokterProfileId,
        isAktif: true,
      },
      include: { poli: true },
    });

    const today    = new Date(); today.setHours(0, 0, 0, 0);
    const todayEnd = new Date(today); todayEnd.setDate(todayEnd.getDate() + 1);

    const poliId = dokterPoli?.poliId;

    const countToday = await prisma.kunjungan.count({
      where: {
        dokterId: appt.dokterProfileId,
        tanggal:  { gte: today, lt: todayEnd },
      },
    });

    const nomorAntrean = generateNomorAntrean('A', countToday + 1);

    const kunjungan = await prisma.kunjungan.create({
      data: {
        nomorAntrean,
        pasienId: appt.pasienId,
        dokterId: appt.dokterProfileId,
        poliId:   poliId ?? null,
        keluhan:  appt.keluhan,
        penjamin: penjaminOverride ?? appt.penjamin,
        status:   'MENUNGGU',
      },
    });

    await appointmentRepository.checkin(appt.id, kunjungan.id);

    return { kunjungan, nomorAntrean };
  },

  async walkin(data: WalkinValues) {
    const prisma = await getPrisma();

    // Validasi jadwal aktif hari ini
    const jadwal = await prisma.jadwalPraktek.findUnique({
      where: { id: data.jadwalPraktekId },
      include: { dokterPoli: { include: { dokterProfile: { include: { user: true } } } } },
    });
    if (!jadwal || !jadwal.isAktif) throw new Error('Jadwal tidak aktif');

    const today    = new Date(); today.setHours(0, 0, 0, 0);
    const todayEnd = new Date(today); todayEnd.setDate(todayEnd.getDate() + 1);

    const countToday = await prisma.kunjungan.count({
      where: {
        dokterId: data.dokterProfileId,
        tanggal:  { gte: today, lt: todayEnd },
      },
    });

    const nomorAntrean = generateNomorAntrean('W', countToday + 1);

    const kunjungan = await prisma.kunjungan.create({
      data: {
        nomorAntrean,
        pasienId: data.pasienId,
        dokterId: data.dokterProfileId,
        poliId:   data.poliId,
        keluhan:  data.keluhan,
        penjamin: data.penjamin as TipePenjamin,
        status:   'MENUNGGU',
      },
      include: {
        pasien:        { select: { nama: true, nomorRM: true } },
        dokterProfile: { include: { user: { select: { nama: true } } } },
        poli:          { select: { nama: true } },
      },
    });

    return { kunjungan, nomorAntrean };
  },

  async cancel(id: string) {
    const appt = await appointmentRepository.findById(id);
    if (!appt) throw new Error('Appointment tidak ditemukan');
    if (appt.status === 'CHECKED_IN') throw new Error('Tidak bisa batalkan appointment yang sudah check-in');
    return appointmentRepository.cancel(id);
  },

  // Jadwal tersedia untuk Tab 1
  async getJadwalTersedia(params: { tanggal: Date; spesialisasi?: string; dokterProfileId?: string }) {
    const prisma = await getPrisma();

    const hari = ['MINGGU', 'SENIN', 'SELASA', 'RABU', 'KAMIS', 'JUMAT', 'SABTU'][params.tanggal.getDay()];

    const jadwalList = await prisma.jadwalPraktek.findMany({
      where: {
        hari:    hari as never,
        isAktif: true,
        dokterPoli: {
          isAktif: true,
          dokterProfile: {
            isActive: true,
            ...(params.dokterProfileId ? { id: params.dokterProfileId } : {}),
            ...(params.spesialisasi ? { spesialisasi: { contains: params.spesialisasi, mode: 'insensitive' } } : {}),
          },
        },
      },
      include: {
        dokterPoli: {
          include: {
            poli:          { select: { id: true, nama: true, kode: true } },
            dokterProfile: { select: { id: true, spesialisasi: true, noSIP: true, tglExpiredSIP: true, user: { select: { nama: true } } } },
          },
        },
      },
      orderBy: [{ jamMulai: 'asc' }],
    });

    // Hitung kuota terpakai per jadwal
    const result = await Promise.all(
      jadwalList.map(async (j) => {
        const terpakai = await appointmentRepository.countByJadwal(j.id, params.tanggal);
        return {
          ...j,
          kuotaTerpakai: terpakai,
          sisaKuota:     Math.max(0, j.kuotaPasien - terpakai),
          tersedia:      terpakai < j.kuotaPasien,
        };
      })
    );

    return result;
  },

  // List kunjungan hari ini untuk Tab 3
  async getListPendaftaran(params: { tanggal?: Date; search?: string; page?: number; limit?: number }) {
    const prisma = await getPrisma();
    const { tanggal, search, page = 1, limit = 30 } = params;

    const start = tanggal
      ? new Date(new Date(tanggal).setHours(0, 0, 0, 0))
      : new Date(new Date().setHours(0, 0, 0, 0));
    const end = new Date(start);
    end.setDate(end.getDate() + 1);

    const where = {
      tanggal: { gte: start, lt: end },
      ...(search ? {
        OR: [
          { nomorAntrean: { contains: search, mode: 'insensitive' as const } },
          { pasien: { nama: { contains: search, mode: 'insensitive' as const } } },
          { pasien: { nomorRM: { contains: search, mode: 'insensitive' as const } } },
        ],
      } : {}),
    };

    const [data, total] = await Promise.all([
      prisma.kunjungan.findMany({
        where,
        include: {
          pasien:        { select: { id: true, nomorRM: true, nama: true, telepon: true } },
          dokterProfile: { include: { user: { select: { nama: true } } } },
          poli:          { select: { nama: true, kode: true } },
          billing:       { select: { status: true } },
          appointment:   { select: { kodeBooking: true } },
        },
        orderBy: { createdAt: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.kunjungan.count({ where }),
    ]);

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  },

  async cancelKunjungan(id: string) {
    const prisma = await getPrisma();
    const kunjungan = await prisma.kunjungan.findUnique({
      where: { id },
      include: { billing: true, appointment: true },
    });

    if (!kunjungan) throw new Error('Kunjungan tidak ditemukan');
    if (kunjungan.billing && ['LUNAS', 'SEBAGIAN'].includes(kunjungan.billing.status)) {
      throw new Error('Tidak bisa batalkan kunjungan yang sudah memiliki pembayaran');
    }

    const updated = await prisma.kunjungan.update({
      where: { id },
      data:  { status: 'DIBATALKAN' },
    });

    if (kunjungan.appointment) {
      await prisma.appointment.update({
        where: { id: kunjungan.appointment.id },
        data:  { status: 'CANCELLED', kunjunganId: null },
      });
    }

    return updated;
  },
};
