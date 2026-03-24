import type { Metadata } from 'next';
import { pool } from '@/lib/db-pool';
import { FishingPageClient } from './_FishingPageClient';

export const metadata: Metadata = {
  title: 'Рыбалка на Камчатке — туры от профессионалов | KamchatourHub',
  description: 'Рыболовные туры на Камчатке: лосось, кижуч, чавыча, нерка. Зимняя и летняя рыбалка на реке Камчатка. Профессиональные гиды, снаряжение включено. Бронирование онлайн.',
  keywords: ['рыбалка Камчатка', 'рыболовные туры Камчатка', 'рыбалка на лосося', 'рыбалка на реке Камчатка', 'рыбалка тур'],
  openGraph: {
    title: 'Рыбалка на Камчатке — туры от профессионалов',
    description: 'Лосось, кижуч, чавыча — рыбалка на реке Камчатка с профессиональными гидами.',
    type: 'website',
  },
};

interface FishingTour {
  id: number;
  title: string;
  short_description: string | null;
  description: string | null;
  base_price: number;
  duration_hours: number;
  max_participants: number;
  min_participants: number;
  difficulty: string | null;
  photos: string[];
  included: unknown;
  season_start: string | null;
  season_end: string | null;
  operator_name: string;
  operator_slug: string;
}

async function getFishingTours(): Promise<FishingTour[]> {
  const { rows } = await pool.query<FishingTour>(`
    SELECT
      ot.id, ot.title, ot.short_description, ot.description,
      ot.base_price::float, ot.duration_hours::float,
      ot.max_participants, ot.min_participants,
      ot.difficulty, ot.photos, ot.included,
      ot.season_start::text, ot.season_end::text,
      p.name AS operator_name, p.slug AS operator_slug
    FROM operator_tours ot
    JOIN partners p ON p.id = ot.operator_id
    WHERE ot.activity_type = 'fishing'
      AND ot.is_active  = true
      AND ot.is_published = true
      AND ot.deleted_at IS NULL
    ORDER BY ot.base_price ASC
  `);
  return rows;
}

export default async function FishingPage() {
  const tours = await getFishingTours();
  return <FishingPageClient tours={tours} />;
}
