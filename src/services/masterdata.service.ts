import { masterdataRepository } from "@/repositories/masterdata.repository";
import { getPrisma } from "@/lib/prisma";
import type { CreateTindakanInput, CreatePenunjangInput, CreatePeralatanInput, CreatePoliInput } from "@/features/masterdata/schemas/masterdata.schema";
import type { KategoriItem } from "@prisma/client";

export const masterdataService = {

  // ── Poli ──────────────────────────────────────────────────
  async getAllPoli(includeInactive = false) {
    return masterdataRepository.getAllPoli(includeInactive);
  },

  async createPoli(dto: CreatePoliInput) {
    const prisma = await getPrisma();
    const existing = await prisma.poli.findUnique({ where: { kode: dto.kode } });
    if (existing) throw new Error("Kode poli sudah digunakan");
    return masterdataRepository.createPoli(dto);
  },

  async updatePoli(id: string, dto: Partial<CreatePoliInput & { isActive: boolean }>) {
    return masterdataRepository.updatePoli(id, dto);
  },

  // ── Tindakan ──────────────────────────────────────────────
  async getAllTindakan(params?: { search?: string; poliId?: string; page?: number; limit?: number }) {
    return masterdataRepository.getAllTindakan(params);
  },

  async createTindakan(dto: CreateTindakanInput) {
    const prisma = await getPrisma();
    const existing = await prisma.masterTindakan.findUnique({ where: { kode: dto.kode } });
    if (existing) throw new Error("Kode tindakan sudah digunakan");
    const tindakan = await masterdataRepository.createTindakan(dto);
    await masterdataRepository.mapTindakanToPoli(tindakan.id, dto.poliIds);
    return tindakan;
  },

  async updateTindakan(id: string, dto: { nama?: string; tarif?: number; tarifBPJS?: number; deskripsi?: string; isActive?: boolean }) {
    return masterdataRepository.updateTindakan(id, dto);
  },

  async updateMapping(tindakanId: string, poliIds: string[]) {
    if (poliIds.length === 0) throw new Error("Minimal satu Poli wajib dipilih");
    return masterdataRepository.replaceMappingTindakan(tindakanId, poliIds);
  },

  async deleteTindakan(id: string) {
    return masterdataRepository.deleteTindakan(id);
  },

  async getMappingByTindakan(tindakanId: string) {
    return masterdataRepository.getMappingByTindakan(tindakanId);
  },

  // ── Item Penunjang ────────────────────────────────────────
  async getAllPenunjang(params?: { kategori?: "LAB" | "RADIOLOGI"; search?: string; page?: number; limit?: number }) {
    return masterdataRepository.getAllPenunjang(params);
  },

  async createPenunjang(dto: CreatePenunjangInput) {
    const prisma = await getPrisma();
    const existing = await prisma.itemPenunjang.findUnique({ where: { kode: dto.kode } });
    if (existing) throw new Error("Kode penunjang sudah digunakan");
    return masterdataRepository.createPenunjang({ ...dto, kategori: dto.kategori as KategoriItem });
  },

  async updatePenunjang(id: string, dto: { nama?: string; tarif?: number; tarifBPJS?: number; deskripsi?: string; satuanWaktu?: string; isActive?: boolean }) {
    return masterdataRepository.updatePenunjang(id, dto);
  },

  // ── Peralatan Medis ───────────────────────────────────────
  async getAllPeralatan(params?: { status?: string; search?: string; page?: number; limit?: number }) {
    return masterdataRepository.getAllPeralatan(params as Parameters<typeof masterdataRepository.getAllPeralatan>[0]);
  },

  async createPeralatan(dto: CreatePeralatanInput) {
    const prisma = await getPrisma();
    const existing = await prisma.peralatanMedis.findUnique({ where: { kode: dto.kode } });
    if (existing) throw new Error("Kode peralatan sudah digunakan");
    return masterdataRepository.createPeralatan(dto);
  },

  async updatePeralatan(id: string, dto: { nama?: string; merk?: string; deskripsi?: string; status?: string; lokasiTerakhir?: string; tanggalKalibrasi?: string }) {
    const data: Parameters<typeof masterdataRepository.updatePeralatan>[1] = {
      ...dto,
      tanggalKalibrasi: dto.tanggalKalibrasi ? new Date(dto.tanggalKalibrasi) : undefined,
      status: dto.status as Parameters<typeof masterdataRepository.updatePeralatan>[1]["status"],
    };
    return masterdataRepository.updatePeralatan(id, data);
  },

  async pakaiAlat(data: { peralatanId: string; poliId: string; kunjunganId?: string; dipakaiOleh?: string }) {
    const prisma = await getPrisma();
    const alat = await prisma.peralatanMedis.findUnique({ where: { id: data.peralatanId } });
    if (!alat) throw new Error("Peralatan tidak ditemukan");
    if (alat.status === "DIGUNAKAN") throw new Error("Alat sedang digunakan di poli lain");
    if (alat.status === "MAINTENANCE" || alat.status === "RUSAK") throw new Error(`Alat tidak dapat digunakan: status ${alat.status}`);
    return masterdataRepository.catatPenggunaan(data);
  },

  async selesaiPakaiAlat(penggunaanId: string) {
    return masterdataRepository.selesaiPenggunaan(penggunaanId);
  },

  async getRiwayatPeralatan(peralatanId: string) {
    return masterdataRepository.getRiwayatPeralatan(peralatanId);
  },

  // ── Search Engine ─────────────────────────────────────────
  async searchOrderable(q: string, poliId: string) {
    if (!poliId) throw new Error("poliId wajib ada");
    return masterdataRepository.searchOrderable({ q, poliId, limit: 40 });
  },
};
