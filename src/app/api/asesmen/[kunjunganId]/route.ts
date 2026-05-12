import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getPrisma } from '@/lib/prisma';
import { z } from 'zod';

const CAN_READ  = ['SUPER_ADMIN', 'DOKTER', 'PERAWAT'];
const CAN_WRITE = ['SUPER_ADMIN', 'PERAWAT', 'DOKTER'];

const asesmenSchema = z.object({
  beratBadan:   z.number().positive().optional().nullable(),
  tinggiBadan:  z.number().positive().optional().nullable(),
  tekananDarah: z.string().max(20).optional().nullable(),
  nadi:         z.number().int().positive().optional().nullable(),
  suhu:         z.number().optional().nullable(),
  saturasi:     z.number().min(0).max(100).optional().nullable(),
  gds:          z.number().optional().nullable(),
  anamnesisAwal: z.string().max(1000).optional().nullable(),
});

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ kunjunganId: string }> }
) {
  const session = await auth();
  if (!session?.user)                          return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!CAN_READ.includes(session.user.role))   return NextResponse.json({ error: 'Forbidden' },   { status: 403 });

  const { kunjunganId } = await params;
  const prisma = await getPrisma();
  const data   = await prisma.asesmenPerawat.findUnique({ where: { kunjunganId } });

  return NextResponse.json(data ?? null);
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ kunjunganId: string }> }
) {
  const session = await auth();
  if (!session?.user)                           return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!CAN_WRITE.includes(session.user.role))   return NextResponse.json({ error: 'Forbidden' },   { status: 403 });

  const { kunjunganId } = await params;
  const body   = await req.json();
  const parsed = asesmenSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Validasi gagal', details: parsed.error.flatten() }, { status: 400 });
  }

  const prisma = await getPrisma();

  // Cek perawat profile
  const perawat = await prisma.perawat.findFirst({
    where: { userId: session.user.id },
  });

  const result = await prisma.asesmenPerawat.upsert({
    where:  { kunjunganId },
    create: { kunjunganId, perawatId: perawat?.id ?? null, ...parsed.data },
    update: parsed.data,
  });

  return NextResponse.json(result);
}
