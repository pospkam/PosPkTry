import { Metadata } from 'next';

/**
 * app/page.tsx — Home Screen — iOS glassmorphism mobile-first
 *
 * Light: full-screen volcano bg + frosted glass overlay, белые карточки
 * Dark:  фон #0B1120, glassmorphism, циановые акценты
 */

import Image from 'next/image';
import {
  HomeHeader,
  HomeSearchBar,
  CategoryChips,
  TourCardsRow,
  HomeBottomNav,
} from '@/components/home';

export const metadata: Metadata = {
  title: 'Kamchatour — Туры на Камчатку | Рыбалка, Вулканы, Природа',
  description: 'Туры на Камчатку: рыбалка на лосося, восхождения на вулканы, горячие источники. Бронирование онлайн. AEO: лучшие туры Камчатки.',
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

export default function HomePage() {
  return (
    <div className="min-h-screen max-w-[768px] mx-auto relative transition-colors duration-300">

      {/* ================================================================
       * FULL-SCREEN BACKGROUND — размытый пейзаж за всем контентом
       * Сине-лавандовый тон (#BAC5D8) просвечивает везде
       * ================================================================ */}
      <div className="fixed inset-0 -z-10 dark:hidden">
        <Image
          src="https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=900&q=80"
          alt="Камчатка — вулканический пейзаж"
          fill
          priority
          sizes="100vw"
          style={{ objectFit: 'cover', objectPosition: 'center 30%' }}
        />
        {/* Сине-лавандовый overlay — ключевой тон из макета */}
        <div className="absolute inset-0 bg-[#9BAAC8]/40 backdrop-blur-[20px]" />
      </div>

      {/* Dark mode background */}
      <div className="fixed inset-0 -z-10 hidden dark:block bg-[#0B1120]" />

      {/* ================================================================
       * HERO SECTION — верхние 30%: нативное фото видно в центре
       * По краям — сине-лавандовый padding от фона
       * ================================================================ */}
      <div className="relative h-[32vh] min-h-[240px] max-h-[360px] w-full overflow-hidden rounded-b-[32px]">
        <Image
          src="https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=900&q=80"
          alt="Вулкан Камчатки"
          fill
          priority
          sizes="768px"
          style={{ objectFit: 'cover', objectPosition: 'center 30%' }}
        />

        {/* Gradient: прозрачное фото сверху → лавандовый переход снизу */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#B9C1D6]/30 via-transparent to-[#B9C1D6]/70 dark:from-[#0B1120]/30 dark:to-[#0B1120]" />

        {/* 1. Header */}
        <HomeHeader />
      </div>

      {/* ================================================================
       * 2. Поисковая строка — отдельно между hero и контентом
       * ================================================================ */}
      <div className="relative px-4 -mt-6 z-20">
        <HomeSearchBar />
      </div>

      {/* ================================================================
       * ОСНОВНОЙ КОНТЕНТ — без белого overlay, фон просвечивает
       * ================================================================ */}
      <main className="relative px-0 pt-4 pb-28">
        {/* 3. Категории */}
        <CategoryChips />

        {/* 4. Карточки туров — 2 колонки */}
        <TourCardsRow />
      </main>

      {/* 5. Нижняя навигация */}
      <HomeBottomNav />
    </div>
  );
}

