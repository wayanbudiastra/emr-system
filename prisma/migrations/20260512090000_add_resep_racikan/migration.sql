-- AlterEnum
ALTER TYPE "StatusResep" ADD VALUE 'DIBATALKAN';

-- CreateEnum
CREATE TYPE "MetodeRacikan" AS ENUM ('PUYER', 'KAPSUL', 'SALEP');

-- CreateTable
CREATE TABLE "racikan_header" (
    "id" TEXT NOT NULL,
    "resepId" TEXT NOT NULL,
    "namaRacikan" TEXT NOT NULL,
    "metode" "MetodeRacikan" NOT NULL DEFAULT 'PUYER',
    "jumlahSediaan" INTEGER NOT NULL,
    "aturanPakai" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "racikan_header_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "racikan_bahan" (
    "id" TEXT NOT NULL,
    "racikanHeaderId" TEXT NOT NULL,
    "obatId" TEXT NOT NULL,
    "jumlah" DOUBLE PRECISION NOT NULL,
    "satuan" TEXT,

    CONSTRAINT "racikan_bahan_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "racikan_header" ADD CONSTRAINT "racikan_header_resepId_fkey" FOREIGN KEY ("resepId") REFERENCES "resep"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "racikan_bahan" ADD CONSTRAINT "racikan_bahan_racikanHeaderId_fkey" FOREIGN KEY ("racikanHeaderId") REFERENCES "racikan_header"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "racikan_bahan" ADD CONSTRAINT "racikan_bahan_obatId_fkey" FOREIGN KEY ("obatId") REFERENCES "obat"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
