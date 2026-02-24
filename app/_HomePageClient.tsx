'use client';

import { useMediaQuery } from 'react-responsive';
import { DesktopHero } from '@/components/home/DesktopHero';
import Image from 'next/image';
import {
  HomeHeader,
  HomeSearchBar,
  CategoryChips,
  TourCardsRow,
  HomeBottomNav,
} from '@/components/home';

import { ModernTourSearch } from '@/components/ModernTourSearch';

export default function HomePageClient() {
  const isDesktop = useMediaQuery({ minWidth: 1024 });

  return (
    <div className="min-h-screen w-full relative transition-colors duration-300 lg:max-w-none lg:mx-0">

      {/* ================================================================
       * FULL-SCREEN BACKGROUND — custom SVG рисунок Камчатки
       * ================================================================ */}
      <div className="fixed inset-0 -z-10 dark:hidden">
        <svg viewBox="0 0 1200 800" preserveAspectRatio="xMidYMid slice" className="w-full h-full">
          <defs>
            <radialGradient id="sky" cx="50%" cy="20%">
              <stop offset="0%" stop-color="#87CEEB"/>
              <stop offset="50%" stop-color="#B0C4DE"/>
              <stop offset="100%" stop-color="#1E3A8A"/>
            </radialGradient>
            <radialGradient id="volcano1" cx="30%" cy="80%">
              <stop offset="0%" stop-color="#FF4500"/>
              <stop offset="70%" stop-color="#8B0000"/>
              <stop offset="100%" stop-color="#2F1B14"/>
            </radialGradient>
            <radialGradient id="volcano2" cx="70%" cy="75%">
              <stop offset="0%" stop-color="#FF6347"/>
              <stop offset="70%" stop-color="#DC143C"/>
              <stop offset="100%" stop-color="#4A0E0E"/>
            </radialGradient>
            <linearGradient id="ocean" x1="0%" y1="90%" x2="100%" y2="100%">
              <stop offset="0%" stop-color="#4682B4"/>
              <stop offset="100%" stop-color="#191970"/>
            </linearGradient>
            <filter id="smoke" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur in="SourceAlpha" stdDeviation="3" result="blur"/>
              <feOffset in="blur" dx="0" dy="3" result="offsetBlur"/>
              <feMerge>
                <feMergeNode in="offsetBlur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
          </defs>
          {/* Небо */}
          <rect width="1200" height="400" fill="url(#sky)"/>
          {/* Горы/вулканы */}
          <path d="M0 400 Q150 250 300 380 Q450 200 600 390 Q750 220 900 370 Q1050 280 1200 400 L1200 800 L0 800 Z" fill="#2D5016" opacity="0.8"/>
          {/* Вулкан 1 */}
          <path d="M250 380 Q280 320 320 380 Q350 300 400 370 L420 400 L250 400 Z" fill="url(#volcano1)"/>
          <circle cx="320" cy="340" r="15" fill="#FFD700" opacity="0.9" className="animate-ping"/>
          {/* Дым вулкана 1 */}
          <ellipse cx="320" cy="320" rx="20" ry="30" fill="#A9A9A9" opacity="0.6" filter="url(#smoke)" className="animate-pulse"/>
          {/* Вулкан 2 */}
          <path d="M750 370 Q780 310 820 370 Q850 290 900 360 L920 390 L750 390 Z" fill="url(#volcano2)"/>
          <circle cx="820" cy="330" r="18" fill="#FFA500" opacity="0.9" className="animate-ping delay-1000"/>
          {/* Дым вулкана 2 */}
          <ellipse cx="820" cy="310" rx="25" ry="35" fill="#C0C0C0" opacity="0.5" filter="url(#smoke)" className="animate-pulse delay-500"/>
          {/* Океан */}
          <path d="M0 500 Q300 480 600 510 Q900 490 1200 505 L1200 800 L0 800 Z" fill="url(#ocean)"/>
          {/* Волны */}
          <path d="M0 520 Q100 510 200 525 Q300 515 400 530 Q500 520 600 535 Q700 525 800 540 Q900 530 1000 545 Q1100 535 1200 550" stroke="#4682B4" strokeWidth="3" fill="none" className="animate-wave"/>
          <path d="M0 540 Q150 530 300 545 Q450 535 600 550 Q750 540 900 555 Q1050 545 1200 560" stroke="#5F9EA0" strokeWidth="2" fill="none" className="animate-wave delay-1000"/>
        </svg>
        {/* Overlay */}
        <div className="absolute inset-0 bg-[#9BAAC8]/30 backdrop-blur-sm" />
      </div>

      {/* Dark mode SVG background */}
      <div className="fixed inset-0 -z-10 hidden dark:block">
        <svg viewBox="0 0 1200 800" preserveAspectRatio="xMidYMid slice" className="w-full h-full">
          {/* Темный градиент небо */}
          <rect width="1200" height="500" fill="url(#darkSky)"/>
          {/* ... similar paths with dark colors */}
        </svg>
        <div className="absolute inset-0 bg-gradient-to-b from-[#0B1120]/90 to-[#0B1120]" />
      </div>

      {/* ================================================================
       * HERO SECTION — верхние 30%: нативное фото видно в центре
       * По краям — сине-лавандовый padding от фона
       * ================================================================ */}
      {isDesktop ? (
        <DesktopHero />
      ) : (
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
      )}

      {/* ================================================================
       * 2. Поисковая строка — отдельно между hero и контентом
       * ================================================================ */}
      <div className="relative px-4 lg:px-8 -mt-6 lg:mt-0 z-20">
        <HomeSearchBar />
      </div>

      {/* ================================================================
       * ОСНОВНОЙ КОНТЕНТ — без белого overlay, фон просвечивает
       * ================================================================ */}
      <main className="relative px-4 lg:px-0 pt-4 pb-28 lg:pb-0">
        {/* 3. Категории */}
        <CategoryChips />

        {/* Интегрированный поиск */}
        <Suspense fallback={<Loader2 className="animate-spin" />}>
          <ModernTourSearch />
        </Suspense>

        {/* 4. Карточки туров — 2 колонки */}
        <TourCardsRow />
      </main>

      {/* 5. Нижняя навигация */}
      {!isDesktop && <HomeBottomNav />}
    </div>
  );
}
