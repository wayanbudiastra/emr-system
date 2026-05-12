import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

interface Props {
  kategori:   string;
  persentase: number;
}

const KATEGORI_COLOR: Record<string, string> = {
  TINDAKAN:  '[&>div]:bg-blue-500',
  LAB:       '[&>div]:bg-green-500',
  RADIOLOGI: '[&>div]:bg-purple-500',
  PERALATAN: '[&>div]:bg-orange-500',
};

const KATEGORI_LABEL: Record<string, string> = {
  TINDAKAN:  'Tindakan',
  LAB:       'Laboratorium',
  RADIOLOGI: 'Radiologi',
  PERALATAN: 'Peralatan',
};

export function SharingFeeBar({ kategori, persentase }: Props) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-muted-foreground">{KATEGORI_LABEL[kategori] ?? kategori}</span>
        <span className="font-medium tabular-nums">{persentase}%</span>
      </div>
      <Progress value={persentase} className={cn('h-2', KATEGORI_COLOR[kategori])} />
    </div>
  );
}
