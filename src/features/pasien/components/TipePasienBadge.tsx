import { Badge } from '@/components/ui/badge';
import { Globe, Flag } from 'lucide-react';

export function TipePasienBadge({ tipe }: { tipe: 'WNI' | 'WNA' }) {
  return tipe === 'WNI' ? (
    <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100 gap-1 dark:bg-blue-900/30 dark:text-blue-300">
      <Flag className="h-3 w-3" /> WNI
    </Badge>
  ) : (
    <Badge className="bg-purple-100 text-purple-800 hover:bg-purple-100 gap-1 dark:bg-purple-900/30 dark:text-purple-300">
      <Globe className="h-3 w-3" /> WNA
    </Badge>
  );
}
