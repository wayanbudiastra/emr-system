import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { z } from 'zod';
import { getPrisma } from '@/lib/prisma';
import type { TipePenjamin } from '@prisma/client';

const updateSchema = z.object({
  penjamin:        z.enum(['UMUM', 'BPJS', 'ASURANSI']).optional(),
  keluhan:         z.string().max(500).optional().nullable(),
  catatan:         z.string().max(500).optional().nullable(),
  jadwalPraktekId: z.string().optional(),
  tanggalPraktek:  z.coerce.date().optional(),
});

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!['SUPER_ADMIN', 'ADMISSION'].includes(session.user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id } = await params;
  const body   = await req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Validasi gagal', details: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const prisma = await getPrisma();
    const appt   = await prisma.appointment.findUnique({ where: { id } });
    if (!appt) return NextResponse.json({ error: 'Appointment tidak ditemukan' }, { status: 404 });
    if (appt.status === 'CHECKED_IN') {
      return NextResponse.json({ error: 'Appointment yang sudah check-in tidak bisa diedit' }, { status: 422 });
    }
    if (appt.status === 'CANCELLED') {
      return NextResponse.json({ error: 'Appointment yang sudah dibatalkan tidak bisa diedit' }, { status: 422 });
    }

    // Validasi kuota jika jadwal diubah
    if (parsed.data.jadwalPraktekId && parsed.data.jadwalPraktekId !== appt.jadwalPraktekId) {
      const tanggal = parsed.data.tanggalPraktek ?? appt.tanggalPraktek;
      const start   = new Date(new Date(tanggal).setHours(0, 0, 0, 0));
      const end     = new Date(start); end.setDate(end.getDate() + 1);

      const [jadwal, terpakai] = await Promise.all([
        prisma.jadwalPraktek.findUnique({ where: { id: parsed.data.jadwalPraktekId } }),
        prisma.appointment.count({
          where: {
            jadwalPraktekId: parsed.data.jadwalPraktekId,
            tanggalPraktek:  { gte: start, lt: end },
            status:          { in: ['BOOKED', 'CHECKED_IN'] },
            id:              { not: id },
          },
        }),
      ]);

      if (!jadwal) return NextResponse.json({ error: 'Jadwal tidak ditemukan' }, { status: 404 });
      if (terpakai >= jadwal.kuotaPasien) {
        return NextResponse.json({ error: `Kuota jadwal penuh (${jadwal.kuotaPasien} pasien)` }, { status: 422 });
      }
    }

    const result = await prisma.appointment.update({
      where: { id },
      data: {
        ...(parsed.data.penjamin        ? { penjamin:        parsed.data.penjamin as TipePenjamin } : {}),
        ...(parsed.data.keluhan !== undefined ? { keluhan: parsed.data.keluhan } : {}),
        ...(parsed.data.catatan !== undefined ? { catatan: parsed.data.catatan } : {}),
        ...(parsed.data.jadwalPraktekId ? { jadwalPraktekId: parsed.data.jadwalPraktekId } : {}),
        ...(parsed.data.tanggalPraktek  ? { tanggalPraktek:  parsed.data.tanggalPraktek }  : {}),
      },
      include: {
        pasien:        { select: { id: true, nomorRM: true, nama: true } },
        dokterProfile: { select: { id: true, spesialisasi: true, user: { select: { nama: true } } } },
        jadwalPraktek: { select: { id: true, hari: true, jamMulai: true, jamSelesai: true } },
      },
    });

    return NextResponse.json(result);
  } catch (err: unknown) {
    return NextResponse.json({ error: (err as Error).message }, { status: 422 });
  }
}
