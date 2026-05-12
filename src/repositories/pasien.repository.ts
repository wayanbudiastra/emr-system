import { getPrisma } from '@/lib/prisma';
import { generateNomorRM } from '@/lib/generate-rm';
import type { CreatePasienDTO, UpdatePasienDTO } from '@/features/pasien/schemas/pasien.schema';

export const pasienRepository = {

  async findAll(params?: {
    search?: string; tipePasien?: 'WNI' | 'WNA';
    isActive?: boolean; page?: number; limit?: number;
  }) {
    const prisma = await getPrisma();
    const { search, tipePasien, isActive = true, page = 1, limit = 20 } = params ?? {};
    const where = {
      isActive,
      ...(tipePasien ? { tipePasien } : {}),
      ...(search ? {
        OR: [
          { nama:     { contains: search, mode: 'insensitive' as const } },
          { nomorRM:  { contains: search, mode: 'insensitive' as const } },
          { nik:      { contains: search, mode: 'insensitive' as const } },
          { noPaspor: { contains: search, mode: 'insensitive' as const } },
          { telepon:  { contains: search } },
        ],
      } : {}),
    };

    const [data, total] = await Promise.all([
      prisma.pasien.findMany({
        where,
        select: {
          id: true, nomorRM: true, nama: true,
          tempatLahir: true, tanggalLahir: true,
          jenisKelamin: true, tipePasien: true,
          telepon: true, alamat: true, isActive: true, createdAt: true,
          kontakDarurat: {
            where: { isPrimary: true },
            select: { nama: true, nomorHP: true, hubungan: true },
            take: 1,
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.pasien.count({ where }),
    ]);

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  },

  async findById(id: string) {
    const prisma = await getPrisma();
    return prisma.pasien.findUnique({
      where: { id },
      include: {
        kontakDarurat: { orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }] },
        kunjungan: {
          orderBy: { tanggal: 'desc' }, take: 5,
          select: {
            id: true, nomorAntrean: true, tanggal: true, status: true,
            poli:   { select: { nama: true } },
            dokterProfile: { select: { user: { select: { nama: true } } } },
          },
        },
      },
    });
  },

  async findByNomorRM(nomorRM: string) {
    const prisma = await getPrisma();
    return prisma.pasien.findUnique({ where: { nomorRM } });
  },

  async findByNIK(nik: string, excludeId?: string) {
    const prisma = await getPrisma();
    return prisma.pasien.findFirst({
      where: { nik, ...(excludeId ? { id: { not: excludeId } } : {}) },
      select: { id: true, nama: true, nomorRM: true },
    });
  },

  async findByNoPaspor(noPaspor: string, excludeId?: string) {
    const prisma = await getPrisma();
    return prisma.pasien.findFirst({
      where: { noPaspor, ...(excludeId ? { id: { not: excludeId } } : {}) },
      select: { id: true, nama: true, nomorRM: true },
    });
  },

  async search(q: string) {
    const prisma = await getPrisma();
    return prisma.pasien.findMany({
      where: {
        isActive: true,
        OR: [
          { nama:    { contains: q, mode: 'insensitive' as const } },
          { nomorRM: { contains: q, mode: 'insensitive' as const } },
          { nik:     { contains: q, mode: 'insensitive' as const } },
        ],
      },
      select: {
        id: true, nomorRM: true, nama: true,
        tipePasien: true, tanggalLahir: true, telepon: true,
      },
      take: 10,
      orderBy: { nama: 'asc' },
    });
  },

  async create(data: CreatePasienDTO) {
    const prisma = await getPrisma();
    const nomorRM = await generateNomorRM();
    const { kontakDarurat = [], ...fields } = data;

    const kontakNormalized = kontakDarurat.map((k) => ({
      ...k,
      isPrimary: kontakDarurat.length === 1 ? true : k.isPrimary,
    }));

    return prisma.pasien.create({
      data: {
        ...fields,
        nomorRM,
        noPaspor:  data.noPaspor?.toUpperCase() ?? null,
        email:     data.email  || null,
        noBPJS:    data.noBPJS || null,
        kontakDarurat: { create: kontakNormalized },
      },
      include: { kontakDarurat: true },
    });
  },

  async update(id: string, data: UpdatePasienDTO) {
    const prisma = await getPrisma();
    const { kontakDarurat, ...fields } = data;

    return prisma.$transaction(async (tx) => {
      const updated = await tx.pasien.update({
        where: { id },
        data: { ...fields, email: data.email || null, noBPJS: data.noBPJS || null },
      });

      if (kontakDarurat !== undefined) {
        await tx.kontakDarurat.deleteMany({ where: { pasienId: id } });
        if (kontakDarurat.length > 0) {
          await tx.kontakDarurat.createMany({
            data: kontakDarurat.map((k) => ({
              ...k,
              id: undefined,
              pasienId:  id,
              isPrimary: kontakDarurat.length === 1 ? true : k.isPrimary,
            })),
          });
        }
      }

      return updated;
    });
  },

  async toggleActive(id: string, isActive: boolean) {
    const prisma = await getPrisma();
    return prisma.pasien.update({ where: { id }, data: { isActive } });
  },

  async addKontakDarurat(pasienId: string, data: {
    nama: string; nomorHP: string; hubungan: string; alamat?: string; isPrimary?: boolean;
  }) {
    const prisma = await getPrisma();
    return prisma.kontakDarurat.create({
      data: { ...data, pasienId, hubungan: data.hubungan as never },
    });
  },

  async updateKontakDarurat(id: string, data: Partial<{
    nama: string; nomorHP: string; hubungan: string; alamat?: string; isPrimary?: boolean;
  }>) {
    const prisma = await getPrisma();
    return prisma.kontakDarurat.update({
      where: { id },
      data: { ...data, hubungan: data.hubungan as never },
    });
  },

  async deleteKontakDarurat(id: string) {
    const prisma = await getPrisma();
    return prisma.kontakDarurat.delete({ where: { id } });
  },

  async findKontakDarurat(pasienId: string) {
    const prisma = await getPrisma();
    return prisma.kontakDarurat.findMany({
      where: { pasienId },
      orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }],
    });
  },

  async logActivity(params: {
    userId: string; action: string; resourceId: string; detail?: object;
  }) {
    const prisma = await getPrisma();
    return prisma.activityLog.create({
      data: {
        userId:     params.userId,
        action:     params.action,
        resource:   'pasien',
        resourceId: params.resourceId,
        detail:     params.detail ?? {},
      },
    });
  },
};
