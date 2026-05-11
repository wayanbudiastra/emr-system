import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { pasienRepository } from '@/repositories/pasien.repository';
import { kontakDaruratSchema } from '@/features/pasien/schemas/pasien.schema';

const CAN_READ   = ['SUPER_ADMIN','ADMISSION','DOKTER','PERAWAT'];
const CAN_CREATE = ['SUPER_ADMIN','ADMISSION'];

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user)                        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!CAN_READ.includes(session.user.role)) return NextResponse.json({ error: 'Forbidden' },    { status: 403 });

  const { id } = await params;
  const kontak = await pasienRepository.findKontakDarurat(id);
  return NextResponse.json(kontak);
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user)                          return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!CAN_CREATE.includes(session.user.role)) return NextResponse.json({ error: 'Forbidden' },    { status: 403 });

  const { id } = await params;
  const body   = await req.json();
  const parsed = kontakDaruratSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Validasi gagal', details: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const kontak = await pasienRepository.addKontakDarurat(id, parsed.data);
    return NextResponse.json(kontak, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Terjadi kesalahan';
    return NextResponse.json({ error: message }, { status: 422 });
  }
}
