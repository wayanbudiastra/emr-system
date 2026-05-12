import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { dokterService } from '@/services/dokter.service';

const CAN_READ = ['SUPER_ADMIN', 'ADMISSION', 'KASIR', 'DOKTER'];

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user)                         return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!CAN_READ.includes(session.user.role))  return NextResponse.json({ error: 'Forbidden' },   { status: 403 });

  const sp = new URL(req.url).searchParams;
  const result = await dokterService.getAll({
    search: sp.get('q')     ?? undefined,
    page:   Number(sp.get('page')  ?? 1),
    limit:  Number(sp.get('limit') ?? 20),
  });

  return NextResponse.json(result);
}
