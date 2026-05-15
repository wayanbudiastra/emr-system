import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getPrisma } from '@/lib/prisma';

const CAN_ACCESS = ['SUPER_ADMIN', 'KASIR'];

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user)                           return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!CAN_ACCESS.includes(session.user.role))  return NextResponse.json({ error: 'Forbidden' },   { status: 403 });

    const { searchParams } = req.nextUrl;
    const search = searchParams.get('search') ?? '';
    const tanggal = searchParams.get('tanggal') ?? new Date().toISOString().split('T')[0];

    const prisma = await getPrisma();

    const startOfDay = new Date(`${tanggal}T00:00:00.000Z`);
    const endOfDay   = new Date(`${tanggal}T23:59:59.999Z`);

    const data = await prisma.kunjungan.findMany({
      where: {
        tanggal: { gte: startOfDay, lte: endOfDay },
        status:  { in: ['SELESAI', 'DALAM_PEMERIKSAAN'] },
        ...(search ? {
          pasien: {
            OR: [
              { nama:    { contains: search, mode: 'insensitive' as const } },
              { nomorRM: { contains: search, mode: 'insensitive' as const } },
            ],
          },
        } : {}),
      },
      include: {
        pasien:        { select: { id: true, nomorRM: true, nama: true } },
        poli:          { select: { nama: true } },
        dokterProfile: { select: { user: { select: { nama: true } } } },
        billing:       { select: { id: true, nomorInvoice: true, status: true, totalTagihan: true, sisa: true } },
      },
      orderBy: { tanggal: 'desc' },
      take:    30,
    });

    return NextResponse.json({ data });
  } catch (err: unknown) {
    console.error('[GET /api/billing/kunjungan]', err);
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Server error' }, { status: 500 });
  }
}
