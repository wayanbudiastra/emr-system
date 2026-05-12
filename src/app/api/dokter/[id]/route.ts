import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { dokterService } from '@/services/dokter.service';

const CAN_READ = ['SUPER_ADMIN', 'ADMISSION', 'KASIR', 'DOKTER'];

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user)                         return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!CAN_READ.includes(session.user.role))  return NextResponse.json({ error: 'Forbidden' },   { status: 403 });

  const { id } = await params;
  try {
    const data = await dokterService.getById(id);
    return NextResponse.json(data);
  } catch (err: unknown) {
    return NextResponse.json({ error: (err as Error).message }, { status: 404 });
  }
}
