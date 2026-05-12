import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { dokterService } from '@/services/dokter.service';

const CAN_HITUNG = ['SUPER_ADMIN', 'KASIR'];

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user)                              return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!CAN_HITUNG.includes(session.user.role))     return NextResponse.json({ error: 'Forbidden' },   { status: 403 });

  const { id } = await params;
  const body   = await req.json();

  try {
    const result = await dokterService.hitungSharingFee({ dokterProfileId: id, items: body.items });
    return NextResponse.json(result);
  } catch (err: unknown) {
    return NextResponse.json({ error: (err as Error).message }, { status: 422 });
  }
}
