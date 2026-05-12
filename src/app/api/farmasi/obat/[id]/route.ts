import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getPrisma } from '@/lib/prisma';
import { z } from 'zod';

const CAN_WRITE = ['SUPER_ADMIN', 'APOTEKER'];

const updateObatSchema = z.object({
  barcode:     z.string().optional().nullable(),
  nama:        z.string().min(2).optional(),
  generik:     z.string().optional().nullable(),
  jenisBarang: z.enum(['OBAT', 'ALKES']).optional(),
  satuan:      z.string().min(1).optional(),
  satuanBesar: z.string().optional().nullable(),
  isPaten:     z.boolean().optional(),
  stok:        z.number().int().min(0).optional(),
  minStock:    z.number().int().min(0).optional(),
  maxStock:    z.number().int().min(0).optional().nullable(),
  harga:       z.number().min(0).optional(),
  hargaBPJS:   z.number().min(0).optional().nullable(),
  hargaBeli:   z.number().min(0).optional().nullable(),
  kategori:    z.string().optional().nullable(),
  isActive:    z.boolean().optional(),
  expiredDate: z.coerce.date().optional().nullable(),
});

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const prisma  = await getPrisma();
    const obat    = await prisma.obat.findUnique({ where: { id } });
    if (!obat) return NextResponse.json({ error: 'Obat tidak ditemukan' }, { status: 404 });
    return NextResponse.json(obat);
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Server error' }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user)                            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!CAN_WRITE.includes(session.user.role))    return NextResponse.json({ error: 'Forbidden' },   { status: 403 });

    const { id } = await params;
    const body    = await req.json();
    const parsed  = updateObatSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validasi gagal', details: parsed.error.flatten() }, { status: 400 });
    }

    const prisma = await getPrisma();
    const result = await prisma.obat.update({ where: { id }, data: parsed.data });
    return NextResponse.json(result);
  } catch (err: unknown) {
    console.error('[PUT /api/farmasi/obat/[id]]', err);
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Server error' }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user)                            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (session.user.role !== 'SUPER_ADMIN')       return NextResponse.json({ error: 'Forbidden' },   { status: 403 });

    const { id } = await params;
    const prisma  = await getPrisma();

    const obat = await prisma.obat.findUnique({ where: { id }, include: { itemResep: { take: 1 } } });
    if (!obat) return NextResponse.json({ error: 'Obat tidak ditemukan' }, { status: 404 });
    if (obat.itemResep.length > 0) {
      return NextResponse.json({ error: 'Tidak bisa hapus — obat sudah digunakan dalam resep' }, { status: 422 });
    }

    await prisma.obat.delete({ where: { id } });
    return NextResponse.json({ message: 'Obat berhasil dihapus' });
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Server error' }, { status: 500 });
  }
}
