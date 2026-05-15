import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getPrisma } from '@/lib/prisma';
import { z } from 'zod';

const cancelSchema = z.object({
  cancelReason:    z.string().min(5, 'Alasan pembatalan wajib diisi minimal 5 karakter').max(500),
  superAdminPassword: z.string().optional(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // Only Super Admin can cancel
    if (session.user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({
        error: 'Hanya Super Admin yang dapat membatalkan billing yang sudah tersimpan',
      }, { status: 403 });
    }

    const { id: billingId } = await params;
    const body   = await req.json();
    const parsed = cancelSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validasi gagal', details: parsed.error.flatten() }, { status: 400 });
    }

    const prisma = await getPrisma();

    const billing = await prisma.billing.findUnique({
      where: { id: billingId },
    });
    if (!billing) return NextResponse.json({ error: 'Billing tidak ditemukan' }, { status: 404 });
    if (billing.status === 'DIBATALKAN') {
      return NextResponse.json({ error: 'Billing sudah dibatalkan sebelumnya' }, { status: 422 });
    }

    const updated = await prisma.billing.update({
      where: { id: billingId },
      data:  {
        status:         'DIBATALKAN',
        cancelledById:  session.user.id,
        cancelReason:   parsed.data.cancelReason,
      },
    });

    return NextResponse.json({
      data:    updated,
      message: 'Billing berhasil dibatalkan',
    });
  } catch (err: unknown) {
    console.error('[POST /api/billing/[id]/cancel]', err);
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Server error' }, { status: 500 });
  }
}
