import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getPrisma } from '@/lib/prisma';
import { z } from 'zod';

const stokSchema = z.object({
  delta:     z.number().int(),  // + for in, - for out
  keterangan: z.string().optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!['SUPER_ADMIN', 'APOTEKER'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;
    const body    = await req.json();
    const parsed  = stokSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validasi gagal' }, { status: 400 });
    }

    const prisma = await getPrisma();
    const obat   = await prisma.obat.findUnique({ where: { id }, select: { stok: true } });
    if (!obat) return NextResponse.json({ error: 'Obat tidak ditemukan' }, { status: 404 });

    const newStok = obat.stok + parsed.data.delta;
    if (newStok < 0) {
      return NextResponse.json({ error: 'Stok tidak mencukupi' }, { status: 422 });
    }

    const result = await prisma.obat.update({
      where: { id },
      data:  { stok: newStok },
    });
    return NextResponse.json(result);
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Server error' }, { status: 500 });
  }
}
