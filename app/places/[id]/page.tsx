import type { Metadata } from 'next';
import { query } from '@/lib/database';
import PlaceDetailClient from './_PlaceDetailClient';
import PlaceSOS from '@/components/places/PlaceSOS';

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  try {
    const result = await query(
      `SELECT p.name, p.essence, p.description, p.photo_url, p.location_type,
              (SELECT ai.image_url FROM ai_route_images ai WHERE ai.route_id = p.ark_id LIMIT 1) AS ai_photo
       FROM places p
       WHERE (p.ark_id::text = $1 OR p.id = $1) AND p.is_visible = true`,
      [id]
    );
    const r = result.rows[0];
    if (!r) return { title: 'Место не найдено | TourHab' };

    const desc = (r.essence as string | null) ??
      ((r.description as string | null)?.slice(0, 150) ?? 'Место на Камчатке');
    const imgUrl = (r.photo_url ?? r.ai_photo) as string | null;

    return {
      title: `${r.name} — место на Камчатке | TourHab`,
      description: desc,
      openGraph: {
        title: r.name as string,
        description: desc,
        ...(imgUrl ? { images: [{ url: imgUrl }] } : {}),
      },
    };
  } catch {
    return { title: 'Место на Камчатке | TourHab' };
  }
}

export default async function PlaceDetailPage({ params }: Props) {
  const { id } = await params;
  return (
    <>
      <PlaceDetailClient id={id} />
      <PlaceSOS />
    </>
  );
}
