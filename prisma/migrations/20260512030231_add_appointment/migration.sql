-- CreateEnum
CREATE TYPE "StatusAppointment" AS ENUM ('BOOKED', 'CHECKED_IN', 'CANCELLED');

-- CreateEnum
CREATE TYPE "TipePenjamin" AS ENUM ('UMUM', 'BPJS', 'ASURANSI');

-- AlterTable
ALTER TABLE "kunjungan" ADD COLUMN     "penjamin" "TipePenjamin";

-- CreateTable
CREATE TABLE "appointment" (
    "id" TEXT NOT NULL,
    "kodeBooking" TEXT NOT NULL,
    "pasienId" TEXT,
    "namaPasien" TEXT,
    "nikSementara" TEXT,
    "noHP" TEXT,
    "dokterProfileId" TEXT NOT NULL,
    "jadwalPraktekId" TEXT NOT NULL,
    "tanggalPraktek" TIMESTAMP(3) NOT NULL,
    "keluhan" TEXT,
    "catatan" TEXT,
    "penjamin" "TipePenjamin" NOT NULL DEFAULT 'UMUM',
    "status" "StatusAppointment" NOT NULL DEFAULT 'BOOKED',
    "kunjunganId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "appointment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "appointment_kodeBooking_key" ON "appointment"("kodeBooking");

-- CreateIndex
CREATE UNIQUE INDEX "appointment_kunjunganId_key" ON "appointment"("kunjunganId");

-- AddForeignKey
ALTER TABLE "appointment" ADD CONSTRAINT "appointment_pasienId_fkey" FOREIGN KEY ("pasienId") REFERENCES "pasien"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointment" ADD CONSTRAINT "appointment_dokterProfileId_fkey" FOREIGN KEY ("dokterProfileId") REFERENCES "dokter_profile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointment" ADD CONSTRAINT "appointment_jadwalPraktekId_fkey" FOREIGN KEY ("jadwalPraktekId") REFERENCES "jadwal_praktek"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointment" ADD CONSTRAINT "appointment_kunjunganId_fkey" FOREIGN KEY ("kunjunganId") REFERENCES "kunjungan"("id") ON DELETE SET NULL ON UPDATE CASCADE;
