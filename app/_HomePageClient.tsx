'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { Search, UserCircle, MapPin, Heart, Home, Sun, Moon } from 'lucide-react';
import { useInView } from '@/hooks/useInView';
import { useTheme } from '@/contexts/ThemeContext';
import SOSButton from '@/components/shared/SOSButton';
import Logo from '@/components/shared/Logo';
import { VolcanoIcon }    from '@/components/icons/VolcanoIcon';
import { FishingIcon }    from '@/components/icons/FishingIcon';
import { ThermalIcon }    from '@/components/icons/ThermalIcon';
import { RiverIcon }      from '@/components/icons/RiverIcon';
import { SeaWalkIcon }    from '@/components/icons/SeaWalkIcon';
import { BearIcon }       from '@/components/icons/BearIcon';
import { HelicopterIcon } from '@/components/icons/HelicopterIcon';
import { SnowmobileIcon } from '@/components/icons/SnowmobileIcon';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Activity {
  icon: React.ReactNode;
  label: string;
  href: string;
}

interface BentoItem {
  title: string;
  subtitle: string;
  tag?: string;
  tagColor?: string;
  svgIcon: React.ReactNode;
  bg: string;
  colSpan?: number;
  rowSpan?: number;
  href: string;
}

interface FeedItem {
  svgIcon: React.ReactNode;
  text: string;
  time: string;
}

// ─── Inline decorative SVG icons (stroke-only, for bento cards) ──────────────

function GeyserDeco() {
  return (
    <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" style={{ width: 48, height: 48, color: 'var(--kh-text-dim)', opacity: 0.12, transform: 'rotate(-10deg)' }}>
      <path d="M24 40V22" /><path d="M20 18q4-8 8 0" /><path d="M18 13q6-9 12 0" />
    </svg>
  );
}
function BearPawDeco() {
  return (
    <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" style={{ width: 40, height: 40, color: 'var(--kh-text-dim)', opacity: 0.12, transform: 'rotate(-8deg)' }}>
      <circle cx="24" cy="28" r="10" /><circle cx="16" cy="16" r="3" /><circle cx="24" cy="13" r="3" /><circle cx="32" cy="16" r="3" /><circle cx="36" cy="22" r="2.5" />
    </svg>
  );
}
function AnchorDeco() {
  return (
    <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" style={{ width: 36, height: 36, color: 'var(--kh-text-dim)', opacity: 0.12, transform: 'rotate(-12deg)' }}>
      <circle cx="24" cy="12" r="4" /><path d="M24 16v22" /><path d="M16 28q8 10 16 0" /><path d="M12 24h6m12 0h6" />
    </svg>
  );
}
function MountainDeco() {
  return (
    <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: 40, height: 40, color: 'var(--kh-text-dim)', opacity: 0.12, transform: 'rotate(-10deg)' }}>
      <path d="M4 40L20 10l8 14 4-6 12 22H4z" /><path d="M28 14q4-6 8 0" />
    </svg>
  );
}
function WavesDeco() {
  return (
    <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" style={{ width: 40, height: 40, color: 'var(--kh-text-dim)', opacity: 0.12, transform: 'rotate(-6deg)' }}>
      <path d="M4 20q6-6 12 0t12 0 12 0" /><path d="M4 28q6-6 12 0t12 0 12 0" />
    </svg>
  );
}
function SteamDeco() {
  return (
    <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" style={{ width: 40, height: 40, color: 'var(--kh-text-dim)', opacity: 0.12, transform: 'rotate(-8deg)' }}>
      <path d="M10 38h28" /><path d="M18 38v-4q0-6-3-10" /><path d="M24 38v-6q0-6-2-10" /><path d="M30 38v-4q0-6-3-10" />
    </svg>
  );
}

// ─── Small monochrome SVG icons (feed items, 20×20) ──────────────────────────

function CalendarCheckIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: 16, height: 16, color: 'var(--kh-text-dim)' }}>
      <rect x="3" y="4" width="14" height="14" rx="2" /><path d="M7 2v3m6-3v3" /><path d="M3 9h14" /><path d="M8 13l2 2 3-4" />
    </svg>
  );
}
function StarIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: 16, height: 16, color: 'var(--kh-text-dim)' }}>
      <path d="M10 2l2.5 5.5L18 8.5l-4 4 1 5.5L10 15l-5 3 1-5.5-4-4 5.5-1z" />
    </svg>
  );
}
function RouteIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: 16, height: 16, color: 'var(--kh-text-dim)' }}>
      <circle cx="10" cy="5" r="2" /><path d="M10 7v4c0 3-5 3-5 6" /><circle cx="5" cy="17" r="1" />
    </svg>
  );
}
function CheckCircleIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: 16, height: 16, color: 'var(--kh-text-dim)' }}>
      <circle cx="10" cy="10" r="7.5" /><path d="M7 10l2 2 4-4" />
    </svg>
  );
}

// ─── Data ─────────────────────────────────────────────────────────────────────

const ACTIVITIES: Activity[] = [
  { icon: <VolcanoIcon    className="w-8 h-8" />, label: 'Вулканы',   href: '/tours?category=vulkani' },
  { icon: <FishingIcon    className="w-8 h-8" />, label: 'Рыбалка',   href: '/tours?category=rybalka' },
  { icon: <ThermalIcon    className="w-8 h-8" />, label: 'Термы',     href: '/tours?category=termalnye_istochniki' },
  { icon: <RiverIcon      className="w-8 h-8" />, label: 'Сплавы',    href: '/tours?category=rivers' },
  { icon: <SeaWalkIcon    className="w-8 h-8" />, label: 'Морские',   href: '/tours?category=morskie_progulki' },
  { icon: <BearIcon       className="w-8 h-8" />, label: 'Медведи',   href: '/tours?category=medvedi' },
  { icon: <HelicopterIcon className="w-8 h-8" />, label: 'Вертолёты', href: '/tours?category=vertoletnye_tury' },
  { icon: <SnowmobileIcon className="w-8 h-8" />, label: 'Снегоход',  href: '/tours?category=snegohod' },
];

const BENTO_ITEMS: BentoItem[] = [
  { title: 'Долина Гейзеров', subtitle: 'UNESCO · Вертолётный тур', tag: 'ТОП', tagColor: 'var(--kh-accent)', svgIcon: <GeyserDeco />, bg: '#1a0d00', colSpan: 2, rowSpan: 2, href: '/tours?category=geyzery' },
  { title: 'Курильское озеро', subtitle: 'Медведи · Нерка', tag: 'СЕЗОН', tagColor: 'var(--kh-accent2)', svgIcon: <BearPawDeco />, bg: '#00111a', href: '/tours?category=lakes' },
  { title: 'Авачинская бухта', subtitle: 'Морские прогулки · Косатки', svgIcon: <AnchorDeco />, bg: '#001122', href: '/tours?category=morskie_progulki' },
  { title: 'Мутновский вулкан', subtitle: 'Сложность Easy', tag: 'EASY', tagColor: '#3a9c5f', svgIcon: <MountainDeco />, bg: '#1a0800', rowSpan: 2, href: '/tours?category=vulkani' },
  { title: 'Быстрая река', subtitle: 'Сплав · Рыбалка', svgIcon: <WavesDeco />, bg: '#001a10', href: '/tours?category=rivers' },
  { title: 'Паратунка', subtitle: 'Термальные источники · Релакс', tag: 'РЕЛАКС', tagColor: 'var(--kh-ice)', svgIcon: <SteamDeco />, bg: '#0d1a1a', colSpan: 2, href: '/tours?category=termalnye_istochniki' },
];

