import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { pasienRepository } from '@/repositories/pasien.repository';
import { kontakDaruratSchema } from '@/features/pasien/schemas/pasien.schema';

const CAN_MODIFY = ['SUPER_ADMIN','ADMISSION'];

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string; kid: string }> }) {
  const session = await auth();
  if (!session?.user)                          return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!CAN_MODIFY.includes(session.user.role)) return NextResponse.json({ error: 'Forbidden' },    { status: 403 });

  const { kid } = await params;
  const body = await req.json();
  const parsed = kontakDaruratSchema.partial().safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Validasi gagal', details: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const kontak = await pasienRepository.updateKontakDarurat(kid, parsed.data);
    return NextResponse.json(kontak);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Terjadi kesalahan';
    return NextResponse.json({ error: message }, { status: 422 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string; kid: string }> }) {
  const session = await auth();
  if (!session?.user)                          return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!CAN_MODIFY.includes(session.user.role)) return NextResponse.json({ error: 'Forbidden' },    { status: 403 });

  const { kid } = await params;
  try {
    await pasienRepository.deleteKontakDarurat(kid);
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Terjadi kesalahan';
    return NextResponse.json({ error: message }, { status: 422 });
  }
}
