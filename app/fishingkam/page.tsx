import { Metadata } from 'next';
import FishingKamClient from './_FishingKamClient';

export const metadata: Metadata = {
  title: 'Камчатская рыбалка — партнёр TourHab | Рыболовные туры',
  description: 'Рыболовные туры на реке Камчатка от партнёра TourHab. Лицензионный участок №1182, площадь 365 га. Чавыча, кижуч, нерка, хариус, микижа. Зимняя и летняя рыбалка от 15 000 ₽/сутки.',
  keywords: ['рыбалка Камчатка', 'рыболовный тур', 'чавыча', 'кижуч', 'нерка', 'хариус', 'река Камчатка', 'tourhab', 'партнёр'],
  openGraph: {
    type: 'website',
    locale: 'ru_RU',
    url: 'https://tourhab.ru/fishingkam',
    siteName: 'TourHab',
    title: 'Камчатская рыбалка — партнёр TourHab',
    description: 'Рыболовные туры на реке Камчатка. Лицензионный участок №1182. Зимняя и летняя рыбалка.',
    images: [{ url: '/images/fishingkam/2025-01-27_142444.jpg', width: 1200, height: 630 }],
  },
  robots: { index: true, follow: true },
};

export default function FishingKamPage() {
  return <FishingKamClient />;
}