const FEED_ITEMS: FeedItem[] = [
  { svgIcon: <CalendarCheckIcon />, text: 'Иван забронировал тур на Горелый',                    time: '2 часа назад' },
  { svgIcon: <StarIcon />,          text: 'Наталья оставила отзыв о туре к медведям',             time: '3 часа назад' },
  { svgIcon: <RouteIcon />,         text: 'Добавлен новый вертолётный маршрут «Узон»',            time: 'вчера' },
  { svgIcon: <CheckCircleIcon />,   text: 'Группа из 6 чел. идёт на Мутновский завтра',          time: '5 часов назад' },
];

const MARQUEE_TEXT =
  '29 активных вулканов  ◆  400+ ледников  ◆  Медведи · Косатки · Киты  ◆  Долина Гейзеров  ◆  UNESCO Heritage  ◆  60 млрд ₽ туррынок  ◆  ';

// ─── Shared font vars ─────────────────────────────────────────────────────────

const FP = "var(--font-playfair,'Playfair Display',Georgia,serif)";
const FO = "var(--font-outfit,'Outfit',system-ui,sans-serif)";

// ─── Parallax hook ────────────────────────────────────────────────────────────

function useScrollY(): number {
  const [y, setY] = useState(0);
  useEffect(() => {
    const h = () => setY(window.scrollY);
    window.addEventListener('scroll', h, { passive: true });
    return () => window.removeEventListener('scroll', h);
  }, []);
  return y;
}

// ─── Reveal ───────────────────────────────────────────────────────────────────

function Reveal({ children, delay, className = '', style }: { children: React.ReactNode; delay?: 1 | 2 | 3 | 4; className?: string; style?: React.CSSProperties }) {
  const [ref, vis] = useInView();
  return (
    <div ref={ref} className={`kh-reveal ${vis ? 'kh-visible' : ''} ${delay ? `kh-reveal-d${delay}` : ''} ${className}`} style={style}>
      {children}
    </div>
  );
}

// ─── Film grain ───────────────────────────────────────────────────────────────

function FilmGrain() {
  return (
    <div
      aria-hidden="true"
      className="kh-film-grain"
      style={{
        position: 'fixed', inset: 0, zIndex: 999,
        pointerEvents: 'none',
        animation: 'kh-grain 8s steps(10) infinite',
        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='300'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='300' height='300' filter='url(%23noise)'/%3E%3C/svg%3E")`,
        backgroundRepeat: 'repeat',
        backgroundSize: '300px 300px',
      }}
    />
  );
}

// ─── Mountain silhouette (hero bottom) ────────────────────────────────────────

function MountainSilhouette({ parallax }: { parallax: number }) {
  return (
    <div aria-hidden="true" style={{ position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 3, transform: `translateY(${parallax * -0.12}px)`, pointerEvents: 'none' }}>
      <svg viewBox="0 0 1200 180" preserveAspectRatio="none" style={{ display: 'block', width: '100%', height: '120px', opacity: 0.4 }}>
        <path d="M0,180 L0,110 C80,90 130,60 200,75 C270,90 290,50 360,30 C430,10 450,55 520,65 C590,75 620,40 700,20 C780,0 800,35 880,50 C960,65 990,30 1060,45 C1130,60 1160,40 1200,55 L1200,180Z" fill="var(--kh-surface)" />
      </svg>
      <svg viewBox="0 0 1200 140" preserveAspectRatio="none" style={{ display: 'block', width: '100%', height: '100px', marginTop: '-40px' }}>
        <path d="M0,140 L0,100 C60,85 100,70 160,80 C220,90 250,55 320,40 C390,25 410,60 490,70 C570,80 600,45 680,30 C760,15 790,50 860,60 C930,70 960,35 1040,48 C1120,61 1160,40 1200,50 L1200,140Z" fill="var(--kh-bg)" />
      </svg>
    </div>
  );
}

// ─── Sticky Header ────────────────────────────────────────────────────────────
// Logo SVG (mountain range) replaces "KH" text.  Theme toggle between search and profile.

