import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getPrisma } from '@/lib/prisma';
import { z } from 'zod';

const CAN_READ  = ['SUPER_ADMIN', 'APOTEKER', 'DOKTER', 'PERAWAT'];
const CAN_WRITE = ['SUPER_ADMIN', 'APOTEKER'];

const createObatSchema = z.object({
  kode:        z.string().min(2, 'Kode minimal 2 karakter'),
  barcode:     z.string().optional().nullable(),
  nama:        z.string().min(2, 'Nama minimal 2 karakter'),
  generik:     z.string().optional().nullable(),
  jenisBarang: z.enum(['OBAT', 'ALKES']).default('OBAT'),
  satuan:      z.string().min(1, 'Satuan kecil wajib diisi'),
  satuanBesar: z.string().optional().nullable(),
  isPaten:     z.boolean().default(false),
  stok:        z.number().int().min(0).default(0),
  minStock:    z.number().int().min(0).default(0),
  maxStock:    z.number().int().min(0).optional().nullable(),
  harga:       z.number().min(0, 'Harga tidak boleh negatif'),
  hargaBPJS:   z.number().min(0).optional().nullable(),
  hargaBeli:   z.number().min(0).optional().nullable(),
  kategori:    z.string().optional().nullable(),
  isActive:    z.boolean().default(true),
  expiredDate: z.coerce.date().optional().nullable(),
});

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user)                           return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!CAN_READ.includes(session.user.role))    return NextResponse.json({ error: 'Forbidden' },   { status: 403 });

    const sp          = new URL(req.url).searchParams;
    const search      = sp.get('q')      ?? undefined;
    const jenisBarang = sp.get('jenis')  ?? undefined;
    const isActive    = sp.get('aktif') === 'false' ? false : sp.get('aktif') === 'true' ? true : undefined;
    const lowStock    = sp.get('lowStock') === 'true';
    const page        = Number(sp.get('page')  ?? 1);
    const limit       = Number(sp.get('limit') ?? 30);

    const prisma = await getPrisma();

    const where = {
      ...(isActive !== undefined ? { isActive } : {}),
      ...(jenisBarang ? { jenisBarang } : {}),
      ...(lowStock ? { stok: { lte: prisma.obat.fields?.minStock ?? 0 } } : {}),
      ...(search ? {
        OR: [
          { nama:    { contains: search, mode: 'insensitive' as const } },
          { kode:    { contains: search, mode: 'insensitive' as const } },
          { generik: { contains: search, mode: 'insensitive' as const } },
          { barcode: { contains: search, mode: 'insensitive' as const } },
        ],
      } : {}),
    };

    // Low stock filter needs raw comparison
    const whereClean = lowStock
      ? {
          ...where,
          stok: undefined,
          AND: [{ stok: { lte: prisma.obat.fields?.minStock } }] as never,
        }
      : where;

    const [data, total] = await Promise.all([
      prisma.obat.findMany({
        where: search || jenisBarang !== undefined || isActive !== undefined ? where : where,
        orderBy: { nama: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.obat.count({ where }),
    ]);

    // Low stock flag per item
    const dataWithFlags = data.map(o => ({
      ...o,
      isLowStock:  o.stok <= o.minStock,
      isOverstock: o.maxStock !== null && o.stok > (o.maxStock ?? 0),
    }));

    const lowStockCount = await prisma.obat.count({
      where: { isActive: true },
    }).then(async () => {
      const all = await prisma.obat.findMany({
        where: { isActive: true },
        select: { stok: true, minStock: true },
      });
      return all.filter(o => o.stok <= o.minStock).length;
    });

    return NextResponse.json({ data: dataWithFlags, total, page, limit, totalPages: Math.ceil(total / limit), lowStockCount });
  } catch (err: unknown) {
    console.error('[GET /api/farmasi/obat]', err);
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user)                            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!CAN_WRITE.includes(session.user.role))    return NextResponse.json({ error: 'Forbidden' },   { status: 403 });

    const body   = await req.json();
    const parsed = createObatSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validasi gagal', details: parsed.error.flatten() }, { status: 400 });
    }

    const prisma = await getPrisma();

    // Cek duplikat kode
    const existing = await prisma.obat.findUnique({ where: { kode: parsed.data.kode } });
    if (existing) return NextResponse.json({ error: `Kode "${parsed.data.kode}" sudah digunakan` }, { status: 422 });

    const result = await prisma.obat.create({ data: parsed.data });
    return NextResponse.json(result, { status: 201 });
  } catch (err: unknown) {
    console.error('[POST /api/farmasi/obat]', err);
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Server error' }, { status: 500 });
  }
}
