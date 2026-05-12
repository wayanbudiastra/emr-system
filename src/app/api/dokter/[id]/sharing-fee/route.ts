import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { dokterService } from '@/services/dokter.service';
import { sharingFeeSchema } from '@/features/dokter/schemas/dokter.schema';
import { dokterRepository } from '@/repositories/dokter.repository';

const CAN_READ = ['SUPER_ADMIN', 'KASIR'];

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user)                         return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!CAN_READ.includes(session.user.role))  return NextResponse.json({ error: 'Forbidden' },   { status: 403 });

  const { id } = await params;
  const data   = await dokterRepository.getSharingFee(id);
  return NextResponse.json(data);
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user)                      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (session.user.role !== 'SUPER_ADMIN') return NextResponse.json({ error: 'Forbidden' },   { status: 403 });

  const { id } = await params;
  const body   = await req.json();
  const parsed = sharingFeeSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: 'Validasi gagal', details: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const result = await dokterService.saveSharingFee(id, parsed.data.fees);
    return NextResponse.json(result);
  } catch (err: unknown) {
    return NextResponse.json({ error: (err as Error).message }, { status: 422 });
  }
}
