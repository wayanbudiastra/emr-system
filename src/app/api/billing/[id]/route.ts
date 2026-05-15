import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getPrisma } from '@/lib/prisma';

const CAN_READ = ['SUPER_ADMIN', 'KASIR'];

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user)                        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!CAN_READ.includes(session.user.role)) return NextResponse.json({ error: 'Forbidden' },   { status: 403 });

    const { id } = await params;
    const prisma  = await getPrisma();

    const billing = await prisma.billing.findUnique({
      where:   { id },
      include: {
        items: { orderBy: { createdAt: 'asc' } },
        pembayaran: {
          orderBy: { createdAt: 'asc' },
          include: { shift: { select: { id: true, openAt: true } } },
        },
        cancelledBy: { select: { id: true, nama: true } },
        kunjungan: {
          select: {
            id:       true,
            tanggal:  true,
            penjamin: true,
            pasien:   { select: { id: true, nomorRM: true, nama: true, tanggalLahir: true, jenisKelamin: true } },
            poli:     { select: { nama: true } },
            dokterProfile: { select: { user: { select: { nama: true } } } },
            resep:    { select: { id: true, status: true } },
          },
        },
      },
    });

    if (!billing) return NextResponse.json({ error: 'Billing tidak ditemukan' }, { status: 404 });

    return NextResponse.json({ data: billing });
  } catch (err: unknown) {
    console.error('[GET /api/billing/[id]]', err);
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Server error' }, { status: 500 });
  }
}
