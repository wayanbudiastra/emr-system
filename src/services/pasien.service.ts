import { pasienRepository } from '@/repositories/pasien.repository';
import type { CreatePasienDTO, UpdatePasienDTO } from '@/features/pasien/schemas/pasien.schema';

export const pasienService = {

  async getAll(params?: Parameters<typeof pasienRepository.findAll>[0]) {
    return pasienRepository.findAll(params);
  },

  async getById(id: string) {
    const pasien = await pasienRepository.findById(id);
    if (!pasien) throw new Error('Pasien tidak ditemukan');
    return pasien;
  },

  async searchByRM(nomorRM: string) {
    const pasien = await pasienRepository.findByNomorRM(nomorRM);
    if (!pasien) throw new Error(`Nomor RM ${nomorRM} tidak ditemukan`);
    return pasien;
  },

  async search(q: string) {
    return pasienRepository.search(q);
  },

  async create(dto: CreatePasienDTO, createdByUserId: string) {
    if (dto.tipePasien === 'WNI' && dto.nik) {
      const dup = await pasienRepository.findByNIK(dto.nik);
      if (dup) throw new Error(`NIK sudah terdaftar atas nama ${dup.nama} (${dup.nomorRM})`);
    }

    if (dto.tipePasien === 'WNA' && dto.noPaspor) {
      const dup = await pasienRepository.findByNoPaspor(dto.noPaspor);
      if (dup) throw new Error(`No. Paspor sudah terdaftar atas nama ${dup.nama} (${dup.nomorRM})`);
    }

    const pasien = await pasienRepository.create(dto);

    await pasienRepository.logActivity({
      userId:     createdByUserId,
      action:     'CREATE_PASIEN',
      resourceId: pasien.id,
      detail:     { nomorRM: pasien.nomorRM, nama: pasien.nama },
    });

    return pasien;
  },

  async update(id: string, dto: UpdatePasienDTO, updatedByUserId: string) {
    const existing = await pasienRepository.findById(id);
    if (!existing) throw new Error('Pasien tidak ditemukan');

    if (dto.nik && dto.nik !== existing.nik) {
      const dup = await pasienRepository.findByNIK(dto.nik, id);
      if (dup) throw new Error(`NIK sudah digunakan pasien lain (${dup.nomorRM})`);
    }

    const updated = await pasienRepository.update(id, dto);

    await pasienRepository.logActivity({
      userId:     updatedByUserId,
      action:     'UPDATE_PASIEN',
      resourceId: id,
      detail:     { fields: Object.keys(dto) },
    });

    return updated;
  },

  async toggleActive(id: string, isActive: boolean, byUserId: string) {
    const existing = await pasienRepository.findById(id);
    if (!existing) throw new Error('Pasien tidak ditemukan');

    const result = await pasienRepository.toggleActive(id, isActive);

    await pasienRepository.logActivity({
      userId:     byUserId,
      action:     isActive ? 'ACTIVATE_PASIEN' : 'DEACTIVATE_PASIEN',
      resourceId: id,
    });

    return result;
  },
};
