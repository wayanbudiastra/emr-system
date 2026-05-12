import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getPrisma } from '@/lib/prisma';
import { z } from 'zod';

const CAN_WRITE = ['SUPER_ADMIN', 'DOKTER', 'PERAWAT'];
const CAN_READ  = ['SUPER_ADMIN', 'DOKTER', 'PERAWAT', 'KASIR'];

const addAlatSchema = z.object({
  peralatanId:  z.string().min(1, 'Peralatan wajib dipilih'),
  dipakaiOleh:  z.string().max(100).optional().nullable(),
  jumlah:       z.number().int().min(1).max(99).default(1),
  catatan:      z.string().max(300).optional().nullable(),
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

    const data = await prisma.penggunaanAlat.findMany({
      where:   { kunjunganId: id },
      include: {
        peralatan: {
          select: { id: true, kode: true, nama: true, merk: true, tarif: true },
        },
      },
      orderBy: { waktuMulai: 'asc' },
    });

    return NextResponse.json(data);
  } catch (err: unknown) {
    console.error('[GET /kunjungan/[id]/alat]', err);
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
    const parsed = addAlatSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validasi gagal', details: parsed.error.flatten() }, { status: 400 });
    }

    const prisma = await getPrisma();

    const kunjungan = await prisma.kunjungan.findUnique({
      where:  { id: kunjunganId },
      select: { id: true, poliId: true, billing: { select: { status: true } } },
    });
    if (!kunjungan) return NextResponse.json({ error: 'Kunjungan tidak ditemukan' }, { status: 404 });
    if (kunjungan.billing && ['LUNAS', 'SEBAGIAN'].includes(kunjungan.billing.status)) {
      return NextResponse.json({ error: 'Billing sudah dibayar' }, { status: 422 });
    }

    const poliId = kunjungan.poliId ?? '';

    // Gabungkan jumlah + catatan
    const catatanKombinasi = [
      `Qty: ${parsed.data.jumlah}`,
      parsed.data.catatan,
    ].filter(Boolean).join(' | ') || null;

    const result = await prisma.penggunaanAlat.create({
      data: {
        peralatanId:  parsed.data.peralatanId,
        poliId,
        kunjunganId,
        dipakaiOleh:  parsed.data.dipakaiOleh ?? null,
        catatan:      catatanKombinasi,
        waktuMulai:   new Date(),
      },
      include: {
        peralatan: {
          select: { id: true, kode: true, nama: true, merk: true, tarif: true },
        },
      },
    });

    return NextResponse.json(result, { status: 201 });
  } catch (err: unknown) {
    console.error('[POST /kunjungan/[id]/alat]', err);
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Server error' }, { status: 500 });
  }
}
