import { Metadata } from 'next';
import OperatorProfileClient from './_OperatorProfileClient';

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? 'https://tourhab.ru';

  try {
    const res = await fetch(`${baseUrl}/api/operators/${slug}`, { next: { revalidate: 300 } });
    if (!res.ok) return { title: 'Оператор не найден' };
    const json = await res.json();
    if (!json.success) return { title: 'Оператор не найден' };
    const op = json.data;

    return {
      title: `${op.name} — партнёр TourHab`,
      description: op.shortDescription ?? op.description?.slice(0, 160) ?? '',
      openGraph: {
        title: `${op.name} — TourHab`,
        description: op.shortDescription ?? '',
        url: `${baseUrl}/operators/${slug}`,
        images: op.heroImage ? [{ url: op.heroImage }] : [],
      },
    };
  } catch {
    return { title: 'Партнёр TourHab' };
  }
}

export default async function OperatorProfilePage({ params }: PageProps) {
  const { slug } = await params;
  return <OperatorProfileClient slug={slug} />;
}
