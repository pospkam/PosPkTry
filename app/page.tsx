import type { Metadata } from 'next';
import HomePageClient from './_HomePageClient';

export const metadata: Metadata = {
  title: 'Kamchatour — Туры на Камчатку | Рыбалка, Вулканы, Природа',
  description:
    'Камчатка — земля огня и льда. Вулканы, рыбалка, термальные источники, джип-туры и снегоходные маршруты.',
  keywords: [
    'туры на Камчатку',
    'рыбалка Камчатка',
    'вулканы',
    'горячие источники',
    'джип-туры',
    'снегоход',
  ],
};

export default function Page() {
  return <HomePageClient />;
}

