import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getPrisma } from '@/lib/prisma';

const CAN_FINISH = ['SUPER_ADMIN', 'PERAWAT', 'DOKTER'];

export async function PATCH(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user)                            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!CAN_FINISH.includes(session.user.role))   return NextResponse.json({ error: 'Forbidden' },   { status: 403 });

  const { id } = await params;
  const prisma  = await getPrisma();

  const kunjungan = await prisma.kunjungan.findUnique({ where: { id } });
  if (!kunjungan) return NextResponse.json({ error: 'Kunjungan tidak ditemukan' }, { status: 404 });
  if (!['MENUNGGU', 'DALAM_PEMERIKSAAN'].includes(kunjungan.status)) {
    return NextResponse.json({ error: `Status saat ini: ${kunjungan.status}` }, { status: 422 });
  }

  const result = await prisma.kunjungan.update({
    where: { id },
    data:  { status: 'SELESAI', selesaiAt: new Date() },
  });

  return NextResponse.json(result);
}
