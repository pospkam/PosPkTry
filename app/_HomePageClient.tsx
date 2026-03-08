'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Sun, Moon, UserCircle, House, Map, Heart, User, AlertTriangle } from 'lucide-react';
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

// ─── Types ────────────────────────────────────────────────────────────────────

interface Activity {
  icon: React.ReactNode;
  label: string;
  href: string;
}

interface NavItem {
  icon: React.ElementType;
  label: string;
  href: string;
  sos?: boolean;
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

const NAV_ITEMS: NavItem[] = [
  { icon: House, label: 'Домой', href: '/' },
  { icon: Map, label: 'Карта', href: '/map' },
  { icon: Heart, label: 'Избранное', href: '/hub/tourist/wishlist' },
  { icon: User, label: 'ЛК', href: '/profile' },
  { icon: AlertTriangle, label: 'СОС', href: '/safety', sos: true },
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

// ─── Bottom Nav ───────────────────────────────────────────────────────────────

function BottomNav({ activePath }: { activePath: string }) {
  const handleNavClick = useCallback((e: React.MouseEvent<HTMLAnchorElement>) => {
    spawnRipple(e, e.currentTarget, 'rgba(0,212,255,0.25)');
  }, []);

  return (
    <nav
      className="md:hidden"
      aria-label="Основная навигация"
      style={{
        position: 'fixed',
        bottom: '32px',
        left: '16px',
        right: '16px',
        zIndex: 100,
        background: 'rgba(255,255,255,0.2)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        border: '1px solid rgba(255,255,255,0.3)',
        borderRadius: '50px',
        padding: '12px 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-around',
      }}
    >
      {NAV_ITEMS.map((item) => {
        const Icon = item.icon;
        const isActive = activePath === item.href;
        const isSos = item.sos === true;
        return (
          <a
            key={item.href}
            href={item.href}
            aria-label={item.label}
            onClick={handleNavClick}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '2px',
              color: isSos ? '#ef4444' : isActive ? '#00D4FF' : 'rgba(255,255,255,0.8)',
              textDecoration: 'none',
              transition: 'color 200ms ease',
              position: 'relative',
              overflow: 'hidden',
              padding: '4px 8px',
              borderRadius: '12px',
            }}
          >
            <Icon size={20} strokeWidth={1.5} />
            <span
              style={{
                fontFamily: "var(--font-inter,'Inter',sans-serif)",
                fontSize: '10px',
                fontWeight: 500,
              }}
            >
              {item.label}
            </span>
          </a>
        );
      })}
    </nav>
  );
}

// ─── Footer ───────────────────────────────────────────────────────────────────

function Footer() {
  const links = [
    { label: 'Туры', href: '/tours' },
    { label: 'Карта', href: '/map' },
    { label: 'Безопасность', href: '/safety' },
    { label: 'Экология', href: '/eco' },
    { label: 'О нас', href: '/partner' },
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
        <span
          style={{
            fontFamily: "var(--font-playfair,'Playfair Display',serif)",
            fontSize: '18px',
            fontWeight: 700,
            color: 'white',
          }}
        >
          KH
        </span>
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
      setTimeout(() => { window.location.href = href; }, 300);
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
            <source media="(max-width: 480px)" srcSet={theme === 'dark' ? '/images/dark-mobile.webp' : '/images/light-mobile.webp'} type="image/webp" />
            <source media="(max-width: 768px)" srcSet={theme === 'dark' ? '/images/dark-tablet.webp' : '/images/light-tablet.webp'} type="image/webp" />
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
        <div className="relative z-10 flex flex-col items-center w-full px-4 pt-16">
        {/* Header */}
        <header
          style={{
            position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50,
            padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}
        >
          <Link
            href="/"
            aria-label="Kamchatour — главная"
            style={{
              fontFamily: "var(--font-playfair,'Playfair Display',serif)",
              fontSize: '24px', fontWeight: 700, color: 'white',
              textDecoration: 'none', letterSpacing: '0.02em',
              textShadow: '0 2px 8px rgba(0,0,0,0.4)',
            }}
          >
            KH
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
            textAlign: 'center', padding: '100px 24px 40px',
          }}
        >
          <h1
            style={{
              fontFamily: "var(--font-playfair,'Playfair Display',serif)",
              fontSize: 'clamp(28px,8vw,56px)', fontWeight: 700,
              color: 'white', margin: '0 0 12px', lineHeight: 1.15,
              textShadow: '0 2px 8px rgba(0,0,0,0.6)', maxWidth: '640px',
            }}
          >
            Камчатка не для туристов
          </h1>
          <p
            style={{
              fontFamily: "var(--font-inter,'Inter',sans-serif)",
              fontSize: 'clamp(14px,4vw,18px)', fontWeight: 400,
              color: 'rgba(255,255,255,0.8)', margin: 0, letterSpacing: '0.01em',
            }}
          >
            Дикая природа. Настоящие маршруты.
          </p>

          {/* CTA + AI */}
          <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', marginTop: 32 }}>
            <a
              href="/tours"
              className="px-7 py-3 rounded-full bg-ocean text-white font-semibold text-lg shadow-lg hover:bg-ocean/90 transition min-w-[160px] text-center"
              style={{ textDecoration: 'none' }}
            >
              Найти тур
            </a>
            <button
              type="button"
              className="px-7 py-3 rounded-full bg-volcano text-white font-semibold text-lg shadow-lg hover:bg-volcano/90 transition min-w-[160px] text-center flex items-center gap-2"
              style={{ outline: 'none', border: 'none', cursor: 'pointer' }}
              onClick={() => {
                if (typeof window !== 'undefined') {
                  const btn = document.querySelector('[aria-label="AI помощник"]') as HTMLElement;
                  if (btn) btn.click();
                }
              }}
              aria-label="Спросить AI"
            >
              <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1"><path d="M12 19c.7-1.2 1.1-2.6 1.1-4.1 0-3.9-3.1-7-7-7S-1 11-1 14.9c0 1.5.4 2.9 1.1 4.1"/><circle cx="5" cy="14.9" r="7"/></svg>
              Спросить AI
            </button>
          </div>
        </section>

        {/* Activities - Auto-scroll carousel */}
        <section
          aria-label="Активности Камчатки"
          style={{ padding: '40px 0 100px', width: '100%' }}
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
          style={{ padding: '32px 0 24px' }}
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

      <BottomNav activePath="/" />
      {lightboxSrc && <Lightbox src={lightboxSrc} onClose={closeLightbox} />}
    </>
  );
}
