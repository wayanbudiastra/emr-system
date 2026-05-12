import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getPrisma } from '@/lib/prisma';
import { z } from 'zod';

const CAN_READ  = ['SUPER_ADMIN', 'DOKTER', 'PERAWAT', 'KASIR'];
const CAN_WRITE = ['SUPER_ADMIN', 'DOKTER', 'PERAWAT'];

const addTindakanSchema = z.object({
  masterTindakanId: z.string().min(1, 'Tindakan wajib dipilih'),
  jumlah:           z.number().int().min(1).max(99).default(1),
  pelaksana:        z.string().max(100).optional().nullable(),
  catatan:          z.string().max(300).optional().nullable(),
});

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user)                           return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!CAN_READ.includes(session.user.role))    return NextResponse.json({ error: 'Forbidden' },   { status: 403 });

    const { id } = await params;
    const prisma  = await getPrisma();

    const data = await prisma.tindakan.findMany({
      where:   { kunjunganId: id },
      include: {
        masterTindakan: {
          select: { id: true, kode: true, nama: true, tarif: true, tarifBPJS: true },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    return NextResponse.json(data);
  } catch (err: unknown) {
    console.error('[GET /kunjungan/[id]/tindakan]', err);
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Server error' }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user)                            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!CAN_WRITE.includes(session.user.role))    return NextResponse.json({ error: 'Forbidden' },   { status: 403 });

    const { id: kunjunganId } = await params;
    const body   = await req.json();
    const parsed = addTindakanSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validasi gagal', details: parsed.error.flatten() }, { status: 400 });
    }

    const prisma = await getPrisma();

    const kunjungan = await prisma.kunjungan.findUnique({
      where:  { id: kunjunganId },
      select: { id: true, billing: { select: { status: true } } },
    });
    if (!kunjungan) return NextResponse.json({ error: 'Kunjungan tidak ditemukan' }, { status: 404 });
    if (kunjungan.billing && ['LUNAS', 'SEBAGIAN'].includes(kunjungan.billing.status)) {
      return NextResponse.json({ error: 'Billing sudah dibayar — tidak bisa tambah tindakan' }, { status: 422 });
    }

    // Gabungkan pelaksana + catatan dalam field catatan
    const catatanKombinasi = [
      parsed.data.pelaksana ? `Pelaksana: ${parsed.data.pelaksana}` : null,
      parsed.data.catatan,
    ].filter(Boolean).join('\n') || null;

    const result = await prisma.tindakan.create({
      data: {
        kunjunganId,
        masterTindakanId: parsed.data.masterTindakanId,
        jumlah:           parsed.data.jumlah,
        catatan:          catatanKombinasi,
      },
      include: {
        masterTindakan: {
          select: { id: true, kode: true, nama: true, tarif: true },
        },
      },
    });

    return NextResponse.json(result, { status: 201 });
  } catch (err: unknown) {
    console.error('[POST /kunjungan/[id]/tindakan]', err);
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Server error' }, { status: 500 });
  }
}
