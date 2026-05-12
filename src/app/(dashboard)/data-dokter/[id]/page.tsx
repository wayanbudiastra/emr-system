import { DokterDetailClient } from './DokterDetailClient';

interface Props { params: Promise<{ id: string }> }

export default async function DokterDetailPage({ params }: Props) {
  const { id } = await params;
  return <DokterDetailClient id={id} />;
}
