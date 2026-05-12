import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { appointmentService } from '@/services/appointment.service';

export async function PATCH(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!['SUPER_ADMIN', 'ADMISSION'].includes(session.user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id } = await params;
  try {
    const result = await appointmentService.cancel(id);
    return NextResponse.json(result);
  } catch (err: unknown) {
    return NextResponse.json({ error: (err as Error).message }, { status: 422 });
  }
}
