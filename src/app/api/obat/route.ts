import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getPrisma } from '@/lib/prisma';

const CAN_READ = ['SUPER_ADMIN', 'DOKTER', 'PERAWAT', 'APOTEKER'];

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!CAN_READ.includes(session.user.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { searchParams } = req.nextUrl;
    const search = searchParams.get('search') ?? '';
    const limit  = Math.min(Number(searchParams.get('limit') ?? 20), 50);

    const prisma = await getPrisma();

    const obat = await prisma.obat.findMany({
      where: {
        isActive: true,
        stok:     { gt: 0 },
        ...(search ? {
          OR: [
            { nama:    { contains: search, mode: 'insensitive' } },
            { generik: { contains: search, mode: 'insensitive' } },
            { kode:    { contains: search, mode: 'insensitive' } },
          ],
        } : {}),
      },
      select: {
        id:       true,
        kode:     true,
        nama:     true,
        generik:  true,
        satuan:   true,
        stok:     true,
        harga:    true,
        hargaBPJS: true,
        isPaten:  true,
      },
      orderBy: { nama: 'asc' },
      take:    limit,
    });

    return NextResponse.json(obat);
  } catch (err: unknown) {
    console.error('[GET /api/obat]', err);
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Server error' }, { status: 500 });
  }
}
