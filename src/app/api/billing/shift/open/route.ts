import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getPrisma } from '@/lib/prisma';
import { z } from 'zod';

const CAN_ACCESS = ['SUPER_ADMIN', 'KASIR'];

const openShiftSchema = z.object({
  modalAwal: z.number().min(0, 'Modal awal tidak boleh negatif'),
});

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user)                           return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!CAN_ACCESS.includes(session.user.role))  return NextResponse.json({ error: 'Forbidden' },   { status: 403 });

    const body   = await req.json();
    const parsed = openShiftSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validasi gagal', details: parsed.error.flatten() }, { status: 400 });
    }

    const prisma = await getPrisma();

    const existingOpen = await prisma.shiftKasir.findFirst({
      where: { kasirId: session.user.id, status: 'OPEN' },
    });
    if (existingOpen) {
      return NextResponse.json({ error: 'Anda masih memiliki shift yang aktif' }, { status: 422 });
    }

    const shift = await prisma.shiftKasir.create({
      data: {
        kasirId:  session.user.id,
        modalAwal: parsed.data.modalAwal,
        status:   'OPEN',
      },
      include: { kasir: { select: { id: true, nama: true } } },
    });

    return NextResponse.json({ data: shift }, { status: 201 });
  } catch (err: unknown) {
    console.error('[POST /api/billing/shift/open]', err);
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Server error' }, { status: 500 });
  }
}
