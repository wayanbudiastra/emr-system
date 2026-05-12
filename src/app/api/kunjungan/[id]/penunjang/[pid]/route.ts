import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getPrisma } from '@/lib/prisma';

const CAN_CANCEL = ['SUPER_ADMIN', 'DOKTER', 'PERAWAT'];

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; pid: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user)                              return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!CAN_CANCEL.includes(session.user.role))     return NextResponse.json({ error: 'Forbidden' },   { status: 403 });

    const { pid } = await params;
    const prisma   = await getPrisma();

    const order = await prisma.permintaanPenunjang.findUnique({
      where:  { id: pid },
      select: { id: true, status: true },
    });

    if (!order) return NextResponse.json({ error: 'Order tidak ditemukan' }, { status: 404 });
    if (!['DIPESAN'].includes(order.status)) {
      return NextResponse.json(
        { error: 'Tidak bisa dibatalkan — order sudah diproses oleh unit terkait' },
        { status: 422 }
      );
    }

    const result = await prisma.permintaanPenunjang.update({
      where: { id: pid },
      data:  { status: 'DIBATALKAN' },
    });

    return NextResponse.json(result);
  } catch (err: unknown) {
    console.error('[DELETE /api/kunjungan/[id]/penunjang/[pid]]', err);
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Server error' }, { status: 500 });
  }
}
