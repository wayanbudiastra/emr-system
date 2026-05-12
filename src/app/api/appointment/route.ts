import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { appointmentService } from '@/services/appointment.service';
import { createAppointmentSchema } from '@/features/pendaftaran/schemas/pendaftaran.schema';

const CAN_READ   = ['SUPER_ADMIN', 'ADMISSION', 'PERAWAT', 'DOKTER'];
const CAN_CREATE = ['SUPER_ADMIN', 'ADMISSION'];

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user)                          return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!CAN_READ.includes(session.user.role))   return NextResponse.json({ error: 'Forbidden' },   { status: 403 });

  const sp = new URL(req.url).searchParams;
  const tanggal = sp.get('tanggal') ? new Date(sp.get('tanggal')!) : new Date();

  const result = await appointmentService.getAll({
    tanggal,
    status: sp.get('status') as never ?? undefined,
    search: sp.get('q')     ?? undefined,
    page:   Number(sp.get('page')  ?? 1),
    limit:  Number(sp.get('limit') ?? 30),
  });

  return NextResponse.json(result);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user)                           return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!CAN_CREATE.includes(session.user.role))  return NextResponse.json({ error: 'Forbidden' },   { status: 403 });

  const body   = await req.json();
  const parsed = createAppointmentSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Validasi gagal', details: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const result = await appointmentService.create(parsed.data);
    return NextResponse.json(result, { status: 201 });
  } catch (err: unknown) {
    return NextResponse.json({ error: (err as Error).message }, { status: 422 });
  }
}