function StickyHeader({ scrolled }: { scrolled: boolean }) {
  const { isDark, toggleTheme } = useTheme();

  return (
    <header style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 80,
      padding: '12px 20px',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px',
      background: scrolled ? 'var(--kh-header-bg)' : 'transparent',
      backdropFilter: scrolled ? 'blur(20px)' : 'none',
      WebkitBackdropFilter: scrolled ? 'blur(20px)' : 'none',
      borderBottom: scrolled ? '1px solid var(--kh-border)' : '1px solid transparent',
      transition: 'background 300ms ease, backdrop-filter 300ms ease, border-color 300ms ease',
    }}>
      {/* Logo — SVG mountain range inside orange rounded square */}
      <Link href="/" aria-label="KamchatourHub" style={{
        width: '38px', height: '38px', borderRadius: '10px',
        background: 'linear-gradient(135deg, var(--kh-accent) 0%, #b83500 100%)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        textDecoration: 'none', flexShrink: 0, padding: '5px',
      }}>
        <Logo size={20} />
      </Link>

      {/* Search pill */}
      <Link href="/tours" style={{
        flex: 1, maxWidth: '280px',
        display: 'flex', alignItems: 'center', gap: '8px',
        padding: '9px 16px', borderRadius: '100px',
        background: 'var(--kh-search-bg)', border: '1px solid var(--kh-border-strong)',
        color: 'var(--kh-text-dim)', textDecoration: 'none',
        fontSize: '13px', fontFamily: FO,
        transition: 'background 200ms ease',
      }}>
        <Search size={14} />
        Найти тур
      </Link>

      {/* Theme toggle */}
      <button
        type="button"
        onClick={toggleTheme}
        aria-label={isDark ? 'Светлая тема' : 'Тёмная тема'}
        style={{
          width: '36px', height: '36px', borderRadius: '50%',
          border: '1px solid var(--kh-border-strong)', background: 'var(--kh-search-bg)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'var(--kh-text-dim)', cursor: 'pointer', flexShrink: 0,
          transition: 'border-color 200ms ease, color 200ms ease',
        }}
      >
        {isDark ? <Sun size={16} strokeWidth={1.5} /> : <Moon size={16} strokeWidth={1.5} />}
      </button>

      {/* Profile */}
      <Link href="/profile" aria-label="Личный кабинет" style={{
        width: '36px', height: '36px', borderRadius: '50%',
        border: '1px solid var(--kh-border-strong)', background: 'var(--kh-search-bg)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: 'var(--kh-text-dim)', textDecoration: 'none', flexShrink: 0,
        transition: 'border-color 200ms ease, color 200ms ease',
      }}>
        <UserCircle size={18} strokeWidth={1.5} />
      </Link>
    </header>
  );
}

// ─── Hero ─────────────────────────────────────────────────────────────────────

