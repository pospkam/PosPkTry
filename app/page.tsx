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
  DesktopNav,
  DesktopHero,
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
        {/* Градиентный overlay для читаемости текста, как на макете */}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#8B9AC0]/40 to-[#8B9AC0]/80 backdrop-blur-[2px]" />
      </div>

      {/* Dark mode background */}
      <div className="fixed inset-0 -z-10 hidden dark:block bg-[#0B1120]" />

      {/* ================================================================
       * HERO SECTION — верхние 30%: нативное фото видно в центре
       * ================================================================ */}
      <div className="relative w-full overflow-hidden">
        {/* 1. Header */}
        <HomeHeader />
      </div>

      {/* ================================================================
       * 2. Поисковая строка — отдельно между hero и контентом
       * ================================================================ */}
      <div className="relative px-4 mt-4 z-20">
        <HomeSearchBar />
      </div>

      {/* ================================================================
       * ОСНОВНОЙ КОНТЕНТ — без белого overlay, фон просвечивает
       * ================================================================ */}
      <main className="relative px-0 pt-6 pb-28">
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

