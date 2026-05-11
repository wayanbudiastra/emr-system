import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { pasienService } from '@/services/pasien.service';

const CAN_READ = ['SUPER_ADMIN','ADMISSION','DOKTER','PERAWAT','KASIR'];

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user)                        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!CAN_READ.includes(session.user.role)) return NextResponse.json({ error: 'Forbidden' },    { status: 403 });

  const q = new URL(req.url).searchParams.get('q') ?? '';
  if (!q || q.length < 1) return NextResponse.json([]);

  const results = await pasienService.search(q);
  return NextResponse.json(results);
}
