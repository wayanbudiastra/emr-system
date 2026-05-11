import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { pasienService } from '@/services/pasien.service';

const CAN_TOGGLE = ['SUPER_ADMIN','ADMISSION'];

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user)                          return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!CAN_TOGGLE.includes(session.user.role)) return NextResponse.json({ error: 'Forbidden' },    { status: 403 });

  const { id } = await params;
  const body = await req.json();
  const isActive = typeof body.isActive === 'boolean' ? body.isActive : true;

  try {
    const result = await pasienService.toggleActive(id, isActive, session.user.id);
    return NextResponse.json(result);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Terjadi kesalahan';
    return NextResponse.json({ error: message }, { status: 422 });
  }
}
