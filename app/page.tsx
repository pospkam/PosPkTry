import { Metadata } from 'next';

import HomePageClient from './_HomePageClient';

export const metadata: Metadata = {
  title: 'Kamchatour — Туры на Камчатку | Рыбалка, Вулканы, Природа',
  description: 'Туры на Камчатку: рыбалка на лосося, восхождения на вулканы, горячие источники. Бронирование онлайн. AEO: лучшие туры Камчатки.',
  alternates: { canonical: 'https://kamchatourhub.ru/' },
  keywords: [
    'туры на Камчатку',
    'рыбалка Камчатка',
    'вулканы',
    'отдых на Камчатке',
    'GEO оптимизация',
    'AI туризм',
    'куда поехать на отдых',
    'лучшие туры России',
    'дикая природа',
    'горячие источники',
    'фьорды Камчатки',
  ],
};

export default function Page() {
  return <HomePageClient />;
}
