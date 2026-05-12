import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getPrisma } from '@/lib/prisma';
import { z } from 'zod';

const CAN_WRITE = ['SUPER_ADMIN', 'DOKTER', 'APOTEKER'];

const updateRacikanSchema = z.object({
  namaRacikan:   z.string().min(1).max(100).optional(),
  metode:        z.enum(['PUYER', 'KAPSUL', 'SALEP']).optional(),
  jumlahSediaan: z.number().int().min(1).optional(),
  aturanPakai:   z.string().max(200).optional().nullable(),
});

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; rid: string; hid: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user)                          return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!CAN_WRITE.includes(session.user.role))  return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { id: kunjunganId, rid: resepId, hid } = await params;
    const body   = await req.json();
    const parsed = updateRacikanSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: 'Validasi gagal', details: parsed.error.flatten() }, { status: 400 });

    const prisma = await getPrisma();

    const racikan = await prisma.racikanHeader.findUnique({
      where:   { id: hid },
      include: { resep: { select: { kunjunganId: true, status: true } } },
    });
    if (!racikan || racikan.resep.kunjunganId !== kunjunganId || racikan.resepId !== resepId) {
      return NextResponse.json({ error: 'Racikan tidak ditemukan' }, { status: 404 });
    }
    if (['SIAP', 'DIAMBIL'].includes(racikan.resep.status)) {
      return NextResponse.json({ error: 'Resep sudah dikonfirmasi — tidak bisa diubah' }, { status: 422 });
    }

    const updated = await prisma.racikanHeader.update({
      where: { id: hid },
      data:  {
        ...(parsed.data.namaRacikan   !== undefined ? { namaRacikan:   parsed.data.namaRacikan   } : {}),
        ...(parsed.data.metode        !== undefined ? { metode:        parsed.data.metode        } : {}),
        ...(parsed.data.jumlahSediaan !== undefined ? { jumlahSediaan: parsed.data.jumlahSediaan } : {}),
        ...(parsed.data.aturanPakai   !== undefined ? { aturanPakai:   parsed.data.aturanPakai   } : {}),
      },
      include: { bahan: { include: { obat: { select: { id: true, nama: true, satuan: true } } } } },
    });

    return NextResponse.json(updated);
  } catch (err: unknown) {
    console.error('[PUT /kunjungan/[id]/resep/[rid]/racikan/[hid]]', err);
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Server error' }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; rid: string; hid: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user)                          return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!CAN_WRITE.includes(session.user.role))  return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { id: kunjunganId, rid: resepId, hid } = await params;
    const prisma = await getPrisma();

    const racikan = await prisma.racikanHeader.findUnique({
      where:   { id: hid },
      include: { resep: { select: { kunjunganId: true, status: true } } },
    });
    if (!racikan || racikan.resep.kunjunganId !== kunjunganId || racikan.resepId !== resepId) {
      return NextResponse.json({ error: 'Racikan tidak ditemukan' }, { status: 404 });
    }
    if (['SIAP', 'DIAMBIL'].includes(racikan.resep.status)) {
      return NextResponse.json({ error: 'Resep sudah dikonfirmasi — tidak bisa diubah' }, { status: 422 });
    }

    await prisma.racikanHeader.delete({ where: { id: hid } });
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    console.error('[DELETE /kunjungan/[id]/resep/[rid]/racikan/[hid]]', err);
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Server error' }, { status: 500 });
  }
}
