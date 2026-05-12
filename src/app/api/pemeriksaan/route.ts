import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getPrisma } from '@/lib/prisma';

const CAN_READ = ['SUPER_ADMIN', 'DOKTER', 'PERAWAT', 'ADMISSION'];

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user)                          return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!CAN_READ.includes(session.user.role))   return NextResponse.json({ error: 'Forbidden' },   { status: 403 });

    const prisma  = await getPrisma();
    const sp      = new URL(req.url).searchParams;
    const tanggal = sp.get('tanggal') ? new Date(sp.get('tanggal')!) : new Date();
    const status  = sp.get('status') as 'MENUNGGU' | 'DALAM_PEMERIKSAAN' | null;

    const start = new Date(new Date(tanggal).setHours(0, 0, 0, 0));
    const end   = new Date(start); end.setDate(end.getDate() + 1);

    const where = {
      tanggal: { gte: start, lt: end },
      ...(status
        ? { status }
        : { status: { in: ['MENUNGGU', 'DALAM_PEMERIKSAAN'] as ('MENUNGGU' | 'DALAM_PEMERIKSAAN')[] } }
      ),
    };

    const data = await prisma.kunjungan.findMany({
      where,
      include: {
        pasien: {
          select: {
            id: true, nomorRM: true, nama: true, tanggalLahir: true,
            jenisKelamin: true, golonganDarah: true, alergi: true, foto: true, noBPJS: true,
          },
        },
        dokterProfile: { select: { id: true, spesialisasi: true, user: { select: { nama: true } } } },
        poli:          { select: { id: true, nama: true, kode: true } },
        asesmen:       { select: { beratBadan: true, tinggiBadan: true } },
      },
      orderBy: { createdAt: 'asc' },
    });

    return NextResponse.json(data);
  } catch (err: unknown) {
    console.error('[GET /api/pemeriksaan]', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Server error' },
      { status: 500 }
    );
  }
}
