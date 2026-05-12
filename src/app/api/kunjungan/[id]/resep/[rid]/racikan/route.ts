import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getPrisma } from '@/lib/prisma';
import { z } from 'zod';

const CAN_WRITE = ['SUPER_ADMIN', 'DOKTER', 'APOTEKER'];

const bahanSchema = z.object({
  obatId: z.string().min(1),
  jumlah: z.number().positive(),
  satuan: z.string().max(50).optional().nullable(),
});

const createRacikanSchema = z.object({
  namaRacikan:   z.string().min(1).max(100),
  metode:        z.enum(['PUYER', 'KAPSUL', 'SALEP']),
  jumlahSediaan: z.number().int().min(1),
  aturanPakai:   z.string().max(200).optional().nullable(),
  bahan:         z.array(bahanSchema).min(1, 'Minimal 1 bahan'),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; rid: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user)                          return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!CAN_WRITE.includes(session.user.role))  return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { id: kunjunganId, rid: resepId } = await params;
    const body   = await req.json();
    const parsed = createRacikanSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: 'Validasi gagal', details: parsed.error.flatten() }, { status: 400 });

    const prisma = await getPrisma();

    const resep = await prisma.resep.findUnique({
      where:  { id: resepId },
      select: { id: true, kunjunganId: true, status: true },
    });
    if (!resep || resep.kunjunganId !== kunjunganId) return NextResponse.json({ error: 'Resep tidak ditemukan' }, { status: 404 });
    if (['SIAP', 'DIAMBIL'].includes(resep.status))  return NextResponse.json({ error: 'Resep sudah dikonfirmasi — tidak bisa diubah' }, { status: 422 });

    // Validate all bahan are active
    const obatIds = parsed.data.bahan.map(b => b.obatId);
    const obatList = await prisma.obat.findMany({
      where:  { id: { in: obatIds } },
      select: { id: true, nama: true, isActive: true, stok: true },
    });

    for (const b of parsed.data.bahan) {
      const obat = obatList.find(o => o.id === b.obatId);
      if (!obat)          return NextResponse.json({ error: `Obat tidak ditemukan: ${b.obatId}` }, { status: 404 });
      if (!obat.isActive) return NextResponse.json({ error: `Obat tidak aktif: ${obat.nama}` }, { status: 422 });
    }

    const racikan = await prisma.racikanHeader.create({
      data: {
        resepId,
        namaRacikan:   parsed.data.namaRacikan,
        metode:        parsed.data.metode,
        jumlahSediaan: parsed.data.jumlahSediaan,
        aturanPakai:   parsed.data.aturanPakai ?? null,
        bahan: {
          create: parsed.data.bahan.map(b => ({
            obatId: b.obatId,
            jumlah: b.jumlah,
            satuan: b.satuan ?? null,
          })),
        },
      },
      include: {
        bahan: {
          include: { obat: { select: { id: true, nama: true, satuan: true, stok: true } } },
        },
      },
    });

    return NextResponse.json(racikan, { status: 201 });
  } catch (err: unknown) {
    console.error('[POST /kunjungan/[id]/resep/[rid]/racikan]', err);
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Server error' }, { status: 500 });
  }
}
