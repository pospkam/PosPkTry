import { Metadata } from 'next';
import { Suspense } from 'react';
import HomePageClient from './_HomePageClient';

export const metadata: Metadata = {
  title: 'Kamchatour — Туры на Камчатку | Рыбалка, Вулканы, Природа',
  description: 'Туры на Камчатку: рыбалка на лосося, восхождения на вулканы, горячие источники. Бронирование онлайн. Лучшие туры Камчатки.',
  keywords: [
    'туры на Камчатку',
    'рыбалка Камчатка',
    'вулканы',
    'отдых на Камчатке',
    'горячие источники',
    'дикая природа',
    'фьорды Камчатки',
  ],
};

export default function Page() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <HomePageClient />
    </Suspense>
  );
}
