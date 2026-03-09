'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Sun, Moon, UserCircle } from 'lucide-react';
import Logo from '@/components/shared/Logo';
import { VolcanoIcon } from '@/components/icons/VolcanoIcon';
import { FishingIcon } from '@/components/icons/FishingIcon';
import { ThermalIcon } from '@/components/icons/ThermalIcon';
import { SnowmobileIcon } from '@/components/icons/SnowmobileIcon';
import { JeepIcon } from '@/components/icons/JeepIcon';
import { BearIcon } from '@/components/icons/BearIcon';
import { TrekkingIcon } from '@/components/icons/TrekkingIcon';
import { HelicopterIcon } from '@/components/icons/HelicopterIcon';
import { LakeIcon } from '@/components/icons/LakeIcon';
import { EcoIcon } from '@/components/icons/EcoIcon';
import { MountainIcon } from '@/components/icons/MountainIcon';
import { GeyserIcon } from '@/components/icons/GeyserIcon';
import { RiverIcon } from '@/components/icons/RiverIcon';
import { SeaWalkIcon } from '@/components/icons/SeaWalkIcon';
import ActivityCarousel from '@/components/ui/ActivityCarousel';
import { useTheme } from '@/contexts/ThemeContext';
import BottomNav from '@/components/shared/BottomNav';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Activity {
  icon: React.ReactNode;
  label: string;
  href: string;
}