function HeroSection({ scrollY }: { scrollY: number }) {
  return (
    <section role="banner" style={{ position: 'relative', width: '100%', minHeight: '100dvh', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--kh-bg)' }}>

      {/* Photo layer with parallax */}
      <div aria-hidden="true" style={{ position: 'absolute', left: 0, right: 0, top: '-5%', height: '115%', zIndex: 0, transform: `translateY(${scrollY * 0.18}px)`, willChange: 'transform', pointerEvents: 'none' }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/images/hero-volcano.webp" alt="" width={1920} height={1080} loading="eager" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center 20%', display: 'block' }} />
      </div>

      {/* Top gradient overlay */}
      <div aria-hidden="true" style={{ position: 'absolute', inset: 0, zIndex: 1, background: 'var(--kh-hero-top-gradient)', pointerEvents: 'none' }} />
      {/* Bottom gradient overlay */}
      <div aria-hidden="true" style={{ position: 'absolute', inset: 0, zIndex: 1, background: 'linear-gradient(to top, var(--kh-bg) 0%, rgba(10,10,10,0.4) 22%, transparent 42%)', pointerEvents: 'none' }} />
      {/* Subtle volcanic glow */}
      <div aria-hidden="true" style={{ position: 'absolute', inset: 0, zIndex: 2, background: 'radial-gradient(ellipse 50% 35% at 50% 55%, rgba(232,83,14,0.07) 0%, transparent 70%)', animation: 'kh-hero-glow 12s ease-in-out infinite', pointerEvents: 'none' }} />

      {/* Content */}
      <div style={{ position: 'relative', zIndex: 10, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: '0 24px', maxWidth: '720px', paddingTop: '72px' }}>
        {/* Coordinates */}
        <div className="kh-reveal kh-visible" style={{ marginBottom: '20px' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '11px', fontWeight: 600, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--kh-accent)', fontFamily: FO }}>
            <span style={{ opacity: 0.7 }}>◎</span> 55°N · Камчатский край · Россия
          </span>
        </div>

        {/* Title — single gradient, NO orange */}
        <h1 className="kh-reveal kh-visible kh-reveal-d1" style={{
          fontFamily: FP, fontSize: 'clamp(36px, 8vw, 80px)', fontWeight: 700, lineHeight: 1.1, margin: '0 0 16px',
          background: 'linear-gradient(180deg, #F0EDE8 30%, #8A8680 100%)',
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
          letterSpacing: '-0.02em',
        }}>
          Здесь начинается<br />Россия
        </h1>

        {/* Subtitle */}
        <p className="kh-reveal kh-visible kh-reveal-d2" style={{ fontFamily: FP, fontStyle: 'italic', fontSize: 'clamp(16px, 3.5vw, 24px)', color: 'var(--kh-text-dim)', margin: '0 0 36px', letterSpacing: '0.02em' }}>
          Камчатка — земля огня и льда
        </p>

        {/* Single CTA — NO AI button */}
        <div className="kh-reveal kh-visible kh-reveal-d3">
          <Link href="/tours" style={{
            display: 'inline-flex', alignItems: 'center', gap: '8px',
            padding: '14px 40px', borderRadius: '100px',
            background: 'linear-gradient(135deg, var(--kh-accent) 0%, #b83500 100%)',
            color: '#fff', fontSize: '16px', fontWeight: 700, textDecoration: 'none',
            fontFamily: FO, boxShadow: '0 8px 32px var(--kh-accent-glow)',
            transition: 'transform 200ms ease, box-shadow 200ms ease',
          }}
            onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.transform = 'scale(1.04)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.transform = 'scale(1)'; }}
          >
            Исследовать
          </Link>
        </div>
      </div>

      {/* Scroll indicator */}
      <div aria-hidden="true" style={{ position: 'absolute', bottom: '120px', left: '50%', transform: 'translateX(-50%)', opacity: scrollY > 60 ? 0 : 0.4, transition: 'opacity 400ms ease', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
        <div style={{ width: '1px', height: '48px', background: 'linear-gradient(to bottom, var(--kh-text-dim), transparent)' }} />
        <span style={{ fontSize: '10px', letterSpacing: '0.15em', color: 'var(--kh-text-dim)', fontFamily: FO }}>SCROLL</span>
      </div>

      <MountainSilhouette parallax={scrollY} />
    </section>
  );
}

// ─── Marquee ──────────────────────────────────────────────────────────────────

function MarqueeStrip() {
  const t = MARQUEE_TEXT.repeat(2);
  return (
    <div style={{ borderTop: '1px solid var(--kh-border)', borderBottom: '1px solid var(--kh-border)', overflow: 'hidden', background: 'var(--kh-surface)', padding: '11px 0' }}>
      <div style={{ display: 'flex', whiteSpace: 'nowrap', animation: 'kh-marquee 30s linear infinite', willChange: 'transform' }}>
        <span style={{ fontSize: '12px', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--kh-text-dim)', fontFamily: FO, display: 'inline-block' }}>{t}</span>
      </div>
    </div>
  );
}

// ─── Activity card ────────────────────────────────────────────────────────────

function ActivityCard({ activity }: { activity: Activity }) {
  const [hov, setHov] = useState(false);
  return (
    <Link href={activity.href} onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)} style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '10px',
      padding: '20px 12px 18px', borderRadius: '16px',
      background: hov ? 'var(--kh-activity-hover-bg)' : 'var(--kh-surface)',
      border: `1px solid ${hov ? 'var(--kh-activity-hover-border)' : 'var(--kh-border)'}`,
      textDecoration: 'none', transform: hov ? 'translateY(-4px)' : 'translateY(0)',
      transition: 'background 200ms ease, border-color 200ms ease, transform 200ms ease', cursor: 'pointer',
    }}>
      <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: hov ? 'var(--kh-accent)' : 'var(--kh-text-dim)', transition: 'color 200ms ease' }}>
        {activity.icon}
      </span>
      <span style={{ fontSize: '12px', fontWeight: 600, color: hov ? 'var(--kh-text)' : 'var(--kh-text-dim)', textAlign: 'center', letterSpacing: '0.02em', fontFamily: FO, transition: 'color 200ms ease' }}>
        {activity.label}
      </span>
    </Link>
  );
}

