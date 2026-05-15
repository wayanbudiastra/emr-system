import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getPrisma } from '@/lib/prisma';
import { z } from 'zod';

const CAN_WRITE = ['SUPER_ADMIN', 'KASIR'];

const updateItemSchema = z.object({
  diskonItem: z.number().min(0).optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; itemId: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user)                          return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!CAN_WRITE.includes(session.user.role))  return NextResponse.json({ error: 'Forbidden' },   { status: 403 });

    const { id: billingId, itemId } = await params;
    const body   = await req.json();
    const parsed = updateItemSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validasi gagal', details: parsed.error.flatten() }, { status: 400 });
    }

    const prisma = await getPrisma();

    const item = await prisma.billingItem.findUnique({ where: { id: itemId } });
    if (!item || item.billingId !== billingId) {
      return NextResponse.json({ error: 'Item tidak ditemukan' }, { status: 404 });
    }
    if (item.isObat) {
      return NextResponse.json({ error: 'Item obat tidak boleh diubah dari kasir' }, { status: 422 });
    }

    const billing = await prisma.billing.findUnique({
      where:  { id: billingId },
      select: { status: true, totalBayar: true, diskonGlobal: true },
    });
    if (billing && ['LUNAS', 'DIBATALKAN'].includes(billing.status)) {
      return NextResponse.json({ error: 'Billing sudah selesai' }, { status: 422 });
    }

    const maxDiskon = item.hargaSatuan * item.jumlah;
    const diskonItem = Math.min(parsed.data.diskonItem ?? item.diskonItem, maxDiskon);

    await prisma.$transaction(async (tx) => {
      await tx.billingItem.update({
        where: { id: itemId },
        data:  { diskonItem },
      });

      const allItems = await tx.billingItem.findMany({ where: { billingId } });
      const subtotal  = allItems.reduce((s, i) => s + (i.hargaSatuan * i.jumlah - i.diskonItem), 0);
      const totalTagihan = Math.max(0, subtotal - (billing?.diskonGlobal ?? 0));

      await tx.billing.update({
        where: { id: billingId },
        data:  {
          totalTagihan,
          sisa: Math.max(0, totalTagihan - (billing?.totalBayar ?? 0)),
        },
      });
    });

    const updated = await prisma.billing.findUnique({
      where:   { id: billingId },
      include: { items: { orderBy: { createdAt: 'asc' } } },
    });

    return NextResponse.json({ data: updated });
  } catch (err: unknown) {
    console.error('[PATCH /api/billing/[id]/item/[itemId]]', err);
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Server error' }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; itemId: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user)                          return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!CAN_WRITE.includes(session.user.role))  return NextResponse.json({ error: 'Forbidden' },   { status: 403 });

    const { id: billingId, itemId } = await params;
    const prisma = await getPrisma();

    const item = await prisma.billingItem.findUnique({ where: { id: itemId } });
    if (!item || item.billingId !== billingId) {
      return NextResponse.json({ error: 'Item tidak ditemukan' }, { status: 404 });
    }
    if (item.isObat) {
      return NextResponse.json({ error: 'Item obat tidak boleh dihapus dari kasir — hubungi apoteker' }, { status: 422 });
    }

    const billing = await prisma.billing.findUnique({
      where:  { id: billingId },
      select: { status: true, totalBayar: true, diskonGlobal: true },
    });
    if (billing && ['LUNAS', 'DIBATALKAN'].includes(billing.status)) {
      return NextResponse.json({ error: 'Billing sudah selesai' }, { status: 422 });
    }

    await prisma.$transaction(async (tx) => {
      await tx.billingItem.delete({ where: { id: itemId } });

      const allItems = await tx.billingItem.findMany({ where: { billingId } });
      const subtotal  = allItems.reduce((s, i) => s + (i.hargaSatuan * i.jumlah - i.diskonItem), 0);
      const totalTagihan = Math.max(0, subtotal - (billing?.diskonGlobal ?? 0));

      await tx.billing.update({
        where: { id: billingId },
        data:  {
          totalTagihan,
          sisa: Math.max(0, totalTagihan - (billing?.totalBayar ?? 0)),
        },
      });
    });

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    console.error('[DELETE /api/billing/[id]/item/[itemId]]', err);
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Server error' }, { status: 500 });
  }
}
