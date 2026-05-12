import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getPrisma } from '@/lib/prisma';

const CAN_DELETE = ['SUPER_ADMIN', 'DOKTER', 'PERAWAT'];

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; eid: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user)                               return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!CAN_DELETE.includes(session.user.role))      return NextResponse.json({ error: 'Forbidden' },   { status: 403 });

    const { id: kunjunganId, eid } = await params;
    const prisma = await getPrisma();

    const penggunaan = await prisma.penggunaanAlat.findUnique({
      where:   { id: eid },
      include: {
        peralatan: { select: { nama: true } },
      },
    });

    if (!penggunaan) return NextResponse.json({ error: 'Data tidak ditemukan' }, { status: 404 });
    if (penggunaan.kunjunganId !== kunjunganId) {
      return NextResponse.json({ error: 'Data tidak sesuai kunjungan' }, { status: 400 });
    }

    // Cek billing kunjungan
    const kunjungan = await prisma.kunjungan.findUnique({
      where:  { id: kunjunganId },
      select: { billing: { select: { status: true } } },
    });
    const billingStatus = kunjungan?.billing?.status;
    if (billingStatus && ['LUNAS', 'SEBAGIAN'].includes(billingStatus)) {
      return NextResponse.json({ error: 'Tidak bisa hapus — billing sudah dibayar' }, { status: 422 });
    }

    await prisma.penggunaanAlat.delete({ where: { id: eid } });
    return NextResponse.json({ message: 'Data peralatan berhasil dihapus' });
  } catch (err: unknown) {
    console.error('[DELETE /kunjungan/[id]/alat/[eid]]', err);
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Server error' }, { status: 500 });
  }
}
