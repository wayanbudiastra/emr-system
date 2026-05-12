import { Suspense }   from 'react';
import { Skeleton }   from '@/components/ui/skeleton';
import { PemeriksaanDetailClient } from './PemeriksaanDetailClient';

interface Props { params: Promise<{ id: string }> }

async function PageContent({ params }: Props) {
  const { id } = await params;
  return <PemeriksaanDetailClient id={id} />;
}

export default function PemeriksaanDetailPage(props: Props) {
  return (
    <Suspense fallback={
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-80 w-full" />
      </div>
    }>
      <PageContent {...props} />
    </Suspense>
  );
}
