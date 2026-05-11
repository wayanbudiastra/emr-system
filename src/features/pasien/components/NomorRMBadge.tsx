import { Badge } from '@/components/ui/badge';
import { IdCard } from 'lucide-react';

export function NomorRMBadge({ nomorRM }: { nomorRM: string }) {
  return (
    <Badge variant="outline" className="font-mono gap-1.5">
      <IdCard className="h-3.5 w-3.5" />
      {nomorRM}
    </Badge>
  );
}
