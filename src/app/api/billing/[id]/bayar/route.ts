import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getPrisma } from '@/lib/prisma';
import { z } from 'zod';

const CAN_WRITE = ['SUPER_ADMIN', 'KASIR'];

const bayarSchema = z.object({
  metode:        z.enum(['TUNAI', 'TRANSFER', 'BPJS', 'ASURANSI', 'KARTU_DEBIT', 'KARTU_KREDIT']),
  jumlahDibayar: z.number().min(0).optional(),
  namaBank:      z.string().max(100).optional().nullable(),
  tipeKartu:     z.string().max(50).optional().nullable(),
  referensi:     z.string().max(200).optional().nullable(),
  shiftId:       z.string().optional().nullable(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user)                          return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!CAN_WRITE.includes(session.user.role))  return NextResponse.json({ error: 'Forbidden' },   { status: 403 });

    const { id: billingId } = await params;
    const body   = await req.json();
    const parsed = bayarSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validasi gagal', details: parsed.error.flatten() }, { status: 400 });
    }

    const prisma = await getPrisma();

    const billing = await prisma.billing.findUnique({
      where:   { id: billingId },
      include: {
        kunjungan: {
          select: {
            id:    true,
            resep: { select: { id: true, status: true } },
          },
        },
      },
    });

    if (!billing) return NextResponse.json({ error: 'Billing tidak ditemukan' }, { status: 404 });
    if (billing.status === 'LUNAS') {
      return NextResponse.json({ error: 'Billing sudah lunas' }, { status: 422 });
    }
    if (billing.status === 'DIBATALKAN') {
      return NextResponse.json({ error: 'Billing telah dibatalkan' }, { status: 422 });
    }

    // Validate no pending pharmacy
    const pendingResep = billing.kunjungan.resep.filter(r =>
      ['MENUNGGU', 'DIPROSES'].includes(r.status),
    );
    if (pendingResep.length > 0) {
      return NextResponse.json({
        error: `Terdapat ${pendingResep.length} resep yang belum dikonfirmasi apoteker. Harap selesaikan dahulu di modul Farmasi.`,
      }, { status: 422 });
    }

    const { metode, jumlahDibayar, namaBank, tipeKartu, referensi, shiftId } = parsed.data;
    const sisaTagihan = billing.sisa;

    // BPJS/ASURANSI: full amount as piutang
    const isPiutang = ['BPJS', 'ASURANSI'].includes(metode);
    const jumlahBayar = isPiutang ? sisaTagihan : (jumlahDibayar ?? sisaTagihan);

    if (!isPiutang && jumlahBayar < sisaTagihan) {
      return NextResponse.json({
        error: `Jumlah pembayaran (${jumlahBayar}) kurang dari sisa tagihan (${sisaTagihan})`,
      }, { status: 422 });
    }

    const kembalian     = metode === 'TUNAI' ? Math.max(0, jumlahBayar - sisaTagihan) : 0;
    const jumlahDiterima = Math.min(jumlahBayar, sisaTagihan);

    const newTotalBayar = billing.totalBayar + jumlahDiterima;
    const newSisa       = Math.max(0, billing.totalTagihan - newTotalBayar);
    const newStatus     = newSisa <= 0 ? 'LUNAS' : 'SEBAGIAN';

    await prisma.$transaction(async (tx) => {
      await tx.pembayaran.create({
        data: {
          billingId,
          shiftId:       shiftId ?? null,
          jumlah:        jumlahDiterima,
          metode,
          namaBank:      namaBank ?? null,
          tipeKartu:     tipeKartu ?? null,
          referensi:     referensi ?? null,
          jumlahDibayar: jumlahBayar,
          kembalian,
        },
      });

      await tx.billing.update({
        where: { id: billingId },
        data:  {
          totalBayar: newTotalBayar,
          sisa:       newSisa,
          status:     newStatus,
        },
      });
    });

    const updated = await prisma.billing.findUnique({
      where:   { id: billingId },
      include: {
        items:     { orderBy: { createdAt: 'asc' } },
        pembayaran: { orderBy: { createdAt: 'asc' } },
      },
    });

    return NextResponse.json({
      data:      updated,
      kembalian,
      message:   newStatus === 'LUNAS' ? 'Pembayaran berhasil — billing lunas' : 'Pembayaran diterima sebagian',
    });
  } catch (err: unknown) {
    console.error('[POST /api/billing/[id]/bayar]', err);
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Server error' }, { status: 500 });
  }
}
