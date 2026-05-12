import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getPrisma } from '@/lib/prisma';

const CAN_READ = ['SUPER_ADMIN', 'APOTEKER', 'KASIR'];

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user)                        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!CAN_READ.includes(session.user.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { searchParams } = req.nextUrl;
    const status = searchParams.get('status') ?? 'MENUNGGU';
    const search = searchParams.get('search') ?? '';
    const page   = Math.max(1, Number(searchParams.get('page') ?? 1));
    const limit  = Math.min(Number(searchParams.get('limit') ?? 20), 50);

    const prisma = await getPrisma();

    const where = {
      status: status as 'MENUNGGU' | 'DIPROSES' | 'SIAP' | 'DIAMBIL' | 'DIBATALKAN',
      ...(search ? {
        kunjungan: {
          pasien: {
            OR: [
              { nama:    { contains: search, mode: 'insensitive' as const } },
              { nomorRM: { contains: search, mode: 'insensitive' as const } },
            ],
          },
        },
      } : {}),
    };

    const [total, data] = await Promise.all([
      prisma.resep.count({ where }),
      prisma.resep.findMany({
        where,
        include: {
          kunjungan: {
            select: {
              id:     true,
              tanggal: true,
              penjamin: true,
              pasien: { select: { id: true, nomorRM: true, nama: true, tanggalLahir: true, jenisKelamin: true } },
              poli:   { select: { nama: true } },
            },
          },
          dokterProfile: { select: { user: { select: { nama: true } } } },
          items: {
            include: {
              obat: { select: { id: true, nama: true, satuan: true, stok: true, harga: true, hargaBPJS: true } },
            },
          },
          racikanHeaders: {
            include: {
              bahan: {
                include: { obat: { select: { id: true, nama: true, satuan: true, stok: true } } },
              },
            },
          },
        },
        orderBy: { createdAt: 'asc' },
        skip:    (page - 1) * limit,
        take:    limit,
      }),
    ]);

    return NextResponse.json({ data, total, page, limit });
  } catch (err: unknown) {
    console.error('[GET /api/farmasi/resep]', err);
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Server error' }, { status: 500 });
  }
}
