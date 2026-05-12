import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getPrisma } from '@/lib/prisma';

const CAN_DELETE = ['SUPER_ADMIN', 'DOKTER', 'PERAWAT'];

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; tid: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user)                               return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!CAN_DELETE.includes(session.user.role))      return NextResponse.json({ error: 'Forbidden' },   { status: 403 });

    const { id: kunjunganId, tid } = await params;
    const prisma = await getPrisma();

    const tindakan = await prisma.tindakan.findUnique({
      where:   { id: tid },
      include: { kunjungan: { select: { billing: { select: { status: true } } } } },
    });

    if (!tindakan) return NextResponse.json({ error: 'Tindakan tidak ditemukan' }, { status: 404 });
    if (tindakan.kunjunganId !== kunjunganId) {
      return NextResponse.json({ error: 'Tindakan tidak sesuai kunjungan' }, { status: 400 });
    }
    const billingStatus = tindakan.kunjungan.billing?.status;
    if (billingStatus && ['LUNAS', 'SEBAGIAN'].includes(billingStatus)) {
      return NextResponse.json({ error: 'Tidak bisa hapus — billing sudah dibayar' }, { status: 422 });
    }

    await prisma.tindakan.delete({ where: { id: tid } });
    return NextResponse.json({ message: 'Tindakan berhasil dihapus' });
  } catch (err: unknown) {
    console.error('[DELETE /kunjungan/[id]/tindakan/[tid]]', err);
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Server error' }, { status: 500 });
  }
}
