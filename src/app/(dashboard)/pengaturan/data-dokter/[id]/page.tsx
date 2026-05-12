import { Suspense }        from 'react';
import { Skeleton }         from '@/components/ui/skeleton';
import { DokterDetailClient } from './DokterDetailClient';

interface Props { params: Promise<{ id: string }> }

async function PageContent({ params }: Props) {
  const { id } = await params;
  return <DokterDetailClient id={id} />;
}

export default function DokterDetailPage(props: Props) {
  return (
    <Suspense
      fallback={
        <div className="space-y-6">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-64 w-full" />
        </div>
      }
    >
      <PageContent {...props} />
    </Suspense>
  );
}
