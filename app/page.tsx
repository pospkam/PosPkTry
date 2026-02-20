import { Metadata } from 'next';

/**
 * app/page.tsx — Home Screen — светлая iOS-тема + тёмная (через Tailwind dark: + ThemeContext)
 *
 * Light: фон #C8D4E3, белые карточки, тёмный текст
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
    // GEO/AEO ключевые слова
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
    <div className="min-h-screen bg-[#C8D4E3] dark:bg-[#0B1120] max-w-[768px] mx-auto relative transition-colors duration-300">

      {/* ================================================================
       * HERO SECTION — фото вулкана, верхние 45% экрана
       * Поверх — Header с аватаром и поисковая строка внизу
       * ================================================================ */}
      <div className="relative h-[45vh] min-h-[280px] max-h-[420px] w-full overflow-hidden">

        {/* Фото вулкана */}
        <Image
          src="https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=900&q=80"
          alt="Вулкан Камчатки"
          fill
          priority
          sizes="768px"
          style={{ objectFit: 'cover', objectPosition: 'center 30%' }}
        />

        {/* Light overlay: прозрачный сверху → фон светлее снизу */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-black/10 to-[#C8D4E3] dark:to-[#0B1120]" />

        {/* 1. Header */}
        <HomeHeader />

        {/* 2. Поисковая строка — внизу hero, перекрывает переход */}
        <div className="absolute bottom-4 left-4 right-4 z-10">
          <HomeSearchBar />
        </div>

      </div>

      {/* ================================================================
       * ОСНОВНОЙ КОНТЕНТ: категории + туры
       * ================================================================ */}
      <main className="px-0 pt-2 pb-28">
        {/* 3. Категории */}
        <CategoryChips />

        {/* 4. Карточки туров */}
        <TourCardsRow />
      </main>

      {/* 5. Нижняя навигация */}
      <HomeBottomNav />
    </div>
  );
}