// ─── Activities section ───────────────────────────────────────────────────────

function ActivitiesSection() {
  return (
    <section style={{ padding: '64px 20px', maxWidth: '720px', margin: '0 auto' }}>
      <Reveal>
        <p style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--kh-accent)', marginBottom: '8px', fontFamily: FO }}>АКТИВНОСТИ</p>
        <h2 style={{ fontFamily: FP, fontSize: 'clamp(24px, 5vw, 36px)', fontWeight: 700, color: 'var(--kh-text)', margin: '0 0 32px', lineHeight: 1.2 }}>Выбери своё приключение</h2>
      </Reveal>
      <div className="grid-activities" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }}>
        <style>{`@media(max-width:540px){.grid-activities{grid-template-columns:repeat(2,1fr)!important}}`}</style>
        {ACTIVITIES.map((a, i) => (
          <Reveal key={a.href} delay={(((i % 4) + 1) as 1 | 2 | 3 | 4)}><ActivityCard activity={a} /></Reveal>
        ))}
      </div>
    </section>
  );
}

// ─── Bento card — stroke SVG decoration instead of emoji ──────────────────────

function BentoCard({ item }: { item: BentoItem }) {
  const [hov, setHov] = useState(false);
  return (
    <Link href={item.href} onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)} style={{
      display: 'flex', flexDirection: 'column', justifyContent: 'flex-end',
      padding: '16px', borderRadius: '20px',
      background: `linear-gradient(135deg, ${item.bg}20, ${item.bg}0d)`,
      border: `1px solid ${item.tagColor ? item.tagColor + '30' : 'var(--kh-border)'}`,
      gridColumn: item.colSpan ? `span ${item.colSpan}` : 'span 1',
      gridRow: item.rowSpan ? `span ${item.rowSpan}` : 'span 1',
      textDecoration: 'none', position: 'relative', overflow: 'hidden',
      transform: hov ? 'scale(1.02)' : 'scale(1)',
      transition: 'transform 250ms var(--kh-ease)', cursor: 'pointer', minHeight: '140px',
    }}>
      {/* Decorative stroke SVG — NOT emoji */}
      <span aria-hidden="true" style={{ position: 'absolute', top: '10px', right: '12px', pointerEvents: 'none' }}>
        {item.svgIcon}
      </span>
      {item.tag && (
        <span style={{
          display: 'inline-block', marginBottom: '8px', padding: '3px 9px', borderRadius: '100px',
          fontSize: '10px', fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase',
          background: `${item.tagColor ?? 'var(--kh-accent)'}22`,
          border: `1px solid ${item.tagColor ?? 'var(--kh-accent)'}40`,
          color: item.tagColor ?? 'var(--kh-accent)', fontFamily: FO, alignSelf: 'flex-start',
        }}>{item.tag}</span>
      )}
      <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--kh-text)', margin: '0 0 3px', fontFamily: FP, lineHeight: 1.25 }}>{item.title}</h3>
      <p style={{ fontSize: '12px', color: 'var(--kh-text-dim)', margin: 0, fontFamily: FO }}>{item.subtitle}</p>
    </Link>
  );
}