interface CarouselImage {
  src: string;
  alt: string;
  webp?: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

// Категории из реальной БД (kamchatka_routes), отсортированы по количеству маршрутов
const ACTIVITIES: Activity[] = [
  { icon: <VolcanoIcon className="w-8 h-8" />,   label: 'Вулканы',     href: '/tours?category=vulkani' },           // 30
  { icon: <ThermalIcon className="w-8 h-8" />,   label: 'Термы',       href: '/tours?category=termalnye_istochniki' }, // 19
  { icon: <LakeIcon className="w-8 h-8" />,      label: 'Озёра',       href: '/tours?category=lakes' },              // 15
  { icon: <EcoIcon className="w-8 h-8" />,       label: 'Эко-туры',    href: '/tours?category=eco' },                // 14
  { icon: <MountainIcon className="w-8 h-8" />,  label: 'Горы',        href: '/tours?category=mountains' },          // 12
  { icon: <GeyserIcon className="w-8 h-8" />,    label: 'Гейзеры',     href: '/tours?category=geyzery' },            // 10
  { icon: <RiverIcon className="w-8 h-8" />,     label: 'Реки',        href: '/tours?category=rivers' },             // 7
  { icon: <TrekkingIcon className="w-8 h-8" />,  label: 'Треккинг',    href: '/tours?category=trekking' },           // 6
  { icon: <FishingIcon className="w-8 h-8" />,   label: 'Рыбалка',     href: '/tours?category=fishing' },            // 5 routes + 10 tours
  { icon: <SeaWalkIcon className="w-8 h-8" />,   label: 'Море',        href: '/tours?category=morskie_progulki' },   // 5
  { icon: <BearIcon className="w-8 h-8" />,      label: 'Медведи',     href: '/tours?category=medvedi' },            // 3
  { icon: <HelicopterIcon className="w-8 h-8" />, label: 'Вертолёт',   href: '/tours?category=vertoletnye_tury' },  // 3
  { icon: <SnowmobileIcon className="w-8 h-8" />, label: 'Снегоход',   href: '/tours?category=snowmobile' },
  { icon: <JeepIcon className="w-8 h-8" />,      label: 'Джип-туры',   href: '/tours?category=jeep' },
];

const CAROUSEL_IMAGES: CarouselImage[] = [
  { src: '/images/carousel/1.jpg', alt: 'Камчатка — дикая природа', webp: '/images/carousel/1.webp' },
  { src: '/images/carousel/2.jpg', alt: 'Камчатка — вулканы', webp: '/images/carousel/2.webp' },
  { src: '/images/carousel/3.jpg', alt: 'Камчатка — медведи', webp: '/images/carousel/3.webp' },
  { src: '/images/carousel/4.jpg', alt: 'Камчатка — гейзеры', webp: '/images/carousel/4.webp' },
  { src: '/images/carousel/5.jpg', alt: 'Камчатка — горные реки', webp: '/images/carousel/5.webp' },
];

// ─── Ripple Utility ───────────────────────────────────────────────────────────

function spawnRipple(
  e: React.MouseEvent<HTMLElement>,
  container: HTMLElement,
  color = 'rgba(0,212,255,0.3)'
): void {
  const rect = container.getBoundingClientRect();
  const size = Math.max(rect.width, rect.height) * 2;
  const x = e.clientX - rect.left - size / 2;
  const y = e.clientY - rect.top - size / 2;
  const ripple = document.createElement('span');
  ripple.style.cssText = `
    position:absolute;border-radius:50%;
    width:${size}px;height:${size}px;
    left:${x}px;top:${y}px;
    background:${color};
    transform:scale(0);
    animation:kh-ripple 600ms linear forwards;
    pointer-events:none;
  `;
  container.style.overflow = 'hidden';
  container.appendChild(ripple);
  setTimeout(() => ripple.remove(), 650);
}

// ─── Activity Card (legacy removed - using ActivityCarousel) ──────────────────

// ─── Carousel Item ────────────────────────────────────────────────────────────

interface CarouselItemProps {
  img: CarouselImage;
  onOpen: (src: string) => void;
}

function CarouselItem({ img, onOpen }: CarouselItemProps) {
  const [error, setError] = useState(false);

  return (
    <button
      type="button"
      aria-label={img.alt}
      onClick={() => !error && onOpen(img.src)}
      style={{
        width: '120px',
        minWidth: '120px',
        aspectRatio: '3/4',
        borderRadius: '16px',
        overflow: 'hidden',
        border: 'none',
        padding: 0,
        cursor: error ? 'default' : 'pointer',
        flexShrink: 0,
        position: 'relative',
        transition: 'transform 200ms ease',
        background: 'rgba(255,255,255,0.1)',
      }}
    >
      {error ? (
        <div
          style={{
            width: '100%',
            height: '100%',
            background: 'rgba(255,255,255,0.08)',
            borderRadius: '16px',
          }}
        />
      ) : (
        <picture>
          {img.webp && <source srcSet={img.webp} type="image/webp" />}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={img.src}
            alt={img.alt}
            loading="lazy"
            decoding="async"
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center' }}
            onError={() => setError(true)}
          />
        </picture>
      )}
    </button>
  );
}

// ─── Lightbox ─────────────────────────────────────────────────────────────────

interface LightboxProps {
  src: string;
  onClose: () => void;
}

function Lightbox({ src, onClose }: LightboxProps) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label="Закрыть изображение"
      onClick={onClose}
      onKeyDown={(e) => e.key === 'Enter' && onClose()}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'rgba(0,0,0,0.92)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'zoom-out',
        animation: 'kh-fade-in 200ms ease forwards',
      }}
    >
      <div
        role="presentation"
        onClick={(e) => e.stopPropagation()}
        style={{
          position: 'relative',
          width: 'min(90vw,90vh)',
          height: 'min(90vw,90vh)',
          borderRadius: '16px',
          overflow: 'hidden',
        }}
      >
        <Image
          src={src}
          alt="Полноэкранное изображение"
          fill
          sizes="(max-width:768px) 90vw, 90vh"
          style={{ objectFit: 'contain' }}
        />
      </div>
    </div>
  );
}

// ─── Footer ───────────────────────────────────────────────────────────────────

function Footer() {
  const links = [
    { label: 'Туры', href: '/tours' },
    { label: 'Карта', href: '/map' },
    { label: 'Безопасность', href: '/safety' },
    { label: 'Экология', href: '/eco' },
    { label: 'Партнёрам', href: '/partner/register' },
  ];
  return (
    <footer
      className="hidden md:block"
      style={{
        background: 'rgba(0,0,0,0.4)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        padding: '24px 40px',
        borderTop: '1px solid rgba(255,255,255,0.1)',
      }}
    >
      <div
        style={{
          maxWidth: '1200px',
          margin: '0 auto',
          display: 'flex',
          flexWrap: 'wrap',
          gap: '16px',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Logo size={24} />
        <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              style={{
                fontFamily: "var(--font-inter,'Inter',sans-serif)",
                fontSize: '14px',
                color: 'rgba(255,255,255,0.6)',
                textDecoration: 'none',
                transition: 'color 200ms ease',
              }}
            >
              {link.label}
            </Link>
          ))}
        </div>
        <span
          style={{
            fontFamily: "var(--font-inter,'Inter',sans-serif)",
            fontSize: '13px',
            color: 'rgba(255,255,255,0.4)',
          }}
        >
          {new Date().getFullYear()} Kamchatour
        </span>
      </div>
    </footer>
  );
}

