import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getPrisma } from '@/lib/prisma';

const CAN_ACCESS = ['SUPER_ADMIN', 'KASIR'];

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user)                           return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!CAN_ACCESS.includes(session.user.role))  return NextResponse.json({ error: 'Forbidden' },   { status: 403 });

    const prisma = await getPrisma();

    const shift = await prisma.shiftKasir.findFirst({
      where:   { kasirId: session.user.id, status: 'OPEN' },
      include: { kasir: { select: { id: true, nama: true } } },
      orderBy: { openAt: 'desc' },
    });

    return NextResponse.json({ data: shift });
  } catch (err: unknown) {
    console.error('[GET /api/billing/shift/active]', err);
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Server error' }, { status: 500 });
  }
}
