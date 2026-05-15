import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getPrisma } from '@/lib/prisma';
import { z } from 'zod';

const CAN_ACCESS = ['SUPER_ADMIN', 'KASIR'];

const closeShiftSchema = z.object({
  uangFisikAkhir: z.number().min(0, 'Uang fisik tidak boleh negatif'),
  catatan:        z.string().max(500).optional().nullable(),
});

export async function PATCH(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user)                           return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!CAN_ACCESS.includes(session.user.role))  return NextResponse.json({ error: 'Forbidden' },   { status: 403 });

    const body   = await req.json();
    const parsed = closeShiftSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validasi gagal', details: parsed.error.flatten() }, { status: 400 });
    }

    const prisma = await getPrisma();

    const shift = await prisma.shiftKasir.findFirst({
      where: { kasirId: session.user.id, status: 'OPEN' },
    });
    if (!shift) {
      return NextResponse.json({ error: 'Tidak ada shift aktif yang dapat ditutup' }, { status: 404 });
    }

    // Compute totals for closing report
    const pembayaran = await prisma.pembayaran.findMany({
      where:  { shiftId: shift.id },
      select: { jumlah: true, metode: true },
    });

    const totalTunai   = pembayaran.filter(p => p.metode === 'TUNAI').reduce((s, p) => s + p.jumlah, 0);
    const totalNonTunai = pembayaran
      .filter(p => ['TRANSFER', 'KARTU_DEBIT', 'KARTU_KREDIT'].includes(p.metode))
      .reduce((s, p) => s + p.jumlah, 0);
    const totalPiutang = pembayaran
      .filter(p => ['BPJS', 'ASURANSI'].includes(p.metode))
      .reduce((s, p) => s + p.jumlah, 0);

    const totalSistem = totalTunai + shift.modalAwal;
    const selisih     = parsed.data.uangFisikAkhir - totalSistem;

    const closed = await prisma.shiftKasir.update({
      where: { id: shift.id },
      data: {
        uangFisikAkhir: parsed.data.uangFisikAkhir,
        catatan:        parsed.data.catatan ?? null,
        status:         'CLOSED',
        closeAt:        new Date(),
      },
    });

    return NextResponse.json({
      data: closed,
      laporan: {
        modalAwal:      shift.modalAwal,
        totalTunai,
        totalNonTunai,
        totalPiutang,
        uangSistem:     totalSistem,
        uangFisikAkhir: parsed.data.uangFisikAkhir,
        selisih,
      },
    });
  } catch (err: unknown) {
    console.error('[PATCH /api/billing/shift/close]', err);
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Server error' }, { status: 500 });
  }
}