// ─── Main Export ──────────────────────────────────────────────────────────────

export default function HomePageClient() {
  // Используем единый ThemeContext вместо дублирующегося локального стейта
  const { theme, toggleTheme } = useTheme();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [clickedActivity, setClickedActivity] = useState<string | null>(null);
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleHeaderRipple = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    spawnRipple(e, e.currentTarget, 'rgba(0,212,255,0.3)');
  }, []);

  const handleActivityClick = useCallback(
    (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
      e.preventDefault();
      setClickedActivity(href);
      setTimeout(() => { router.push(href); }, 300);
    },
    []
  );

  const openLightbox = useCallback((src: string) => setLightboxSrc(src), []);
  const closeLightbox = useCallback(() => setLightboxSrc(null), []);

  if (!mounted) {
    return <div style={{ minHeight: '100dvh', background: '#0B1120' }} />;
  }

  return (
    <>
      <style>{`
        @keyframes kh-ripple { to { transform:scale(1); opacity:0; } }
        @keyframes kh-fade-in { from { opacity:0; } to { opacity:1; } }
        @keyframes kh-slide-up { from { opacity:0; transform:translateY(40px); } to { opacity:1; transform:translateY(0); } }
        .activity-card:hover { border-color:#00D4FF !important; filter:drop-shadow(0 0 6px rgba(0,212,255,0.4)) !important; }
        .header-btn:hover { border-color:rgba(0,212,255,0.6) !important; }
        .header-btn:hover svg { filter:drop-shadow(0 0 6px #00D4FF); }
        .carousel-track { scrollbar-width:none; -ms-overflow-style:none; }
        .carousel-track::-webkit-scrollbar { display:none; }
        .activity-carousel-track { scrollbar-width:none; -ms-overflow-style:none; }
        .activity-carousel-track::-webkit-scrollbar { display:none; }
      `}</style>

      <main className="relative min-h-[100dvh] w-full pb-[100px]">
        {/* ФОН - ФИКСИРОВАННЫЙ СЗАДИ */}
        <div className="fixed inset-0 w-full h-full -z-10 bg-black">
          <picture>
            <source srcSet={theme === 'dark' ? '/images/dark.webp' : '/images/light.webp'} type="image/webp" />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={theme === 'dark' ? '/images/dark.jpg' : '/images/light.jpg'}
              alt="Камчатка"
              className="fixed inset-0 w-full h-full object-cover object-center -z-10"
            />
          </picture>
          {/* Затемнение поверх картинки (опционально, для читаемости текста) */}
          <div className="absolute inset-0 bg-black/40" />
        </div>

        {/* КОНТЕНТ (Поверх фона) */}
        <div className="relative z-10 flex flex-col items-center w-full px-4 pt-[72px]">
        {/* Header */}
        <header
          style={{
            position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50,
            padding: '12px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            background: 'rgba(255,255,255,0.12)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            borderBottom: '1px solid rgba(255,255,255,0.15)',
          }}
        >
          <Link
            href="/"
            aria-label="Kamchatour — главная"
            style={{ textDecoration: 'none', display: 'flex', alignItems: 'center' }}
          >
            <Logo size={32} />
          </Link>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <button
              type="button"
              aria-label={theme === 'light' ? 'Переключить на тёмную тему' : 'Переключить на светлую тему'}
              className="header-btn"
              onClick={(e) => { handleHeaderRipple(e); toggleTheme(); }}
              style={{
                width: '44px', height: '44px', borderRadius: '50%',
                border: '1px solid rgba(255,255,255,0.3)',
                background: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(8px)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', color: 'white',
                position: 'relative', overflow: 'hidden',
                transition: 'border-color 200ms ease',
              }}
            >
              {theme === 'light' ? <Moon size={18} strokeWidth={1.5} /> : <Sun size={18} strokeWidth={1.5} />}
            </button>
            <Link
              href="/profile"
              aria-label="Личный кабинет"
              className="header-btn"
              style={{
                width: '44px', height: '44px', borderRadius: '50%',
                border: '1px solid rgba(255,255,255,0.3)',
                background: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(8px)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'white', textDecoration: 'none',
                transition: 'border-color 200ms ease',
              }}
            >
              <UserCircle size={18} strokeWidth={1.5} />
            </Link>
          </div>
        </header>


        {/* Hero */}
        <section
          aria-label="Главный экран"
          style={{
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            textAlign: 'center', padding: '60px 24px 32px',
          }}
        >
          <h1
            style={{
              fontFamily: "var(--font-playfair,'Playfair Display',serif)",
              fontSize: 'clamp(22px,6vw,40px)', fontWeight: 600,
              color: 'white', margin: 0, lineHeight: 1.2,
              textShadow: '0 2px 8px rgba(0,0,0,0.6)', maxWidth: '640px',
              letterSpacing: '0.01em',
            }}
          >
            Дикая природа. Настоящие маршруты.
          </h1>

          {/* CTA + AI */}
          <div className="flex flex-wrap justify-center gap-4 mt-8">
            <a
              href="/tours"
              className="px-7 py-3 rounded-full bg-premium-gold text-premium-black font-semibold text-lg shadow-lg hover:bg-premium-gold/80 hover:shadow-[0_0_20px_rgba(212,175,55,0.4)] transition-shadow min-w-[160px] text-center"
              style={{ textDecoration: 'none' }}
            >
              Найти тур
            </a>
            <button
              type="button"
              className="px-7 py-3 rounded-full bg-white/15 border border-white/20 text-white font-semibold text-lg shadow-lg hover:bg-white/25 hover:shadow-[0_0_20px_rgba(0,212,255,0.3)] transition-all min-w-[160px] text-center flex items-center justify-center gap-2"
              style={{ outline: 'none', cursor: 'pointer' }}
              onClick={() => {
                if (typeof window !== 'undefined') {
                  const btn = document.querySelector('[aria-label="AI помощник"]') as HTMLElement;
                  if (btn) btn.click();
                }
              }}
              aria-label="Спросить AI"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 8V4H8"/><rect x="2" y="2" width="20" height="20" rx="5"/><path d="m2 22 5.5-5.5"/><path d="M14 18h2"/><path d="M14 14h4"/></svg>
              Спросить AI
            </button>
          </div>
        </section>

        {/* Activities - Auto-scroll carousel */}
        <section
          aria-label="Активности Камчатки"
          style={{ padding: '24px 0 40px', width: '100%' }}
        >
          <h2
            style={{
              fontFamily: "var(--font-playfair,'Playfair Display',serif)",
              fontSize: 'clamp(20px,5vw,28px)', fontWeight: 700,
              color: 'white', margin: '0 0 20px', textAlign: 'center',
              textShadow: '0 1px 4px rgba(0,0,0,0.5)',
              padding: '0 20px',
            }}
          >
            Активности Камчатки
          </h2>
          <ActivityCarousel
            activities={ACTIVITIES}
            onActivityClick={handleActivityClick}
            clickedActivity={clickedActivity}
          />
        </section>

        {/* Carousel */}
        <section
          aria-label="Камчатка глазами путешественников"
          style={{ padding: '24px 0 32px' }}
        >
          <h2
            style={{
              fontFamily: "var(--font-playfair,'Playfair Display',serif)",
              fontSize: 'clamp(18px,5vw,26px)', fontWeight: 700,
              color: 'white', margin: '0 0 16px', textAlign: 'center',
              padding: '0 20px', textShadow: '0 1px 4px rgba(0,0,0,0.5)',
            }}
          >
            Камчатка глазами путешественников
          </h2>
          <div
            className="carousel-track"
            style={{
              display: 'flex', gap: '12px',
              overflowX: 'auto', padding: '0 20px 8px',
              scrollSnapType: 'x mandatory',
            }}
          >
            {CAROUSEL_IMAGES.map((img) => (
              <div key={img.src} style={{ scrollSnapAlign: 'start' }}>
                <CarouselItem img={img} onOpen={openLightbox} />
              </div>
            ))}
          </div>
        </section>

        {/* Footer spacer for mobile nav */}
        <div style={{ marginTop: 'auto' }}>
          <Footer />
        </div>
        <div className="md:hidden" style={{ height: '120px' }} />
        </div>
      </main>

      <BottomNav activePath="/" onNavClick={(e) => spawnRipple(e, e.currentTarget, 'rgba(0,212,255,0.25)')} />
      {lightboxSrc && <Lightbox src={lightboxSrc} onClose={closeLightbox} />}
    </>
  );
}
