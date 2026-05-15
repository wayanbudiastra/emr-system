import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getPrisma } from '@/lib/prisma';
import { z } from 'zod';

const CAN_WRITE = ['SUPER_ADMIN', 'KASIR'];

const diskonSchema = z.object({
  diskonGlobal:  z.number().min(0).default(0),
  diskonPersen:  z.number().min(0).max(100).optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user)                          return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!CAN_WRITE.includes(session.user.role))  return NextResponse.json({ error: 'Forbidden' },   { status: 403 });

    const { id: billingId } = await params;
    const body   = await req.json();
    const parsed = diskonSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validasi gagal', details: parsed.error.flatten() }, { status: 400 });
    }

    const prisma = await getPrisma();

    const billing = await prisma.billing.findUnique({
      where:   { id: billingId },
      include: { items: true },
    });
    if (!billing) return NextResponse.json({ error: 'Billing tidak ditemukan' }, { status: 404 });
    if (['LUNAS', 'DIBATALKAN'].includes(billing.status)) {
      return NextResponse.json({ error: 'Billing sudah selesai' }, { status: 422 });
    }

    const subtotal = billing.items.reduce((s, i) => s + (i.hargaSatuan * i.jumlah - i.diskonItem), 0);

    let diskonGlobal = parsed.data.diskonGlobal;
    if (parsed.data.diskonPersen !== undefined) {
      diskonGlobal = (parsed.data.diskonPersen / 100) * subtotal;
    }
    diskonGlobal = Math.min(diskonGlobal, subtotal);

    const totalTagihan = Math.max(0, subtotal - diskonGlobal);

    const updated = await prisma.billing.update({
      where: { id: billingId },
      data:  {
        diskonGlobal,
        totalTagihan,
        sisa: Math.max(0, totalTagihan - billing.totalBayar),
      },
      include: { items: { orderBy: { createdAt: 'asc' } } },
    });

    return NextResponse.json({ data: updated });
  } catch (err: unknown) {
    console.error('[PATCH /api/billing/[id]/diskon]', err);
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Server error' }, { status: 500 });
  }
}
