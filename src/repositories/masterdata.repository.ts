import { getPrisma } from "@/lib/prisma";
import type { KategoriItem, StatusPeralatan } from "@prisma/client";

export const masterdataRepository = {

  // ── Poli ─────────────────────────────────────────────────
  async getAllPoli(includeInactive = false) {
    const prisma = await getPrisma();
    return prisma.poli.findMany({
      where: includeInactive ? undefined : { isActive: true },
      orderBy: { nama: "asc" },
    });
  },

  async createPoli(data: { nama: string; kode: string; deskripsi?: string; lantai?: string }) {
    const prisma = await getPrisma();
    return prisma.poli.create({ data });
  },

  async updatePoli(id: string, data: Partial<{ nama: string; kode: string; deskripsi: string; lantai: string; isActive: boolean }>) {
    const prisma = await getPrisma();
    return prisma.poli.update({ where: { id }, data });
  },

  // ── Tindakan ──────────────────────────────────────────────
  async getAllTindakan(params?: { search?: string; poliId?: string; page?: number; limit?: number }) {
    const prisma = await getPrisma();
    const { search, poliId, page = 1, limit = 20 } = params ?? {};
    const where = {
      kategori: "TINDAKAN" as KategoriItem,
      ...(search ? { nama: { contains: search, mode: "insensitive" as const } } : {}),
      ...(poliId ? { poliMapping: { some: { poliId } } } : {}),
    };
    const [data, total] = await Promise.all([
      prisma.masterTindakan.findMany({
        where, orderBy: { nama: "asc" },
        skip: (page - 1) * limit, take: limit,
        include: { poliMapping: { include: { poli: { select: { id: true, nama: true, kode: true } } } } },
      }),
      prisma.masterTindakan.count({ where }),
    ]);
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  },

  async getTindakanByPoli(poliId: string) {
    const prisma = await getPrisma();
    return prisma.masterTindakan.findMany({
      where: { kategori: "TINDAKAN", isActive: true, poliMapping: { some: { poliId } } },
      orderBy: { nama: "asc" },
    });
  },

  async createTindakan(data: { kode: string; nama: string; tarif: number; tarifBPJS?: number; deskripsi?: string }) {
    const prisma = await getPrisma();
    return prisma.masterTindakan.create({ data: { ...data, kategori: "TINDAKAN" } });
  },

  async updateTindakan(id: string, data: Partial<{ nama: string; tarif: number; tarifBPJS: number; deskripsi: string; isActive: boolean }>) {
    const prisma = await getPrisma();
    return prisma.masterTindakan.update({ where: { id }, data });
  },

  async deleteTindakan(id: string) {
    const prisma = await getPrisma();
    return prisma.masterTindakan.delete({ where: { id } });
  },

  async mapTindakanToPoli(masterTindakanId: string, poliIds: string[]) {
    const prisma = await getPrisma();
    return prisma.tindakanPoli.createMany({
      data: poliIds.map(poliId => ({ masterTindakanId, poliId })),
      skipDuplicates: true,
    });
  },

  async replaceMappingTindakan(masterTindakanId: string, poliIds: string[]) {
    const prisma = await getPrisma();
    await prisma.tindakanPoli.deleteMany({ where: { masterTindakanId } });
    if (poliIds.length > 0) {
      await prisma.tindakanPoli.createMany({
        data: poliIds.map(poliId => ({ masterTindakanId, poliId })),
        skipDuplicates: true,
      });
    }
  },

  async getMappingByTindakan(masterTindakanId: string) {
    const prisma = await getPrisma();
    return prisma.tindakanPoli.findMany({
      where: { masterTindakanId },
      include: { poli: { select: { id: true, nama: true, kode: true } } },
    });
  },

  // ── Item Penunjang (Lab & Rad) ────────────────────────────
  async getAllPenunjang(params?: { kategori?: "LAB" | "RADIOLOGI"; search?: string; page?: number; limit?: number }) {
    const prisma = await getPrisma();
    const { kategori, search, page = 1, limit = 20 } = params ?? {};
    const where = {
      ...(kategori ? { kategori: kategori as KategoriItem } : { kategori: { in: ["LAB", "RADIOLOGI"] as KategoriItem[] } }),
      ...(search ? { nama: { contains: search, mode: "insensitive" as const } } : {}),
    };
    const [data, total] = await Promise.all([
      prisma.itemPenunjang.findMany({ where, orderBy: { nama: "asc" }, skip: (page - 1) * limit, take: limit }),
      prisma.itemPenunjang.count({ where }),
    ]);
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  },

  async createPenunjang(data: { kode: string; nama: string; kategori: KategoriItem; tarif: number; tarifBPJS?: number; deskripsi?: string; satuanWaktu?: string }) {
    const prisma = await getPrisma();
    return prisma.itemPenunjang.create({ data });
  },

  async updatePenunjang(id: string, data: Partial<{ nama: string; tarif: number; tarifBPJS: number; deskripsi: string; satuanWaktu: string; isActive: boolean }>) {
    const prisma = await getPrisma();
    return prisma.itemPenunjang.update({ where: { id }, data });
  },

  // ── Peralatan Medis ───────────────────────────────────────
  async getAllPeralatan(params?: { status?: StatusPeralatan; search?: string; page?: number; limit?: number }) {
    const prisma = await getPrisma();
    const { status, search, page = 1, limit = 20 } = params ?? {};
    const where = {
      ...(status ? { status } : {}),
      ...(search ? { nama: { contains: search, mode: "insensitive" as const } } : {}),
    };
    const [data, total] = await Promise.all([
      prisma.peralatanMedis.findMany({ where, orderBy: { nama: "asc" }, skip: (page - 1) * limit, take: limit }),
      prisma.peralatanMedis.count({ where }),
    ]);
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  },

  async createPeralatan(data: { kode: string; nama: string; merk?: string; nomorSeri?: string; deskripsi?: string; tarif?: number; tarifBPJS?: number }) {
    const prisma = await getPrisma();
    return prisma.peralatanMedis.create({ data });
  },

  async updatePeralatan(id: string, data: Partial<{ nama: string; merk: string; deskripsi: string; tarif: number; tarifBPJS: number; status: StatusPeralatan; lokasiTerakhir: string; tanggalKalibrasi: Date }>) {
    const prisma = await getPrisma();
    return prisma.peralatanMedis.update({ where: { id }, data });
  },

  async catatPenggunaan(data: { peralatanId: string; poliId: string; kunjunganId?: string; dipakaiOleh?: string }) {
    const prisma = await getPrisma();
    return prisma.$transaction([
      prisma.peralatanMedis.update({
        where: { id: data.peralatanId },
        data: { status: "DIGUNAKAN", poliTerakhirId: data.poliId },
      }),
      prisma.penggunaanAlat.create({ data }),
    ]);
  },

  async selesaiPenggunaan(penggunaanId: string) {
    const prisma = await getPrisma();
    const p = await prisma.penggunaanAlat.update({
      where: { id: penggunaanId },
      data: { waktuSelesai: new Date() },
    });
    await prisma.peralatanMedis.update({
      where: { id: p.peralatanId },
      data: { status: "TERSEDIA" },
    });
    return p;
  },

  async getRiwayatPeralatan(peralatanId: string) {
    const prisma = await getPrisma();
    return prisma.penggunaanAlat.findMany({
      where: { peralatanId },
      include: { poli: { select: { nama: true, kode: true } } },
      orderBy: { waktuMulai: "desc" },
    });
  },

  // ── Search Engine (Unified) ────────────────────────────────
  async searchOrderable(params: { q?: string; poliId: string; limit?: number }) {
    const prisma = await getPrisma();
    const { q = "", poliId, limit = 30 } = params;

    const [tindakan, penunjang] = await Promise.all([
      prisma.masterTindakan.findMany({
        where: {
          kategori: "TINDAKAN",
          isActive: true,
          nama: { contains: q, mode: "insensitive" },
          poliMapping: { some: { poliId } },
        },
        select: { id: true, kode: true, nama: true, tarif: true, tarifBPJS: true, kategori: true },
        take: limit,
      }),
      prisma.itemPenunjang.findMany({
        where: {
          kategori: { in: ["LAB", "RADIOLOGI"] },
          isActive: true,
          nama: { contains: q, mode: "insensitive" },
        },
        select: { id: true, kode: true, nama: true, tarif: true, tarifBPJS: true, kategori: true, satuanWaktu: true },
        take: limit,
      }),
    ]);

    return [
      ...tindakan.map(t => ({ ...t, sumber: "TINDAKAN" as const })),
      ...penunjang.map(p => ({ ...p, satuanWaktu: (p as { satuanWaktu?: string | null }).satuanWaktu ?? null, sumber: "PENUNJANG" as const })),
    ].sort((a, b) => a.nama.localeCompare(b.nama));
  },
};
