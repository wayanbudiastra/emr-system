import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getPrisma } from '@/lib/prisma';

export async function PATCH(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!['SUPER_ADMIN', 'APOTEKER'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;
    const prisma  = await getPrisma();
    const obat    = await prisma.obat.findUnique({ where: { id }, select: { id: true, isActive: true } });
    if (!obat) return NextResponse.json({ error: 'Obat tidak ditemukan' }, { status: 404 });

    const result = await prisma.obat.update({
      where: { id },
      data:  { isActive: !obat.isActive },
    });
    return NextResponse.json(result);
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Server error' }, { status: 500 });
  }
}
