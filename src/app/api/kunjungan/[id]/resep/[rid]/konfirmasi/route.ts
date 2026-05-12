import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getPrisma } from '@/lib/prisma';

export async function PATCH(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; rid: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!['SUPER_ADMIN', 'APOTEKER'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Hanya Apoteker yang dapat mengkonfirmasi resep' }, { status: 403 });
    }

    const { id: kunjunganId, rid: resepId } = await params;
    const prisma = await getPrisma();

    const resep = await prisma.resep.findUnique({
      where:   { id: resepId },
      include: {
        items: {
          include: { obat: { select: { id: true, nama: true, stok: true } } },
        },
        racikanHeaders: {
          include: {
            bahan: {
              include: { obat: { select: { id: true, nama: true, stok: true } } },
            },
          },
        },
        kunjungan: {
          select: {
            id: true,
            penjamin: true,
            billing: { select: { id: true, totalTagihan: true, sisa: true } },
          },
        },
      },
    });

    if (!resep || resep.kunjunganId !== kunjunganId) {
      return NextResponse.json({ error: 'Resep tidak ditemukan' }, { status: 404 });
    }
    if (['SIAP', 'DIAMBIL'].includes(resep.status)) {
      return NextResponse.json({ error: 'Resep sudah dikonfirmasi sebelumnya' }, { status: 422 });
    }
    if (resep.status === 'DIBATALKAN') {
      return NextResponse.json({ error: 'Resep telah dibatalkan' }, { status: 422 });
    }

    // Validate stok for non-racikan items
    for (const item of resep.items) {
      if (item.obat.stok < item.jumlah) {
        return NextResponse.json({
          error: `Stok ${item.obat.nama} tidak cukup (tersedia: ${item.obat.stok}, dibutuhkan: ${item.jumlah})`,
        }, { status: 422 });
      }
    }

    // Validate stok for racikan bahan
    for (const header of resep.racikanHeaders) {
      for (const bahan of header.bahan) {
        if (bahan.obat.stok < bahan.jumlah) {
          return NextResponse.json({
            error: `Stok ${bahan.obat.nama} (racikan ${header.namaRacikan}) tidak cukup (tersedia: ${bahan.obat.stok}, dibutuhkan: ${bahan.jumlah})`,
          }, { status: 422 });
        }
      }
    }

    const isBPJS  = resep.kunjungan.penjamin === 'BPJS';

    // Collect all stock deductions
    const stokUpdates: Array<{ id: string; jumlah: number }> = [];
    for (const item of resep.items) {
      stokUpdates.push({ id: item.obatId, jumlah: item.jumlah });
    }
    for (const header of resep.racikanHeaders) {
      for (const bahan of header.bahan) {
        const existing = stokUpdates.find(u => u.id === bahan.obatId);
        if (existing) existing.jumlah += bahan.jumlah;
        else stokUpdates.push({ id: bahan.obatId, jumlah: bahan.jumlah });
      }
    }

    // Calculate billing amount for obat
    const itemsWithPrice = await prisma.itemResep.findMany({
      where:   { resepId },
      include: { obat: { select: { harga: true, hargaBPJS: true } } },
    });
    const bahanWithPrice = await prisma.racikanBahan.findMany({
      where:   { racikanHeader: { resepId } },
      include: { obat: { select: { harga: true, hargaBPJS: true } } },
    });

    const totalResep =
      itemsWithPrice.reduce((s, i) => {
        const h = isBPJS ? (i.obat.hargaBPJS ?? i.obat.harga) : i.obat.harga;
        return s + h * i.jumlah;
      }, 0) +
      bahanWithPrice.reduce((s, b) => {
        const h = isBPJS ? (b.obat.hargaBPJS ?? b.obat.harga) : b.obat.harga;
        return s + h * b.jumlah;
      }, 0);

    void totalObat; // not used, replaced by totalResep

    // Execute in transaction: deduct stok + confirm resep + upsert billing
    await prisma.$transaction(async (tx) => {
      // Deduct stok
      for (const u of stokUpdates) {
        await tx.obat.update({
          where: { id: u.id },
          data:  { stok: { decrement: Math.ceil(u.jumlah) } },
        });
      }

      // Confirm resep
      await tx.resep.update({
        where: { id: resepId },
        data:  { status: 'SIAP' },
      });

      // Upsert billing
      if (resep.kunjungan.billing) {
        await tx.billing.update({
          where: { kunjunganId },
          data: {
            totalTagihan: { increment: totalResep },
            sisa:         { increment: totalResep },
          },
        });
      } else {
        const nomorInvoice = `INV-${Date.now()}`;
        await tx.billing.create({
          data: {
            kunjunganId,
            nomorInvoice,
            totalTagihan: totalResep,
            totalBayar:   0,
            sisa:         totalResep,
            status:       'BELUM_BAYAR',
          },
        });
      }
    });

    return NextResponse.json({ success: true, message: 'Resep dikonfirmasi — stok dipotong & billing diperbarui' });
  } catch (err: unknown) {
    console.error('[PATCH /kunjungan/[id]/resep/[rid]/konfirmasi]', err);
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Server error' }, { status: 500 });
  }
}
