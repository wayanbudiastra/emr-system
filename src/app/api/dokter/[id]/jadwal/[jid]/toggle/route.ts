import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { dokterService } from '@/services/dokter.service';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; jid: string }> }
) {
  const session = await auth();
  if (!session?.user)                      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (session.user.role !== 'SUPER_ADMIN') return NextResponse.json({ error: 'Forbidden' },   { status: 403 });

  const { jid }     = await params;
  const { isAktif } = await req.json();

  if (typeof isAktif !== 'boolean') {
    return NextResponse.json({ error: 'isAktif harus boolean' }, { status: 400 });
  }

  const result = await dokterService.toggleJadwal(jid, isAktif);
  return NextResponse.json(result);
}
