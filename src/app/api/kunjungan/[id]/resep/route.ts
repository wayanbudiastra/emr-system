import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getPrisma } from '@/lib/prisma';

const CAN_READ  = ['SUPER_ADMIN', 'DOKTER', 'PERAWAT', 'APOTEKER', 'KASIR'];
const CAN_WRITE = ['SUPER_ADMIN', 'DOKTER', 'APOTEKER'];

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user)                         return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!CAN_READ.includes(session.user.role))  return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { id: kunjunganId } = await params;
    const prisma = await getPrisma();

    const resep = await prisma.resep.findMany({
      where:   { kunjunganId },
      include: {
        dokterProfile: { select: { user: { select: { nama: true } } } },
        items: {
          include: { obat: { select: { id: true, nama: true, satuan: true, stok: true, harga: true, hargaBPJS: true } } },
        },
        racikanHeaders: {
          include: {
            bahan: {
              include: { obat: { select: { id: true, nama: true, satuan: true, stok: true } } },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(resep);
  } catch (err: unknown) {
    console.error('[GET /kunjungan/[id]/resep]', err);
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Server error' }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user)                          return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!CAN_WRITE.includes(session.user.role))  return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { id: kunjunganId } = await params;
    const body = await req.json().catch(() => ({}));
    const prisma = await getPrisma();

    const kunjungan = await prisma.kunjungan.findUnique({
      where:  { id: kunjunganId },
      select: { id: true, dokterId: true },
    });
    if (!kunjungan) return NextResponse.json({ error: 'Kunjungan tidak ditemukan' }, { status: 404 });

    const resep = await prisma.resep.create({
      data: {
        kunjunganId,
        dokterId: kunjungan.dokterId ?? null,
        catatan:  body.catatan ?? null,
        status:   'MENUNGGU',
      },
      include: {
        items: true,
        racikanHeaders: { include: { bahan: true } },
      },
    });

    return NextResponse.json(resep, { status: 201 });
  } catch (err: unknown) {
    console.error('[POST /kunjungan/[id]/resep]', err);
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Server error' }, { status: 500 });
  }
}