// ─── Bento section ────────────────────────────────────────────────────────────

function BentoSection() {
  return (
    <section style={{ padding: '0 20px 64px', maxWidth: '720px', margin: '0 auto' }}>
      <Reveal>
        <p style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--kh-accent2)', marginBottom: '8px', fontFamily: FO }}>ПОПУЛЯРНОЕ</p>
        <h2 style={{ fontFamily: FP, fontSize: 'clamp(22px, 5vw, 34px)', fontWeight: 700, color: 'var(--kh-text)', margin: '0 0 24px', lineHeight: 1.2 }}>Куда едут этим летом</h2>
      </Reveal>
      <div className="bento-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gridAutoRows: '140px', gap: '10px' }}>
        <style>{`@media(max-width:600px){.bento-grid{grid-template-columns:repeat(2,1fr)!important;grid-auto-rows:120px!important}}`}</style>
        {BENTO_ITEMS.map((it, i) => (
          <Reveal key={it.title} delay={((i % 3) + 1) as 1 | 2 | 3}><BentoCard item={it} /></Reveal>
        ))}
      </div>
    </section>
  );
}

// ─── Feed item — monochrome SVG in neutral circle ─────────────────────────────

function FeedItemCard({ item }: { item: FeedItem }) {
  const [hov, setHov] = useState(false);
  return (
    <div onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)} style={{
      display: 'flex', alignItems: 'center', gap: '14px',
      padding: '14px 16px', borderRadius: '14px',
      background: hov ? 'var(--kh-surface2)' : 'var(--kh-surface)',
      border: '1px solid var(--kh-border)', transition: 'background 200ms ease', cursor: 'default',
    }}>
      {/* Icon circle */}
      <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--kh-surface2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        {item.svgIcon}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ margin: 0, fontSize: '13px', color: 'var(--kh-text)', fontFamily: FO, lineHeight: 1.4 }}>{item.text}</p>
      </div>
      <span style={{ fontSize: '11px', color: 'var(--kh-text-dim)', flexShrink: 0, fontFamily: FO }}>{item.time}</span>
    </div>
  );
}

// ─── Feed section ─────────────────────────────────────────────────────────────

function FeedSection() {
  return (
    <section style={{ padding: '0 20px 64px', maxWidth: '720px', margin: '0 auto' }}>
      <Reveal>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '24px' }}>
          <div style={{ position: 'relative', width: '10px', height: '10px', flexShrink: 0 }}>
            <span aria-hidden="true" style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: '#3FB950', animation: 'kh-sos-pulse 1.5s ease-out infinite' }} />
            <span style={{ position: 'absolute', inset: '1px', borderRadius: '50%', background: '#3FB950', display: 'block' }} />
          </div>
          <span style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#3FB950', fontFamily: FO }}>ПРЯМО СЕЙЧАС</span>
        </div>
        <h2 style={{ fontFamily: FP, fontSize: 'clamp(22px, 5vw, 34px)', fontWeight: 700, color: 'var(--kh-text)', margin: '0 0 20px', lineHeight: 1.2 }}>Что происходит</h2>
      </Reveal>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {FEED_ITEMS.map((it, i) => (
          <Reveal key={i} delay={((i % 4) + 1) as 1 | 2 | 3 | 4}><FeedItemCard item={it} /></Reveal>
        ))}
      </div>
    </section>
  );
}

// ─── CTA ──────────────────────────────────────────────────────────────────────

