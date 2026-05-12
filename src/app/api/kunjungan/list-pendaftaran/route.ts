import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { appointmentService } from '@/services/appointment.service';

const CAN_READ = ['SUPER_ADMIN', 'ADMISSION', 'PERAWAT', 'DOKTER', 'KASIR'];

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user)                          return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!CAN_READ.includes(session.user.role))   return NextResponse.json({ error: 'Forbidden' },   { status: 403 });

  const sp = new URL(req.url).searchParams;
  const tanggal = sp.get('tanggal') ? new Date(sp.get('tanggal')!) : undefined;

  const result = await appointmentService.getListPendaftaran({
    tanggal,
    search: sp.get('q')     ?? undefined,
    page:   Number(sp.get('page')  ?? 1),
    limit:  Number(sp.get('limit') ?? 30),
  });

  return NextResponse.json(result);
}
