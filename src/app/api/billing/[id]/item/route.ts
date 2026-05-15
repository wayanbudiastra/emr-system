import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getPrisma } from '@/lib/prisma';
import { z } from 'zod';

const CAN_WRITE = ['SUPER_ADMIN', 'KASIR'];

const addItemSchema = z.object({
  namaItem:    z.string().min(1).max(200),
  jumlah:      z.number().int().min(1).max(999).default(1),
  hargaSatuan: z.number().min(0),
  catatan:     z.string().max(300).optional().nullable(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user)                          return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!CAN_WRITE.includes(session.user.role))  return NextResponse.json({ error: 'Forbidden' },   { status: 403 });

    const { id: billingId } = await params;
    const body   = await req.json();
    const parsed = addItemSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validasi gagal', details: parsed.error.flatten() }, { status: 400 });
    }

    const prisma = await getPrisma();

    const billing = await prisma.billing.findUnique({
      where:  { id: billingId },
      select: { id: true, status: true, totalTagihan: true, totalBayar: true, diskonGlobal: true },
    });
    if (!billing) return NextResponse.json({ error: 'Billing tidak ditemukan' }, { status: 404 });
    if (['LUNAS', 'DIBATALKAN'].includes(billing.status)) {
      return NextResponse.json({ error: 'Billing sudah selesai — tidak bisa ditambah item' }, { status: 422 });
    }

    const namaWithCatatan = parsed.data.catatan
      ? `${parsed.data.namaItem} (${parsed.data.catatan})`
      : parsed.data.namaItem;

    await prisma.$transaction(async (tx) => {
      await tx.billingItem.create({
        data: {
          billingId,
          kategori:    'ADMINISTRASI',
          namaItem:    namaWithCatatan,
          jumlah:      parsed.data.jumlah,
          hargaSatuan: parsed.data.hargaSatuan,
          diskonItem:  0,
          isObat:      false,
        },
      });

      const allItems = await tx.billingItem.findMany({ where: { billingId } });
      const subtotal  = allItems.reduce((s, i) => s + (i.hargaSatuan * i.jumlah - i.diskonItem), 0);
      const totalTagihan = Math.max(0, subtotal - billing.diskonGlobal);

      await tx.billing.update({
        where: { id: billingId },
        data:  {
          totalTagihan,
          sisa: Math.max(0, totalTagihan - billing.totalBayar),
        },
      });
    });

    const updated = await prisma.billing.findUnique({
      where:   { id: billingId },
      include: { items: { orderBy: { createdAt: 'asc' } } },
    });

    return NextResponse.json({ data: updated }, { status: 201 });
  } catch (err: unknown) {
    console.error('[POST /api/billing/[id]/item]', err);
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Server error' }, { status: 500 });
  }
}
