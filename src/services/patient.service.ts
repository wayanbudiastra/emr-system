import { getPrisma } from "@/lib/prisma";
import { generateNomorRM } from "@/utils/medical";
import type { PaginationParams, PaginatedResult } from "@/types";
import type { JenisKelamin, Pasien } from "@prisma/client";

export interface CreatePasienInput {
  nama:         string;
  tanggalLahir: Date;
  jenisKelamin: JenisKelamin;
  nik?:         string;
  alamat?:      string;
  telepon?:     string;
  email?:       string;
  golonganDarah?: string;
  noBPJS?:      string;
}

export async function getPasienList(
  params: PaginationParams = {}
): Promise<PaginatedResult<Pasien>> {
  const prisma = await getPrisma();
  const page  = Math.max(1, params.page  ?? 1);
  const limit = Math.min(100, params.limit ?? 20);
  const skip  = (page - 1) * limit;

  const where = params.search
    ? {
        OR: [
          { nama:     { contains: params.search, mode: "insensitive" as const } },
          { nomorRM:  { contains: params.search, mode: "insensitive" as const } },
          { nik:      { contains: params.search, mode: "insensitive" as const } },
          { telepon:  { contains: params.search, mode: "insensitive" as const } },
        ],
      }
    : {};

  const [data, total] = await Promise.all([
    prisma.pasien.findMany({ where, skip, take: limit, orderBy: { createdAt: "desc" } }),
    prisma.pasien.count({ where }),
  ]);

  return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
}

export async function getPasienById(id: string): Promise<Pasien | null> {
  const prisma = await getPrisma();
  return prisma.pasien.findUnique({ where: { id } });
}

export async function createPasien(input: CreatePasienInput): Promise<Pasien> {
  const prisma = await getPrisma();
  const nomorRM = generateNomorRM();
  return prisma.pasien.create({ data: { ...input, nomorRM } });
}

export async function updatePasien(
  id: string,
  input: Partial<CreatePasienInput>
): Promise<Pasien> {
  const prisma = await getPrisma();
  return prisma.pasien.update({ where: { id }, data: input });
}
