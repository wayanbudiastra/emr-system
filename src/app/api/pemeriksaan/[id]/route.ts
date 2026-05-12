import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getPrisma } from '@/lib/prisma';

const CAN_READ = ['SUPER_ADMIN', 'DOKTER', 'PERAWAT', 'ADMISSION'];

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user)                         return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!CAN_READ.includes(session.user.role))  return NextResponse.json({ error: 'Forbidden' },   { status: 403 });

  const { id } = await params;
  const prisma  = await getPrisma();

  const data = await prisma.kunjungan.findUnique({
    where: { id },
    include: {
      pasien: true,
      dokterProfile: { include: { user: { select: { nama: true, telepon: true } } } },
      poli:          { select: { id: true, nama: true, kode: true, lantai: true } },
      asesmen:       true,
      soap:          true,
      resep:         { include: { items: { include: { obat: true } } } },
      tindakan:      { include: { masterTindakan: true } },
      billing:       true,
      appointment:   { select: { kodeBooking: true, penjamin: true } },
    },
  });

  if (!data) return NextResponse.json({ error: 'Kunjungan tidak ditemukan' }, { status: 404 });
  return NextResponse.json(data);
}
