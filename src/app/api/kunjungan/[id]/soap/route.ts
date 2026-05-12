import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getPrisma } from '@/lib/prisma';
import { z } from 'zod';

const CAN_READ  = ['SUPER_ADMIN', 'DOKTER', 'PERAWAT'];
const CAN_WRITE = ['SUPER_ADMIN', 'DOKTER'];

const icdItemSchema = z.object({
  kode:      z.string().min(1),
  deskripsi: z.string().min(1),
});

const soapSchema = z.object({
  subjektif: z.string().max(5000).optional().nullable(),
  objektif:  z.string().max(5000).optional().nullable(),
  asesmen:   z.string().max(3000).optional().nullable(),
  plan:      z.string().max(3000).optional().nullable(),
  icdCodes:  z.array(icdItemSchema).optional().default([]),
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

    const soap = await prisma.sOAPNote.findUnique({ where: { kunjunganId: id } });
    return NextResponse.json(soap ?? null);
  } catch (err: unknown) {
    console.error('[GET /kunjungan/[id]/soap]', err);
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

    const { id: kunjunganId } = await params;
    const body   = await req.json();
    const parsed = soapSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validasi gagal', details: parsed.error.flatten() }, { status: 400 });
    }

    // Validasi: minimal 1 kode ICD-10
    if (!parsed.data.icdCodes || parsed.data.icdCodes.length === 0) {
      return NextResponse.json(
        { error: 'Diagnosis wajib diisi — minimal satu kode ICD-10' },
        { status: 422 }
      );
    }

    const prisma = await getPrisma();

    // Pastikan kunjungan ada
    const kunjungan = await prisma.kunjungan.findUnique({
      where:  { id: kunjunganId },
      select: { id: true },
    });
    if (!kunjungan) return NextResponse.json({ error: 'Kunjungan tidak ditemukan' }, { status: 404 });

    const result = await prisma.sOAPNote.upsert({
      where:  { kunjunganId },
      create: {
        kunjunganId,
        subjektif: parsed.data.subjektif ?? null,
        objektif:  parsed.data.objektif  ?? null,
        asesmen:   parsed.data.asesmen   ?? null,
        plan:      parsed.data.plan      ?? null,
        icdCodes:  parsed.data.icdCodes,
      },
      update: {
        subjektif: parsed.data.subjektif ?? null,
        objektif:  parsed.data.objektif  ?? null,
        asesmen:   parsed.data.asesmen   ?? null,
        plan:      parsed.data.plan      ?? null,
        icdCodes:  parsed.data.icdCodes,
      },
    });

    return NextResponse.json(result);
  } catch (err: unknown) {
    console.error('[PUT /kunjungan/[id]/soap]', err);
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Server error' }, { status: 500 });
  }
}