function CTASection() {
  const [hov, setHov] = useState(false);
  return (
    <section style={{ position: 'relative', overflow: 'hidden', padding: '64px 20px 80px', textAlign: 'center' }}>
      <div aria-hidden="true" style={{ position: 'absolute', bottom: '-20%', left: '50%', transform: 'translateX(-50%)', width: '600px', height: '300px', background: 'radial-gradient(ellipse, rgba(232,83,14,0.12) 0%, transparent 70%)', pointerEvents: 'none' }} />
      <div style={{ position: 'relative', zIndex: 1, maxWidth: '560px', margin: '0 auto' }}>
        <Reveal>
          <h2 style={{ fontFamily: FP, fontSize: 'clamp(26px, 6vw, 42px)', fontWeight: 700, color: 'var(--kh-text)', margin: '0 0 12px', lineHeight: 1.15 }}>Готов к экспедиции?</h2>
          <p style={{ fontSize: '15px', color: 'var(--kh-text-dim)', margin: '0 0 32px', fontFamily: FO, lineHeight: 1.6 }}>Более 200 туров от проверенных операторов Камчатки</p>
        </Reveal>
        <Reveal delay={2}>
          <Link href="/tours" onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)} style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            padding: '14px 40px', borderRadius: '100px',
            background: hov ? 'var(--kh-accent)' : 'transparent',
            border: '1.5px solid var(--kh-accent)',
            color: hov ? '#fff' : 'var(--kh-accent)',
            fontSize: '16px', fontWeight: 700, textDecoration: 'none', fontFamily: FO,
            transition: 'background 250ms ease, color 250ms ease',
            boxShadow: hov ? '0 8px 32px var(--kh-accent-glow)' : 'none',
          }}>Начать поиск</Link>
        </Reveal>
      </div>
    </section>
  );
}

// ─── Bottom Nav (true pill, 4 items, no "Вишл") ──────────────────────────────

function HomeBottomNav() {
  const navItems = [
    { icon: <Home size={20} strokeWidth={1.5} />,       label: 'Дом',       href: '/' },
    { icon: <MapPin size={20} strokeWidth={1.5} />,     label: 'Карта',     href: '/map' },
    { icon: <Heart size={20} strokeWidth={1.5} />,      label: 'Избранное', href: '/profile/wishlist' },
    { icon: <UserCircle size={20} strokeWidth={1.5} />, label: 'ЛК',        href: '/profile' },
  ] as const;

  return (
    <nav className="md:hidden" aria-label="Нижняя навигация" style={{
      position: 'fixed', bottom: '16px', left: '50%', transform: 'translateX(-50%)',
      zIndex: 100, display: 'flex', gap: '4px', padding: '6px',
      borderRadius: '100px',
      background: 'var(--kh-nav-bg)',
      backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
      border: '1px solid var(--kh-border)',
      boxShadow: 'var(--kh-nav-shadow)',
    }}>
      {navItems.map((item, i) => {
        const isActive = i === 0;
        return (
          <Link key={item.href} href={item.href} aria-label={item.label} style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '2px',
            padding: '10px 18px', borderRadius: '100px', minWidth: '48px',
            background: isActive ? 'var(--kh-accent)' : 'transparent',
            color: isActive ? '#fff' : 'var(--kh-text-dim)',
            textDecoration: 'none', transition: 'all 200ms ease',
            fontFamily: FO, fontSize: '10px', fontWeight: isActive ? 600 : 400,
          }}>
            {item.icon}
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function HomePageClient() {
  const [mounted, setMounted] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const scrollY = useScrollY();

  useEffect(() => { setMounted(true); }, []);

  const handleScroll = useCallback(() => {
    setScrolled(window.scrollY > 100);
  }, []);

  useEffect(() => {
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [handleScroll]);

  if (!mounted) {
    return <div style={{ minHeight: '100dvh', background: 'var(--kh-bg)' }} />;
  }

  return (
    <div style={{ background: 'var(--kh-bg)', color: 'var(--kh-text)', minHeight: '100dvh', transition: 'background-color 300ms ease, color 300ms ease' }}>
      <FilmGrain />
      <StickyHeader scrolled={scrolled} />
      <HeroSection scrollY={scrollY} />
      <MarqueeStrip />
      <ActivitiesSection />
      <BentoSection />
      <FeedSection />
      <CTASection />
      <HomeBottomNav />
      <SOSButton />
    </div>
  );
}
