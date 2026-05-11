import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { pasienService } from '@/services/pasien.service';
import { updatePasienSchema } from '@/features/pasien/schemas/pasien.schema';

const CAN_READ   = ['SUPER_ADMIN','ADMISSION','DOKTER','PERAWAT'];
const CAN_UPDATE = ['SUPER_ADMIN','ADMISSION','PERAWAT'];

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user)                        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!CAN_READ.includes(session.user.role)) return NextResponse.json({ error: 'Forbidden' },    { status: 403 });

  const { id } = await params;
  try {
    const pasien = await pasienService.getById(id);
    return NextResponse.json(pasien);
  } catch {
    return NextResponse.json({ error: 'Pasien tidak ditemukan' }, { status: 404 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user)                          return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!CAN_UPDATE.includes(session.user.role)) return NextResponse.json({ error: 'Forbidden' },    { status: 403 });

  const { id } = await params;
  const body   = await req.json();
  const parsed = updatePasienSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Validasi gagal', details: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const pasien = await pasienService.update(id, parsed.data, session.user.id);
    return NextResponse.json(pasien);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Terjadi kesalahan';
    return NextResponse.json({ error: message }, { status: 422 });
  }
}
