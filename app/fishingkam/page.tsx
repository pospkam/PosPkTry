import { Metadata } from 'next';
import FishingKamClient from './_FishingKamClient';

export const metadata: Metadata = {
  metadataBase: new URL('https://fishingkam.ru'),
  title: 'Камчатская рыбалка — Рыболовные туры на реке Камчатка',
  description: 'Рыболовные туры на реке Камчатка. Лицензионный участок №1182, площадь 365 га, длина 21.5 км. Чавыча, кижуч, нерка, хариус, микижа. Зимняя и летняя рыбалка от 15 000 ₽/сутки.',
  keywords: ['рыбалка Камчатка', 'рыболовный тур', 'чавыча', 'кижуч', 'нерка', 'хариус', 'река Камчатка', 'рыболовная база', 'зимняя рыбалка', 'летняя рыбалка'],
  openGraph: {
    type: 'website',
    locale: 'ru_RU',
    url: 'https://fishingkam.ru',
    siteName: 'Камчатская рыбалка',
    title: 'Камчатская рыбалка — Рыболовные туры на реке Камчатка',
    description: 'Рыболовные туры на реке Камчатка. Лицензионный участок №1182. Зимняя и летняя рыбалка.',
    images: [{ url: '/images/fishingkam/2025-01-27_142444.jpg', width: 1200, height: 630 }],
  },
  robots: { index: true, follow: true },
};

export default function FishingKamPage() {
  return <FishingKamClient />;
}
