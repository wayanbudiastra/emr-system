import { getPrisma } from '@/lib/prisma';
import type { StatusAppointment, TipePenjamin } from '@prisma/client';

const appointmentInclude = {
  pasien:       { select: { id: true, nomorRM: true, nama: true, telepon: true } },
  dokterProfile: { select: { id: true, spesialisasi: true, user: { select: { nama: true } } } },
  jadwalPraktek: { select: { id: true, hari: true, jamMulai: true, jamSelesai: true, kuotaPasien: true } },
  kunjungan:    { select: { id: true, nomorAntrean: true, status: true } },
} as const;

export const appointmentRepository = {

  async findAll(params?: {
    tanggal?:  Date;
    status?:   StatusAppointment;
    search?:   string;
    page?:     number;
    limit?:    number;
  }) {
    const prisma = await getPrisma();
    const { tanggal, status, search, page = 1, limit = 30 } = params ?? {};

    const tanggalStart = tanggal
      ? new Date(new Date(tanggal).setHours(0, 0, 0, 0))
      : new Date(new Date().setHours(0, 0, 0, 0));
    const tanggalEnd = new Date(tanggalStart);
    tanggalEnd.setDate(tanggalEnd.getDate() + 1);

    const where = {
      tanggalPraktek: { gte: tanggalStart, lt: tanggalEnd },
      ...(status ? { status } : {}),
      ...(search ? {
        OR: [
          { kodeBooking: { contains: search, mode: 'insensitive' as const } },
          { namaPasien:  { contains: search, mode: 'insensitive' as const } },
          { pasien: { nama: { contains: search, mode: 'insensitive' as const } } },
        ],
      } : {}),
    };

    const [data, total] = await Promise.all([
      prisma.appointment.findMany({
        where,
        include: appointmentInclude,
        orderBy: { createdAt: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.appointment.count({ where }),
    ]);

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  },

  async findByKode(kodeBooking: string) {
    const prisma = await getPrisma();
    return prisma.appointment.findUnique({
      where: { kodeBooking },
      include: appointmentInclude,
    });
  },

  async findById(id: string) {
    const prisma = await getPrisma();
    return prisma.appointment.findUnique({
      where: { id },
      include: appointmentInclude,
    });
  },

  async countByJadwal(jadwalPraktekId: string, tanggal: Date): Promise<number> {
    const prisma = await getPrisma();
    const start = new Date(new Date(tanggal).setHours(0, 0, 0, 0));
    const end   = new Date(start);
    end.setDate(end.getDate() + 1);

    return prisma.appointment.count({
      where: {
        jadwalPraktekId,
        tanggalPraktek: { gte: start, lt: end },
        status: { in: ['BOOKED', 'CHECKED_IN'] },
      },
    });
  },

  async create(data: {
    kodeBooking:     string;
    pasienId?:       string | null;
    namaPasien?:     string | null;
    nikSementara?:   string | null;
    noHP?:           string | null;
    dokterProfileId: string;
    jadwalPraktekId: string;
    tanggalPraktek:  Date;
    keluhan?:        string | null;
    penjamin:        TipePenjamin;
  }) {
    const prisma = await getPrisma();
    return prisma.appointment.create({
      data,
      include: appointmentInclude,
    });
  },

  async checkin(id: string, kunjunganId: string) {
    const prisma = await getPrisma();
    return prisma.appointment.update({
      where: { id },
      data:  { status: 'CHECKED_IN', kunjunganId },
    });
  },

  async cancel(id: string) {
    const prisma = await getPrisma();
    return prisma.appointment.update({
      where: { id },
      data:  { status: 'CANCELLED' },
    });
  },
};
