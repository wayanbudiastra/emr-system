import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { dokterService } from '@/services/dokter.service';
import { jadwalPraktekSchema } from '@/features/dokter/schemas/dokter.schema';
import { dokterRepository } from '@/repositories/dokter.repository';

const CAN_READ = ['SUPER_ADMIN', 'ADMISSION'];

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user)                         return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!CAN_READ.includes(session.user.role))  return NextResponse.json({ error: 'Forbidden' },   { status: 403 });

  const { id } = await params;
  const dokter = await dokterRepository.getMappingByDokter(id);
  return NextResponse.json(dokter);
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user)                      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (session.user.role !== 'SUPER_ADMIN') return NextResponse.json({ error: 'Forbidden' },   { status: 403 });

  await params; // id not needed for create — dokterPoliId comes from body
  const body   = await req.json();
  const parsed = jadwalPraktekSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: 'Validasi gagal', details: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const result = await dokterService.createJadwal(parsed.data);
    return NextResponse.json(result, { status: 201 });
  } catch (err: unknown) {
    return NextResponse.json({ error: (err as Error).message }, { status: 422 });
  }
}
