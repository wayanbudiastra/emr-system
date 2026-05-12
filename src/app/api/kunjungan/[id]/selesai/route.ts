import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getPrisma } from '@/lib/prisma';

const CAN_FINISH = ['SUPER_ADMIN', 'PERAWAT', 'DOKTER'];

export async function PATCH(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!CAN_FINISH.includes(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;
    const prisma  = await getPrisma();

    const kunjungan = await prisma.kunjungan.findUnique({
      where:  { id },
      select: { id: true, status: true },
    });

    if (!kunjungan) {
      return NextResponse.json({ error: 'Kunjungan tidak ditemukan' }, { status: 404 });
    }
    if (!['MENUNGGU', 'DALAM_PEMERIKSAAN'].includes(kunjungan.status)) {
      return NextResponse.json(
        { error: `Tidak bisa selesaikan — status saat ini: ${kunjungan.status}` },
        { status: 422 }
      );
    }

    const result = await prisma.kunjungan.update({
      where: { id },
      data:  { status: 'SELESAI', selesaiAt: new Date() },
      select: { id: true, status: true, selesaiAt: true },
    });

    return NextResponse.json(result);
  } catch (err: unknown) {
    console.error('[PATCH /api/kunjungan/[id]/selesai]', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Terjadi kesalahan server' },
      { status: 500 }
    );
  }
}
