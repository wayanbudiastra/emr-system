import { getPrisma } from "@/lib/prisma";
import { generateNomorAntrean } from "@/utils/medical";
import type { PaginationParams, PaginatedResult } from "@/types";
import type { Kunjungan, StatusKunjungan } from "@prisma/client";

export interface CreateKunjunganInput {
  pasienId:       string;
  dokterId?:      string;
  poliId?:        string;
  keluhan?:       string;
  tipePembayaran?: string;
}

export async function getKunjunganList(
  params: PaginationParams & { status?: StatusKunjungan; tanggal?: Date } = {}
): Promise<PaginatedResult<Kunjungan>> {
  const prisma = await getPrisma();
  const page  = Math.max(1, params.page  ?? 1);
  const limit = Math.min(100, params.limit ?? 20);
  const skip  = (page - 1) * limit;

  const tanggalStart = params.tanggal
    ? new Date(new Date(params.tanggal).setHours(0, 0, 0, 0))
    : new Date(new Date().setHours(0, 0, 0, 0));
  const tanggalEnd = new Date(tanggalStart);
  tanggalEnd.setDate(tanggalEnd.getDate() + 1);

  const where = {
    tanggal: { gte: tanggalStart, lt: tanggalEnd },
    ...(params.status ? { status: params.status } : {}),
  };

  const [data, total] = await Promise.all([
    prisma.kunjungan.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: "asc" },
      include: { pasien: true, dokter: { include: { user: true } }, poli: true },
    }),
    prisma.kunjungan.count({ where }),
  ]);

  return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
}

export async function createKunjungan(input: CreateKunjunganInput): Promise<Kunjungan> {
  const prisma = await getPrisma();

  // Hitung antrean hari ini untuk poli yang dipilih
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayEnd = new Date(today);
  todayEnd.setDate(todayEnd.getDate() + 1);

  const countToday = await prisma.kunjungan.count({
    where: {
      poliId:  input.poliId,
      tanggal: { gte: today, lt: todayEnd },
    },
  });

  const prefix       = input.poliId ? "A" : "U";
  const nomorAntrean = generateNomorAntrean(prefix, countToday + 1);

  return prisma.kunjungan.create({
    data: { ...input, nomorAntrean },
  });
}

export async function updateKunjunganStatus(
  id: string,
  status: StatusKunjungan
): Promise<Kunjungan> {
  const prisma = await getPrisma();
  return prisma.kunjungan.update({ where: { id }, data: { status } });
}
