import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { CollectionDetailClient } from './_CollectionDetailClient';

interface Props { params: Promise<{ slug: string }> }

async function fetchCollection(slug: string) {
  const base = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
  try {
    const res = await fetch(`${base}/api/collections/${slug}`, { next: { revalidate: 300 } });
    if (!res.ok) return null;
    return (await res.json()).collection;
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const col = await fetchCollection(slug);
  if (!col) return { title: 'Подборка не найдена' };
  return {
    title: `${col.title} | КамчатурХаб`,
    description: col.description ?? `Кураторская подборка «${col.title}»`,
    openGraph: {
      title: col.title,
      description: col.description ?? '',
      images: col.cover_image ? [col.cover_image] : [],
    },
  };
}

export default async function CollectionDetailPage({ params }: Props) {
  const { slug } = await params;
  const col = await fetchCollection(slug);
  if (!col) notFound();
  return <CollectionDetailClient collection={col} />;
}
