import { Badge } from '@/components/ui/badge';
import { ShieldCheck, ShieldAlert, ShieldX, Shield } from 'lucide-react';
import { getSIPStatus } from '../utils/sip-status';

interface Props { tglExpired?: Date | string | null }

export function SIPStatusBadge({ tglExpired }: Props) {
  const date = tglExpired ? new Date(tglExpired) : null;
  const { status, sisaHari } = getSIPStatus(date);

  if (status === 'TIDAK_ADA') return (
    <Badge variant="outline" className="gap-1 text-muted-foreground">
      <Shield className="h-3 w-3" /> Belum diisi
    </Badge>
  );

  if (status === 'EXPIRED') return (
    <Badge className="bg-red-100 text-red-800 gap-1 border-red-200">
      <ShieldX className="h-3 w-3" /> SIP Expired
    </Badge>
  );

  if (status === 'SEGERA_EXPIRED') return (
    <Badge className="bg-yellow-100 text-yellow-800 gap-1 border-yellow-200">
      <ShieldAlert className="h-3 w-3" /> Expired {sisaHari} hari lagi
    </Badge>
  );

  return (
    <Badge className="bg-green-100 text-green-800 gap-1 border-green-200">
      <ShieldCheck className="h-3 w-3" /> Aktif ({sisaHari} hari)
    </Badge>
  );
}
