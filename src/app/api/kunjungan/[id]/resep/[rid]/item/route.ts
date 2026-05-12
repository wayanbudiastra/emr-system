import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getPrisma } from '@/lib/prisma';
import { z } from 'zod';

const CAN_WRITE = ['SUPER_ADMIN', 'DOKTER', 'APOTEKER'];

const addItemSchema = z.object({
  obatId:     z.string().min(1),
  jumlah:     z.number().int().min(1),
  aturanPakai: z.string().max(200).optional().nullable(),
  catatan:    z.string().max(300).optional().nullable(),
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
    const parsed = addItemSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: 'Validasi gagal', details: parsed.error.flatten() }, { status: 400 });

    const prisma = await getPrisma();

    const resep = await prisma.resep.findUnique({
      where:  { id: resepId },
      select: { id: true, kunjunganId: true, status: true },
    });
    if (!resep || resep.kunjunganId !== kunjunganId) return NextResponse.json({ error: 'Resep tidak ditemukan' }, { status: 404 });
    if (['SIAP', 'DIAMBIL'].includes(resep.status))  return NextResponse.json({ error: 'Resep sudah dikonfirmasi — tidak bisa diubah' }, { status: 422 });

    const obat = await prisma.obat.findUnique({
      where:  { id: parsed.data.obatId },
      select: { id: true, nama: true, stok: true, isActive: true },
    });
    if (!obat)           return NextResponse.json({ error: 'Obat tidak ditemukan' }, { status: 404 });
    if (!obat.isActive)  return NextResponse.json({ error: 'Obat tidak aktif' }, { status: 422 });
    if (obat.stok < parsed.data.jumlah) {
      return NextResponse.json({ error: `Stok ${obat.nama} tidak cukup (tersedia: ${obat.stok})` }, { status: 422 });
    }

    const item = await prisma.itemResep.create({
      data: {
        resepId,
        obatId:      parsed.data.obatId,
        jumlah:      parsed.data.jumlah,
        aturanPakai: parsed.data.aturanPakai ?? null,
        catatan:     parsed.data.catatan ?? null,
      },
      include: {
        obat: { select: { id: true, nama: true, satuan: true, stok: true, harga: true, hargaBPJS: true } },
      },
    });

    return NextResponse.json(item, { status: 201 });
  } catch (err: unknown) {
    console.error('[POST /kunjungan/[id]/resep/[rid]/item]', err);
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Server error' }, { status: 500 });
  }
}
