import { UserPlus, ChevronLeft } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { PasienForm } from '@/features/pasien/components/PasienForm';

export default function TambahPasienPage() {
  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" className="shrink-0" nativeButton={false} render={<Link href="/pasien" />}>
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <UserPlus className="h-6 w-6 text-primary" />
            Daftarkan Pasien Baru
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Isi data demografi pasien dengan lengkap dan benar
          </p>
        </div>
      </div>

      <PasienForm mode="create" />
    </div>
  );
}
