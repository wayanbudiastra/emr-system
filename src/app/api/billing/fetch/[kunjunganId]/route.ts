import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getPrisma } from '@/lib/prisma';

const CAN_ACCESS = ['SUPER_ADMIN', 'KASIR'];

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ kunjunganId: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user)                           return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!CAN_ACCESS.includes(session.user.role))  return NextResponse.json({ error: 'Forbidden' },   { status: 403 });

    const { kunjunganId } = await params;
    const prisma = await getPrisma();

    const kunjungan = await prisma.kunjungan.findUnique({
      where:   { id: kunjunganId },
      include: {
        pasien:         { select: { id: true, nomorRM: true, nama: true, tanggalLahir: true, jenisKelamin: true } },
        poli:           { select: { nama: true } },
        dokterProfile:  { select: { user: { select: { nama: true } } } },
        tindakan: {
          include: { masterTindakan: { select: { id: true, nama: true, tarif: true, tarifBPJS: true, kategori: true } } },
        },
        permintaanPenunjang: {
          where:   { status: 'SELESAI' },
          include: { itemPenunjang: { select: { id: true, nama: true, tarif: true, tarifBPJS: true, kategori: true } } },
        },
        resep: {
          where: { status: { in: ['SIAP', 'DIAMBIL'] } },
          include: {
            items: {
              include: { obat: { select: { id: true, nama: true, harga: true, hargaBPJS: true } } },
            },
            racikanHeaders: {
              include: {
                bahan: {
                  include: { obat: { select: { id: true, nama: true, harga: true, hargaBPJS: true } } },
                },
              },
            },
          },
        },
        billing: { include: { items: true, pembayaran: true } },
      },
    });

    if (!kunjungan) {
      return NextResponse.json({ error: 'Kunjungan tidak ditemukan' }, { status: 404 });
    }

    if (kunjungan.billing?.status === 'LUNAS' || kunjungan.billing?.status === 'DIBATALKAN') {
      return NextResponse.json({
        error: `Billing sudah berstatus ${kunjungan.billing.status} dan tidak dapat diubah`,
      }, { status: 422 });
    }

    const isBPJS = kunjungan.penjamin === 'BPJS';

    // Build clinical billing items
    type NewItem = {
      kategori:    'REGISTRASI' | 'TINDAKAN' | 'LAB' | 'RADIOLOGI' | 'PERALATAN' | 'FARMASI' | 'ADMINISTRASI';
      namaItem:    string;
      jumlah:      number;
      hargaSatuan: number;
      isObat:      boolean;
      refId:       string;
    };

    const clinicalItems: NewItem[] = [];

    // Tindakan
    for (const t of kunjungan.tindakan) {
      const harga = isBPJS ? (t.masterTindakan.tarifBPJS ?? t.masterTindakan.tarif) : t.masterTindakan.tarif;
      const kat   = t.masterTindakan.kategori as string;
      clinicalItems.push({
        kategori:    kat === 'LAB' ? 'LAB' : kat === 'RADIOLOGI' ? 'RADIOLOGI' : kat === 'PERALATAN' ? 'PERALATAN' : 'TINDAKAN',
        namaItem:    t.masterTindakan.nama,
        jumlah:      t.jumlah,
        hargaSatuan: harga,
        isObat:      false,
        refId:       `tindakan:${t.id}`,
      });
    }

    // Penunjang
    for (const p of kunjungan.permintaanPenunjang) {
      const harga = isBPJS ? (p.itemPenunjang.tarifBPJS ?? p.itemPenunjang.tarif) : p.itemPenunjang.tarif;
      const kat   = p.itemPenunjang.kategori as string;
      clinicalItems.push({
        kategori:    kat === 'RADIOLOGI' ? 'RADIOLOGI' : 'LAB',
        namaItem:    p.itemPenunjang.nama,
        jumlah:      p.jumlah,
        hargaSatuan: harga,
        isObat:      false,
        refId:       `penunjang:${p.id}`,
      });
    }

    // Resep obat confirmed
    for (const resep of kunjungan.resep) {
      for (const item of resep.items) {
        const harga = isBPJS ? (item.obat.hargaBPJS ?? item.obat.harga) : item.obat.harga;
        clinicalItems.push({
          kategori:    'FARMASI',
          namaItem:    item.obat.nama,
          jumlah:      item.jumlah,
          hargaSatuan: harga,
          isObat:      true,
          refId:       `item_resep:${item.id}`,
        });
      }
      for (const racikan of resep.racikanHeaders) {
        const totalBahan = racikan.bahan.reduce((s, b) => {
          const h = isBPJS ? (b.obat.hargaBPJS ?? b.obat.harga) : b.obat.harga;
          return s + h * b.jumlah;
        }, 0);
        clinicalItems.push({
          kategori:    'FARMASI',
          namaItem:    `Racikan: ${racikan.namaRacikan}`,
          jumlah:      racikan.jumlahSediaan,
          hargaSatuan: totalBahan / Math.max(racikan.jumlahSediaan, 1),
          isObat:      true,
          refId:       `racikan:${racikan.id}`,
        });
      }
    }

    await prisma.$transaction(async (tx) => {
      let billingId: string;

      if (!kunjungan.billing) {
        const nomorInvoice = `INV-${Date.now()}`;
        const created = await tx.billing.create({
          data: {
            kunjunganId,
            nomorInvoice,
            totalTagihan: 0,
            totalBayar:   0,
            sisa:         0,
            diskonGlobal: 0,
            status:       'BELUM_BAYAR',
          },
        });
        billingId = created.id;
      } else {
        billingId = kunjungan.billing.id;
      }

      // Delete existing clinical items (non-ADMINISTRASI)
      await tx.billingItem.deleteMany({
        where: { billingId, kategori: { not: 'ADMINISTRASI' } },
      });

      // Recreate clinical items
      if (clinicalItems.length > 0) {
        await tx.billingItem.createMany({
          data: clinicalItems.map(i => ({ ...i, billingId, diskonItem: 0 })),
        });
      }

      // Recompute totals
      const allItems = await tx.billingItem.findMany({ where: { billingId } });
      const billing  = await tx.billing.findUnique({ where: { id: billingId } });
      const diskon   = billing?.diskonGlobal ?? 0;

      const subtotal    = allItems.reduce((s, i) => s + (i.hargaSatuan * i.jumlah - i.diskonItem), 0);
      const totalTagihan = Math.max(0, subtotal - diskon);

      await tx.billing.update({
        where: { id: billingId },
        data:  {
          totalTagihan,
          sisa: Math.max(0, totalTagihan - (billing?.totalBayar ?? 0)),
        },
      });
    });

    // Return fresh billing data
    const billing = await prisma.billing.findUnique({
      where:   { kunjunganId },
      include: {
        items: { orderBy: { createdAt: 'asc' } },
        pembayaran: true,
        kunjungan: {
          select: {
            id:       true,
            tanggal:  true,
            penjamin: true,
            pasien:   { select: { id: true, nomorRM: true, nama: true, tanggalLahir: true, jenisKelamin: true } },
            poli:     { select: { nama: true } },
            dokterProfile: { select: { user: { select: { nama: true } } } },
          },
        },
      },
    });

    return NextResponse.json({ data: billing });
  } catch (err: unknown) {
    console.error('[GET /api/billing/fetch/[kunjunganId]]', err);
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Server error' }, { status: 500 });
  }
}
