import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { pasienService } from '@/services/pasien.service';
import { createPasienSchema } from '@/features/pasien/schemas/pasien.schema';

const CAN_READ   = ['SUPER_ADMIN','ADMISSION','DOKTER','PERAWAT','KASIR'];
const CAN_CREATE = ['SUPER_ADMIN','ADMISSION','PERAWAT'];

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user)                        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!CAN_READ.includes(session.user.role)) return NextResponse.json({ error: 'Forbidden' },    { status: 403 });

  const sp = new URL(req.url).searchParams;
  const result = await pasienService.getAll({
    search:     sp.get('q')     ?? undefined,
    tipePasien: (sp.get('tipe') as 'WNI' | 'WNA' | null) ?? undefined,
    isActive:   sp.get('isActive') !== 'false',
    page:       Number(sp.get('page')  ?? 1),
    limit:      Number(sp.get('limit') ?? 20),
  });

  return NextResponse.json(result);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user)                          return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!CAN_CREATE.includes(session.user.role)) return NextResponse.json({ error: 'Forbidden' },    { status: 403 });

  const body   = await req.json();
  const parsed = createPasienSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Validasi gagal', details: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const pasien = await pasienService.create(parsed.data, session.user.id);
    return NextResponse.json(pasien, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Terjadi kesalahan';
    return NextResponse.json({ error: message }, { status: 422 });
  }
}
