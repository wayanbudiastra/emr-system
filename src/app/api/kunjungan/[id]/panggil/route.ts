import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getPrisma } from '@/lib/prisma';

const CAN_CALL = ['SUPER_ADMIN', 'PERAWAT', 'DOKTER', 'ADMISSION'];

export async function PATCH(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!CAN_CALL.includes(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;
    const prisma  = await getPrisma();

    const kunjungan = await prisma.kunjungan.findUnique({
      where:  { id },
      select: { id: true, status: true, pasienId: true },
    });

    if (!kunjungan) {
      return NextResponse.json({ error: 'Kunjungan tidak ditemukan' }, { status: 404 });
    }
    if (kunjungan.status !== 'MENUNGGU') {
      return NextResponse.json(
        { error: `Pasien sudah dipanggil (status: ${kunjungan.status})` },
        { status: 422 }
      );
    }

    const result = await prisma.kunjungan.update({
      where: { id },
      data:  { status: 'DALAM_PEMERIKSAAN', panggilAt: new Date() },
      select: {
        id:           true,
        nomorAntrean: true,
        status:       true,
        panggilAt:    true,
        pasien: { select: { id: true, nama: true, nomorRM: true } },
      },
    });

    return NextResponse.json(result);
  } catch (err: unknown) {
    console.error('[PATCH /api/kunjungan/[id]/panggil]', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Terjadi kesalahan server' },
      { status: 500 }
    );
  }
}
