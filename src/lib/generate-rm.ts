import { getPrisma } from '@/lib/prisma';

export async function generateNomorRM(): Promise<string> {
  const prisma = await getPrisma();
  return prisma.$transaction(async (tx) => {
    const last = await tx.pasien.findFirst({
      orderBy: { nomorRM: 'desc' },
      select: { nomorRM: true },
    });
    let nextNum = 1;
    if (last?.nomorRM) {
      const match = last.nomorRM.match(/^RM-(\d{6})$/);
      if (match) nextNum = parseInt(match[1], 10) + 1;
    }
    if (nextNum > 999_999) throw new Error('Nomor RM mencapai batas RM-999999.');
    const nomorRM = `RM-${String(nextNum).padStart(6, '0')}`;
    const exists = await tx.pasien.findUnique({ where: { nomorRM } });
    if (exists) return `RM-${String(nextNum + 1).padStart(6, '0')}`;
    return nomorRM;
  });
}
