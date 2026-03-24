import type { Metadata } from 'next';
import GuideEarningsPageClient from './_GuideEarningsPageClient';

export const metadata: Metadata = {
  title: 'Доходы | Гид | Tourhab',
  description: 'Статистика и аналитика доходов гида',
  robots: 'noindex, nofollow',
};

export default function GuideEarningsPage() {
  return <GuideEarningsPageClient />;
}
