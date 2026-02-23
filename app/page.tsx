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
    <div className="min-h-screen max-w-[768px] mx-auto relative transition-colors duration-300 overflow-hidden">

      {/* ================================================================
       * FULL-SCREEN BACKGROUND — фото вулкана за всем контентом
       * Light: видимый blur-фон; Dark: тёмный фон (скрыто)
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
        {/* Frost overlay — размытие для читаемости контента */}
        <div className="absolute inset-0 bg-white/30 backdrop-blur-sm" />
      </div>

      {/* Dark mode fallback background */}
      <div className="fixed inset-0 -z-10 hidden dark:block bg-[#0B1120]" />

      {/* ================================================================
       * HERO SECTION — верхние 42vh: чистое фото без blur
       * ================================================================ */}
      <div className="relative h-[42vh] min-h-[280px] max-h-[400px] w-full overflow-hidden">
        <Image
          src="https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=900&q=80"
          alt="Вулкан Камчатки"
          fill
          priority
          sizes="768px"
          style={{ objectFit: 'cover', objectPosition: 'center 30%' }}
        />

        {/* Gradient overlay: чистое фото сверху → мягкий переход к контенту */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-transparent to-white/60 dark:to-[#0B1120]" />

        {/* 1. Header */}
        <HomeHeader />

        {/* 2. Поисковая строка — внизу hero */}
        <div className="absolute bottom-4 left-4 right-4 z-10">
          <HomeSearchBar />
        </div>
      </div>

      {/* ================================================================
       * ОСНОВНОЙ КОНТЕНТ — glassmorphism panel поверх фона
       * ================================================================ */}
      <main className="relative px-0 pt-2 pb-28">
        {/* Frosted glass подложка для контента (только light) */}
        <div className="absolute inset-0 bg-white/50 dark:bg-transparent backdrop-blur-md dark:backdrop-blur-none rounded-t-3xl -top-4 pointer-events-none" />

        <div className="relative z-[1]">
          {/* 3. Категории */}
          <CategoryChips />

          {/* 4. Карточки туров */}
          <TourCardsRow />
        </div>
      </main>

      {/* 5. Нижняя навигация */}
      <HomeBottomNav />
    </div>
  );
}

