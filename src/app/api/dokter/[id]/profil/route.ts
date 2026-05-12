import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { dokterService } from '@/services/dokter.service';
import { dokterProfileSchema } from '@/features/dokter/schemas/dokter.schema';

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user)                      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (session.user.role !== 'SUPER_ADMIN') return NextResponse.json({ error: 'Forbidden' },   { status: 403 });

  const { id } = await params;
  const body   = await req.json();
  const parsed = dokterProfileSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: 'Validasi gagal', details: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const result = await dokterService.saveProfile(id, parsed.data);
    return NextResponse.json(result);
  } catch (err: unknown) {
    return NextResponse.json({ error: (err as Error).message }, { status: 422 });
  }
}
