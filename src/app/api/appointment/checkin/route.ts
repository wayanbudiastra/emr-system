import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { appointmentService } from '@/services/appointment.service';
import { z } from 'zod';
import type { TipePenjamin } from '@prisma/client';

const schema = z.object({
  kodeBooking: z.string().min(1),
  penjamin:    z.enum(['UMUM', 'BPJS', 'ASURANSI']).optional(),
});

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!['SUPER_ADMIN', 'ADMISSION'].includes(session.user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body   = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Validasi gagal', details: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const result = await appointmentService.checkin(
      parsed.data.kodeBooking,
      parsed.data.penjamin as TipePenjamin | undefined,
    );
    return NextResponse.json(result, { status: 201 });
  } catch (err: unknown) {
    return NextResponse.json({ error: (err as Error).message }, { status: 422 });
  }
}
