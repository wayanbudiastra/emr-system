import { getPrisma } from '@/lib/prisma';
import type { KategoriItem, HariKerja } from '@prisma/client';
import type { DokterProfileValues, JadwalPraktekValues } from '@/features/dokter/schemas/dokter.schema';

export const dokterRepository = {

  async findAll(params?: { search?: string; isActive?: boolean; page?: number; limit?: number }) {
    const prisma = await getPrisma();
    const { search, isActive, page = 1, limit = 20 } = params ?? {};

    const where = {
      user: {
        role: 'DOKTER' as const,
        ...(isActive !== undefined ? { isActive } : {}),
        ...(search ? {
          OR: [
            { nama:  { contains: search, mode: 'insensitive' as const } },
            { email: { contains: search, mode: 'insensitive' as const } },
          ],
        } : {}),
      },
    };

    const [data, total] = await Promise.all([
      prisma.dokterProfile.findMany({
        where,
        include: {
          user: { select: { id: true, nama: true, email: true, telepon: true, isActive: true } },
          poliMapping: {
            where:   { isAktif: true },
            include: { poli: { select: { id: true, nama: true, kode: true } } },
          },
          sharingFee: true,
        },
        orderBy: { user: { nama: 'asc' } },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.dokterProfile.count({ where }),
    ]);

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  },

  async findById(id: string) {
    const prisma = await getPrisma();
    return prisma.dokterProfile.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, nama: true, email: true, telepon: true, nip: true, isActive: true } },
        poliMapping: {
          include: {
            poli: { select: { id: true, nama: true, kode: true, lantai: true } },
            jadwalPraktek: { orderBy: [{ hari: 'asc' }, { jamMulai: 'asc' }] },
          },
          orderBy: { createdAt: 'asc' },
        },
        sharingFee: { orderBy: { kategori: 'asc' } },
      },
    });
  },

  async findByUserId(userId: string) {
    const prisma = await getPrisma();
    return prisma.dokterProfile.findUnique({
      where: { userId },
      include: {
        user:        { select: { nama: true, email: true } },
        poliMapping: { include: { poli: true } },
        sharingFee:  true,
      },
    });
  },

  async findUsersWithoutProfile() {
    const prisma = await getPrisma();
    return prisma.user.findMany({
      where: { role: 'DOKTER', isActive: true, dokterProfile: null },
      select: { id: true, nama: true, email: true, nip: true },
      orderBy: { nama: 'asc' },
    });
  },

  async upsertProfile(userId: string, data: DokterProfileValues) {
    const prisma = await getPrisma();
    const cleanData = {
      ...data,
      nik:   data.nik   || null,
      noSIP: data.noSIP || null,
    };
    return prisma.dokterProfile.upsert({
      where:  { userId },
      create: { userId, ...cleanData },
      update: cleanData,
    });
  },

  async getMappingByDokter(dokterProfileId: string) {
    const prisma = await getPrisma();
    return prisma.dokterPoli.findMany({
      where:   { dokterProfileId },
      include: {
        poli:          { select: { id: true, nama: true, kode: true } },
        jadwalPraktek: { orderBy: [{ hari: 'asc' }, { jamMulai: 'asc' }] },
      },
      orderBy: { createdAt: 'asc' },
    });
  },

  async addPoliMapping(dokterProfileId: string, poliId: string) {
    const prisma = await getPrisma();
    return prisma.dokterPoli.upsert({
      where:  { dokterProfileId_poliId: { dokterProfileId, poliId } },
      create: { dokterProfileId, poliId },
      update: { isAktif: true },
    });
  },

  async removePoliMapping(dokterProfileId: string, poliId: string) {
    const prisma = await getPrisma();
    return prisma.dokterPoli.update({
      where: { dokterProfileId_poliId: { dokterProfileId, poliId } },
      data:  { isAktif: false },
    });
  },

  async getSharingFee(dokterProfileId: string) {
    const prisma = await getPrisma();
    return prisma.sharingFee.findMany({
      where:   { dokterProfileId },
      orderBy: { kategori: 'asc' },
    });
  },

  async upsertSharingFee(dokterProfileId: string, fees: Array<{ kategori: string; persentase: number }>) {
    const prisma = await getPrisma();
    return prisma.$transaction(
      fees.map(f =>
        prisma.sharingFee.upsert({
          where:  { dokterProfileId_kategori: { dokterProfileId, kategori: f.kategori as KategoriItem } },
          create: { dokterProfileId, kategori: f.kategori as KategoriItem, persentase: f.persentase },
          update: { persentase: f.persentase },
        })
      )
    );
  },

  async getJadwalById(id: string) {
    const prisma = await getPrisma();
    return prisma.jadwalPraktek.findUnique({ where: { id } });
  },

  async getJadwalByDokterPoli(dokterPoliId: string) {
    const prisma = await getPrisma();
    return prisma.jadwalPraktek.findMany({
      where:   { dokterPoliId },
      orderBy: [{ hari: 'asc' }, { jamMulai: 'asc' }],
    });
  },

  async createJadwal(data: JadwalPraktekValues) {
    const prisma = await getPrisma();
    return prisma.jadwalPraktek.create({ data: { ...data, hari: data.hari as HariKerja } });
  },

  async updateJadwal(id: string, data: Partial<JadwalPraktekValues>) {
    const prisma = await getPrisma();
    const updateData = { ...data } as Record<string, unknown>;
    if (data.hari) updateData.hari = data.hari as HariKerja;
    return prisma.jadwalPraktek.update({ where: { id }, data: updateData });
  },

  async toggleJadwal(id: string, isAktif: boolean) {
    const prisma = await getPrisma();
    return prisma.jadwalPraktek.update({ where: { id }, data: { isAktif } });
  },

  async deleteJadwal(id: string) {
    const prisma = await getPrisma();
    return prisma.jadwalPraktek.delete({ where: { id } });
  },

  async checkJadwalOverlap(params: {
    dokterPoliId: string;
    hari: string;
    jamMulai: string;
    jamSelesai: string;
    excludeId?: string;
  }) {
    const prisma = await getPrisma();
    const jadwal = await prisma.jadwalPraktek.findMany({
      where: {
        dokterPoliId: params.dokterPoliId,
        hari:         params.hari as HariKerja,
        isAktif:      true,
        ...(params.excludeId ? { id: { not: params.excludeId } } : {}),
      },
    });

    const toMenit = (jam: string) => {
      const [h, m] = jam.split(':').map(Number);
      return h * 60 + m;
    };
    const newMulai   = toMenit(params.jamMulai);
    const newSelesai = toMenit(params.jamSelesai);

    return jadwal.some(j => {
      const em = toMenit(j.jamMulai);
      const es = toMenit(j.jamSelesai);
      return newMulai < es && newSelesai > em;
    });
  },
};
