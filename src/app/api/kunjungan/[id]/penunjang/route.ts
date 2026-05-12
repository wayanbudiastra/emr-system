import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getPrisma } from '@/lib/prisma';
import { z } from 'zod';

const CAN_READ  = ['SUPER_ADMIN', 'DOKTER', 'PERAWAT', 'KASIR'];
const CAN_WRITE = ['SUPER_ADMIN', 'DOKTER', 'PERAWAT'];

const orderItemSchema = z.object({
  itemPenunjangId: z.string().min(1),
  catatan:         z.string().max(500).optional().nullable(),
});

const createOrderSchema = z.object({
  items: z.array(orderItemSchema).min(1, 'Minimal satu item wajib dipilih'),
});

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user)                           return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!CAN_READ.includes(session.user.role))    return NextResponse.json({ error: 'Forbidden' },   { status: 403 });

    const { id } = await params;
    const prisma  = await getPrisma();

    const data = await prisma.permintaanPenunjang.findMany({
      where:   { kunjunganId: id },
      include: {
        itemPenunjang: {
          select: { id: true, kode: true, nama: true, kategori: true, tarif: true, satuanWaktu: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(data);
  } catch (err: unknown) {
    console.error('[GET /api/kunjungan/[id]/penunjang]', err);
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Server error' }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user)                            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!CAN_WRITE.includes(session.user.role))    return NextResponse.json({ error: 'Forbidden' },   { status: 403 });

    const { id: kunjunganId } = await params;
    const body   = await req.json();
    const parsed = createOrderSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validasi gagal', details: parsed.error.flatten() }, { status: 400 });
    }

    const prisma = await getPrisma();

    // Pastikan kunjungan ada
    const kunjungan = await prisma.kunjungan.findUnique({
      where:  { id: kunjunganId },
      select: { id: true, status: true },
    });
    if (!kunjungan) return NextResponse.json({ error: 'Kunjungan tidak ditemukan' }, { status: 404 });

    // Cek duplikat — item yang sama di kunjungan yang sama hari ini
    const existing = await prisma.permintaanPenunjang.findMany({
      where: {
        kunjunganId,
        status: { in: ['DIPESAN', 'DIPROSES'] },
      },
      select: { itemPenunjangId: true, itemPenunjang: { select: { nama: true } } },
    });
    const existingIds = new Set(existing.map(e => e.itemPenunjangId));

    const duplikat = parsed.data.items.filter(i => existingIds.has(i.itemPenunjangId));
    if (duplikat.length > 0) {
      return NextResponse.json(
        { error: `Item sudah ada dalam order aktif: ${duplikat.map(d => d.itemPenunjangId).join(', ')}` },
        { status: 422 }
      );
    }

    // Buat order
    const created = await prisma.$transaction(
      parsed.data.items.map(item =>
        prisma.permintaanPenunjang.create({
          data: {
            kunjunganId,
            itemPenunjangId: item.itemPenunjangId,
            catatan:         item.catatan ?? null,
            status:          'DIPESAN',
          },
          include: {
            itemPenunjang: {
              select: { id: true, kode: true, nama: true, kategori: true, tarif: true },
            },
          },
        })
      )
    );

    return NextResponse.json(created, { status: 201 });
  } catch (err: unknown) {
    console.error('[POST /api/kunjungan/[id]/penunjang]', err);
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Server error' }, { status: 500 });
  }
}
