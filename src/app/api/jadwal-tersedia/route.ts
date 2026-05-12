import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { appointmentService } from '@/services/appointment.service';

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const sp            = new URL(req.url).searchParams;
  const tanggalStr    = sp.get('tanggal');
  const spesialisasi  = sp.get('spesialisasi')     ?? undefined;
  const dokterProfileId = sp.get('dokterProfileId') ?? undefined;

  const tanggal = tanggalStr ? new Date(tanggalStr) : new Date();

  const data = await appointmentService.getJadwalTersedia({ tanggal, spesialisasi, dokterProfileId });
  return NextResponse.json(data);
}
