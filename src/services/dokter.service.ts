import { dokterRepository } from '@/repositories/dokter.repository';
import type { DokterProfileValues, JadwalPraktekValues } from '@/features/dokter/schemas/dokter.schema';
export { getSIPStatus } from '@/features/dokter/utils/sip-status';

export const dokterService = {

  async getAll(params?: Parameters<typeof dokterRepository.findAll>[0]) {
    const result = await dokterRepository.findAll(params);
    return {
      ...result,
      data: result.data.map(d => ({ ...d, sipStatus: getSIPStatus(d.tglExpiredSIP) })),
    };
  },

  async getById(id: string) {
    const dokter = await dokterRepository.findById(id);
    if (!dokter) throw new Error('Data dokter tidak ditemukan');
    return { ...dokter, sipStatus: getSIPStatus(dokter.tglExpiredSIP) };
  },

  async getByUserId(userId: string) {
    const dokter = await dokterRepository.findByUserId(userId);
    if (!dokter) throw new Error('Profil dokter tidak ditemukan');
    return { ...dokter, sipStatus: getSIPStatus(dokter.tglExpiredSIP) };
  },

  async getUsersWithoutProfile() {
    return dokterRepository.findUsersWithoutProfile();
  },

  async saveProfile(userId: string, data: DokterProfileValues) {
    if (data.nik) {
      const all = await dokterRepository.findAll({});
      const nikDup = all.data.find(d => d.nik === data.nik && d.userId !== userId);
      if (nikDup) throw new Error(`NIK sudah digunakan dokter lain: ${nikDup.user.nama}`);
    }

    if (data.noSIP) {
      const all = await dokterRepository.findAll({});
      const sipDup = all.data.find(d => d.noSIP === data.noSIP && d.userId !== userId);
      if (sipDup) throw new Error(`Nomor SIP sudah digunakan dokter lain: ${sipDup.user.nama}`);
    }

    return dokterRepository.upsertProfile(userId, data);
  },

  async addPoliMapping(dokterProfileId: string, poliId: string) {
    return dokterRepository.addPoliMapping(dokterProfileId, poliId);
  },

  async removePoliMapping(dokterProfileId: string, poliId: string) {
    const mapping = await dokterRepository.getMappingByDokter(dokterProfileId);
    const target  = mapping.find(m => m.poliId === poliId);

    if (target) {
      const aktif = target.jadwalPraktek.filter(j => j.isAktif);
      if (aktif.length > 0) {
        throw new Error(
          `Tidak bisa hapus mapping — masih ada ${aktif.length} jadwal aktif di poli ini. ` +
          `Nonaktifkan jadwal terlebih dahulu.`
        );
      }
    }

    return dokterRepository.removePoliMapping(dokterProfileId, poliId);
  },

  async saveSharingFee(dokterProfileId: string, fees: Array<{ kategori: string; persentase: number }>) {
    for (const f of fees) {
      if (f.persentase < 0 || f.persentase > 100) {
        throw new Error(`Persentase kategori ${f.kategori} harus antara 0 dan 100`);
      }
    }
    return dokterRepository.upsertSharingFee(dokterProfileId, fees);
  },

  async createJadwal(data: JadwalPraktekValues) {
    const overlap = await dokterRepository.checkJadwalOverlap({
      dokterPoliId: data.dokterPoliId,
      hari:         data.hari,
      jamMulai:     data.jamMulai,
      jamSelesai:   data.jamSelesai,
    });

    if (overlap) {
      throw new Error(
        `Jadwal pada hari ${data.hari} pukul ${data.jamMulai}–${data.jamSelesai} ` +
        `tumpang tindih dengan jadwal yang sudah ada.`
      );
    }

    return dokterRepository.createJadwal(data);
  },

  async updateJadwal(id: string, data: Partial<JadwalPraktekValues>) {
    if (data.jamMulai || data.jamSelesai || data.hari || data.dokterPoliId) {
      const existing = await dokterRepository.getJadwalByDokterPoli(data.dokterPoliId ?? '');
      const current  = existing.find(j => j.id === id);
      if (current) {
        const overlap = await dokterRepository.checkJadwalOverlap({
          dokterPoliId: current.dokterPoliId,
          hari:         (data.hari ?? current.hari) as string,
          jamMulai:     data.jamMulai   ?? current.jamMulai,
          jamSelesai:   data.jamSelesai ?? current.jamSelesai,
          excludeId:    id,
        });
        if (overlap) throw new Error('Jadwal bertabrakan dengan jadwal lain di hari yang sama.');
      }
    }
    return dokterRepository.updateJadwal(id, data);
  },

  async toggleJadwal(id: string, isAktif: boolean) {
    return dokterRepository.toggleJadwal(id, isAktif);
  },

  async deleteJadwal(id: string) {
    return dokterRepository.deleteJadwal(id);
  },

  async hitungSharingFee(params: {
    dokterProfileId: string;
    items: Array<{ kategori: string; totalTarif: number }>;
  }) {
    const fees   = await dokterRepository.getSharingFee(params.dokterProfileId);
    const feeMap = Object.fromEntries(fees.map(f => [f.kategori, f.persentase]));

    return params.items.map(item => ({
      kategori:   item.kategori,
      totalTarif: item.totalTarif,
      persentase: feeMap[item.kategori] ?? 0,
      nominalFee: item.totalTarif * ((feeMap[item.kategori] ?? 0) / 100),
    }));
  },
};
