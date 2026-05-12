import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getPrisma } from '@/lib/prisma';
import { z } from 'zod';

const CAN_WRITE = ['SUPER_ADMIN', 'DOKTER', 'APOTEKER'];

const updateItemSchema = z.object({
  jumlah:     z.number().int().min(1).optional(),
  aturanPakai: z.string().max(200).optional().nullable(),
  catatan:    z.string().max(300).optional().nullable(),
});

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; rid: string; iid: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user)                          return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!CAN_WRITE.includes(session.user.role))  return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { id: kunjunganId, rid: resepId, iid } = await params;
    const body   = await req.json();
    const parsed = updateItemSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: 'Validasi gagal', details: parsed.error.flatten() }, { status: 400 });

    const prisma = await getPrisma();

    const item = await prisma.itemResep.findUnique({
      where:  { id: iid },
      include: { resep: { select: { kunjunganId: true, status: true } }, obat: { select: { stok: true, nama: true } } },
    });
    if (!item || item.resep.kunjunganId !== kunjunganId || item.resepId !== resepId) {
      return NextResponse.json({ error: 'Item tidak ditemukan' }, { status: 404 });
    }
    if (['SIAP', 'DIAMBIL'].includes(item.resep.status)) {
      return NextResponse.json({ error: 'Resep sudah dikonfirmasi — tidak bisa diubah' }, { status: 422 });
    }
    if (parsed.data.jumlah !== undefined && parsed.data.jumlah > item.obat.stok) {
      return NextResponse.json({ error: `Stok ${item.obat.nama} tidak cukup (tersedia: ${item.obat.stok})` }, { status: 422 });
    }

    const updated = await prisma.itemResep.update({
      where: { id: iid },
      data:  {
        ...(parsed.data.jumlah     !== undefined ? { jumlah:      parsed.data.jumlah     } : {}),
        ...(parsed.data.aturanPakai !== undefined ? { aturanPakai: parsed.data.aturanPakai } : {}),
        ...(parsed.data.catatan    !== undefined ? { catatan:     parsed.data.catatan    } : {}),
      },
      include: { obat: { select: { id: true, nama: true, satuan: true, stok: true, harga: true } } },
    });

    return NextResponse.json(updated);
  } catch (err: unknown) {
    console.error('[PUT /kunjungan/[id]/resep/[rid]/item/[iid]]', err);
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Server error' }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; rid: string; iid: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user)                          return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!CAN_WRITE.includes(session.user.role))  return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { id: kunjunganId, rid: resepId, iid } = await params;
    const prisma = await getPrisma();

    const item = await prisma.itemResep.findUnique({
      where:   { id: iid },
      include: { resep: { select: { kunjunganId: true, status: true } } },
    });
    if (!item || item.resep.kunjunganId !== kunjunganId || item.resepId !== resepId) {
      return NextResponse.json({ error: 'Item tidak ditemukan' }, { status: 404 });
    }
    if (['SIAP', 'DIAMBIL'].includes(item.resep.status)) {
      return NextResponse.json({ error: 'Resep sudah dikonfirmasi — tidak bisa diubah' }, { status: 422 });
    }

    await prisma.itemResep.delete({ where: { id: iid } });
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    console.error('[DELETE /kunjungan/[id]/resep/[rid]/item/[iid]]', err);
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Server error' }, { status: 500 });
  }
}
