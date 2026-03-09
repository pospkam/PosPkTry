'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import Link from 'next/link';
import { Search, UserCircle, MapPin, Heart, Home } from 'lucide-react';
import { useInView } from '@/hooks/useInView';
import SOSButton from '@/components/shared/SOSButton';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Activity {
  emoji: string;
  label: string;
  href: string;
}

interface BentoItem {
  title: string;
  subtitle: string;
  tag?: string;
  tagColor?: string;
  emoji: string;
  bg: string;
  colSpan?: number;
  rowSpan?: number;
  href: string;
}

interface FeedItem {
  emoji: string;
  text: string;
  time: string;
}

// ─── Data ─────────────────────────────────────────────────────────────────────

const ACTIVITIES: Activity[] = [
  { emoji: '🌋', label: 'Вулканы',       href: '/tours?category=vulkani' },
  { emoji: '🎣', label: 'Рыбалка',       href: '/tours?category=rybalka' },
  { emoji: '♨️', label: 'Термы',         href: '/tours?category=termalnye_istochniki' },
  { emoji: '🏔', label: 'Сплавы',        href: '/tours?category=rivers' },
  { emoji: '🚤', label: 'Морские',       href: '/tours?category=morskie_progulki' },
  { emoji: '🐻', label: 'Медведи',       href: '/tours?category=medvedi' },
  { emoji: '🚁', label: 'Вертолёты',     href: '/tours?category=vertoletnye_tury' },
  { emoji: '🛷', label: 'Снегоход',      href: '/tours?category=snegohod' },
];

const BENTO_ITEMS: BentoItem[] = [
  {
    title: 'Долина Гейзеров',
    subtitle: 'UNESCO · Вертолётный тур',
    tag: 'ТОП',
    tagColor: 'var(--kh-accent)',
    emoji: '💧',
    bg: '#1a0d00',
    colSpan: 2,
    rowSpan: 2,
    href: '/tours?category=geyzery',
  },
  {
    title: 'Курильское озеро',
    subtitle: 'Медведи · Нерка',
    tag: 'СЕЗОН',
    tagColor: 'var(--kh-accent2)',
    emoji: '🐟',
    bg: '#00111a',
    href: '/tours?category=lakes',
  },
  {
    title: 'Авачинская бухта',
    subtitle: 'Морские прогулки · Косатки',
    emoji: '🐋',
    bg: '#001122',
    href: '/tours?category=morskie_progulki',
  },
  {
    title: 'Мутновский вулкан',
    subtitle: 'Сложность Easy',
    tag: 'EASY',
    tagColor: '#3a9c5f',
    emoji: '🌋',
    bg: '#1a0800',
    rowSpan: 2,
    href: '/tours?category=vulkani',
  },
  {
    title: 'Быстрая река',
    subtitle: 'Сплав · Рыбалка',
    emoji: '🚣',
    bg: '#001a10',
    href: '/tours?category=rivers',
  },
  {
    title: 'Паратунка',
    subtitle: 'Термальные источники · Релакс',
    tag: 'РЕЛАКС',
    tagColor: 'var(--kh-ice)',
    emoji: '♨️',
    bg: '#0d1a1a',
    colSpan: 2,
    href: '/tours?category=termalnye_istochniki',
  },
];

const FEED_ITEMS: FeedItem[] = [
  { emoji: '🌋', text: 'Иван забронировал тур на Горелый вулкан',     time: '2 часа назад' },
  { emoji: '🐻', text: 'Наталья оставила отзыв о туре к медведям',     time: '5 часов назад' },
  { emoji: '🚁', text: 'Добавлен новый вертолётный маршрут "Узон"',    time: 'вчера' },
  { emoji: '♨️', text: 'Сергей вернулся из экспедиции на термы Вачкажец', time: '2 дня назад' },
];

const MARQUEE_TEXT =
  '29 активных вулканов  ◆  400+ ледников  ◆  Медведи · Косатки · Киты  ◆  Долина Гейзеров  ◆  UNESCO Heritage  ◆  60 млрд ₽ туррынок  ◆  ';

// ─── Parallax hook ────────────────────────────────────────────────────────────

function useScrollY(): number {
  const [scrollY, setScrollY] = useState(0);
  useEffect(() => {
    const handler = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', handler, { passive: true });
    return () => window.removeEventListener('scroll', handler);
  }, []);
  return scrollY;
}

// ─── Reveal helper ────────────────────────────────────────────────────────────

interface RevealProps {
  children: React.ReactNode;
  delay?: 1 | 2 | 3 | 4;
  className?: string;
  style?: React.CSSProperties;
}

function Reveal({ children, delay, className = '', style }: RevealProps) {
  const [ref, visible] = useInView();
  const delayClass = delay ? `kh-reveal-d${delay}` : '';
  return (
    <div
      ref={ref}
      className={`kh-reveal ${visible ? 'kh-visible' : ''} ${delayClass} ${className}`}
      style={style}
    >
      {children}
    </div>
  );
}

// ─── Film grain ───────────────────────────────────────────────────────────────

function FilmGrain() {
  return (
    <div
      aria-hidden="true"
      style={{
        position: 'fixed', inset: 0, zIndex: 999,
        pointerEvents: 'none',
        opacity: 0.035,
        animation: 'kh-grain 8s steps(10) infinite',
        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='300'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='300' height='300' filter='url(%23noise)'/%3E%3C/svg%3E")`,
        backgroundRepeat: 'repeat',
        backgroundSize: '300px 300px',
      }}
    />
  );
}

// ─── Mountain SVG ─────────────────────────────────────────────────────────────

interface MountainSilhouetteProps {
  parallax: number;
}

function MountainSilhouette({ parallax }: MountainSilhouetteProps) {
  return (
    <div
      aria-hidden="true"
      style={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        transform: `translateY(${parallax * -0.12}px)`,
        transition: 'transform 0.05s linear',
        pointerEvents: 'none',
      }}
    >
      {/* Back range — dimmer */}
      <svg
        viewBox="0 0 1200 180"
        preserveAspectRatio="none"
        style={{ display: 'block', width: '100%', height: '120px', opacity: 0.4 }}
      >
        <path
          d="M0,180 L0,110 C80,90 130,60 200,75 C270,90 290,50 360,30 C430,10 450,55 520,65 C590,75 620,40 700,20 C780,0 800,35 880,50 C960,65 990,30 1060,45 C1130,60 1160,40 1200,55 L1200,180 Z"
          fill="var(--kh-surface)"
        />
      </svg>
      {/* Front range — solid */}
      <svg
        viewBox="0 0 1200 140"
        preserveAspectRatio="none"
        style={{ display: 'block', width: '100%', height: '100px', marginTop: '-40px' }}
      >
        <path
          d="M0,140 L0,100 C60,85 100,70 160,80 C220,90 250,55 320,40 C390,25 410,60 490,70 C570,80 600,45 680,30 C760,15 790,50 860,60 C930,70 960,35 1040,48 C1120,61 1160,40 1200,50 L1200,140 Z"
          fill="var(--kh-bg)"
        />
      </svg>
    </div>
  );
}

// ─── Sticky Header ────────────────────────────────────────────────────────────

function StickyHeader({ scrolled }: { scrolled: boolean }) {
  const fontOutfit = "var(--font-outfit,'Outfit',system-ui,sans-serif)";
  return (
    <header
      style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 80,
        padding: '12px 20px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        gap: '12px',
        background: scrolled ? 'rgba(10,10,10,0.88)' : 'transparent',
        backdropFilter: scrolled ? 'blur(20px)' : 'none',
        WebkitBackdropFilter: scrolled ? 'blur(20px)' : 'none',
        borderBottom: scrolled ? '1px solid var(--kh-border)' : 'none',
        transition: 'background 300ms ease, backdrop-filter 300ms ease, border-color 300ms ease',
      }}
    >
      {/* Logo */}
      <Link
        href="/"
        aria-label="KamchatourHub"
        style={{
          width: '36px', height: '36px', borderRadius: '10px',
          background: 'linear-gradient(135deg, var(--kh-accent) 0%, #b83500 100%)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#fff', fontWeight: 800, fontSize: '14px',
          textDecoration: 'none', letterSpacing: '-0.02em',
          fontFamily: fontOutfit,
          flexShrink: 0,
        }}
      >
        KH
      </Link>

      {/* Search pill */}
      <Link
        href="/tours"
        style={{
          flex: 1, maxWidth: '320px',
          display: 'flex', alignItems: 'center', gap: '8px',
          padding: '9px 16px', borderRadius: '100px',
          background: 'rgba(255,255,255,0.07)',
          border: '1px solid var(--kh-border-strong)',
          color: 'var(--kh-text-dim)', textDecoration: 'none',
          fontSize: '13px', fontFamily: fontOutfit,
          transition: 'background 200ms ease, border-color 200ms ease',
        }}
        onMouseEnter={e => {
          (e.currentTarget as HTMLAnchorElement).style.background = 'rgba(255,255,255,0.12)';
          (e.currentTarget as HTMLAnchorElement).style.borderColor = 'var(--kh-border-strong)';
        }}
        onMouseLeave={e => {
          (e.currentTarget as HTMLAnchorElement).style.background = 'rgba(255,255,255,0.07)';
          (e.currentTarget as HTMLAnchorElement).style.borderColor = 'var(--kh-border-strong)';
        }}
      >
        <Search size={14} />
        Найти тур
      </Link>

      {/* Profile */}
      <Link
        href="/profile"
        aria-label="Личный кабинет"
        style={{
          width: '36px', height: '36px', borderRadius: '50%',
          border: '1px solid var(--kh-border-strong)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'var(--kh-text-dim)', textDecoration: 'none',
          flexShrink: 0,
          transition: 'border-color 200ms ease, color 200ms ease',
        }}
        onMouseEnter={e => {
          (e.currentTarget as HTMLAnchorElement).style.borderColor = 'var(--kh-accent)';
          (e.currentTarget as HTMLAnchorElement).style.color = 'var(--kh-text)';
        }}
        onMouseLeave={e => {
          (e.currentTarget as HTMLAnchorElement).style.borderColor = 'var(--kh-border-strong)';
          (e.currentTarget as HTMLAnchorElement).style.color = 'var(--kh-text-dim)';
        }}
      >
        <UserCircle size={18} strokeWidth={1.5} />
      </Link>
    </header>
  );
}

// ─── Hero ─────────────────────────────────────────────────────────────────────

function HeroSection({ scrollY }: { scrollY: number }) {
  const fontPlayfair = "var(--font-playfair,'Playfair Display',Georgia,serif)";
  const fontOutfit   = "var(--font-outfit,'Outfit',system-ui,sans-serif)";

  return (
    <section
      role="banner"
      style={{
        position: 'relative', width: '100%',
        minHeight: '100dvh', overflow: 'hidden',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'radial-gradient(ellipse 80% 60% at 50% 80%, #1a0800 0%, var(--kh-bg) 60%)',
      }}
    >
      {/* Animated volcanic glow — lava */}
      <div aria-hidden="true" style={{
        position: 'absolute', inset: '-50%',
        background: 'radial-gradient(ellipse 55% 40% at 30% 65%, rgba(232,83,14,0.22) 0%, transparent 70%)',
        animation: 'kh-hero-glow 14s ease-in-out infinite',
        pointerEvents: 'none',
      }} />
      {/* Animated ocean glow */}
      <div aria-hidden="true" style={{
        position: 'absolute', inset: '-50%',
        background: 'radial-gradient(ellipse 50% 35% at 70% 35%, rgba(45,125,210,0.18) 0%, transparent 70%)',
        animation: 'kh-hero-glow2 17s ease-in-out infinite',
        pointerEvents: 'none',
      }} />

      {/* Content */}
      <div
        style={{
          position: 'relative', zIndex: 10,
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', textAlign: 'center',
          padding: '0 24px', maxWidth: '720px',
          paddingTop: '72px',
        }}
      >
        {/* Coordinates label */}
        <div
          className="kh-reveal kh-visible"
          style={{ marginBottom: '20px' }}
        >
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: '6px',
            fontSize: '11px', fontWeight: 600,
            letterSpacing: '0.18em', textTransform: 'uppercase',
            color: 'var(--kh-accent)',
            fontFamily: fontOutfit,
          }}>
            <span style={{ opacity: 0.7 }}>◎</span>
            55°N · Камчатский край · Россия
          </span>
        </div>

        {/* Title */}
        <h1
          className="kh-reveal kh-visible kh-reveal-d1"
          style={{
            fontFamily: fontPlayfair,
            fontSize: 'clamp(36px, 8vw, 80px)',
            fontWeight: 700,
            lineHeight: 1.1,
            margin: '0 0 16px',
            background: 'linear-gradient(180deg, var(--kh-text) 30%, var(--kh-text-dim) 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            letterSpacing: '-0.02em',
          }}
        >
          Здесь начинается<br />Россия
        </h1>

        {/* Subtitle */}
        <p
          className="kh-reveal kh-visible kh-reveal-d2"
          style={{
            fontFamily: fontPlayfair,
            fontStyle: 'italic',
            fontSize: 'clamp(16px, 3.5vw, 24px)',
            color: 'var(--kh-text-dim)',
            margin: '0 0 36px',
            letterSpacing: '0.02em',
          }}
        >
          Камчатка — земля огня и льда
        </p>

        {/* CTA */}
        <div
          className="kh-reveal kh-visible kh-reveal-d3"
          style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'center' }}
        >
          <Link
            href="/tours"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '8px',
              padding: '14px 36px', borderRadius: '100px',
              background: `linear-gradient(135deg, var(--kh-accent) 0%, #b83500 100%)`,
              color: '#fff',
              fontSize: '16px', fontWeight: 700,
              textDecoration: 'none',
              fontFamily: fontOutfit,
              boxShadow: `0 8px 32px var(--kh-accent-glow)`,
              transition: 'transform 200ms ease, box-shadow 200ms ease, opacity 200ms ease',
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLAnchorElement).style.transform = 'scale(1.04)';
              (e.currentTarget as HTMLAnchorElement).style.boxShadow = `0 12px 40px var(--kh-accent-glow)`;
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLAnchorElement).style.transform = 'scale(1)';
              (e.currentTarget as HTMLAnchorElement).style.boxShadow = `0 8px 32px var(--kh-accent-glow)`;
            }}
          >
            Исследовать
          </Link>
          <button
            type="button"
            onClick={() => {
              const btn = document.querySelector<HTMLElement>('[aria-label="AI помощник"]');
              if (btn) btn.click();
            }}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '8px',
              padding: '13px 28px', borderRadius: '100px',
              background: 'transparent',
              border: '1px solid var(--kh-border-strong)',
              color: 'var(--kh-text-dim)',
              fontSize: '15px', fontWeight: 500,
              cursor: 'pointer',
              fontFamily: fontOutfit,
              transition: 'border-color 200ms ease, color 200ms ease',
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--kh-accent)';
              (e.currentTarget as HTMLButtonElement).style.color = 'var(--kh-text)';
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--kh-border-strong)';
              (e.currentTarget as HTMLButtonElement).style.color = 'var(--kh-text-dim)';
            }}
          >
            ✦ Спросить AI
          </button>
        </div>
      </div>

      {/* Scroll indicator — disappears on scroll */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute', bottom: '120px', left: '50%',
          transform: 'translateX(-50%)',
          opacity: scrollY > 60 ? 0 : 0.4,
          transition: 'opacity 400ms ease',
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px',
        }}
      >
        <div style={{
          width: '1px', height: '48px',
          background: 'linear-gradient(to bottom, var(--kh-text-dim), transparent)',
        }} />
        <span style={{ fontSize: '10px', letterSpacing: '0.15em', color: 'var(--kh-text-dim)', fontFamily: "var(--font-outfit,'Outfit',sans-serif)" }}>
          SCROLL
        </span>
      </div>

      {/* Mountain silhouette */}
      <MountainSilhouette parallax={scrollY} />
    </section>
  );
}

// ─── Marquee ──────────────────────────────────────────────────────────────────

function MarqueeStrip() {
  const text = MARQUEE_TEXT.repeat(2); // doubled for seamless loop
  return (
    <div style={{
      borderTop:    '1px solid rgba(255,255,255,0.05)',
      borderBottom: '1px solid rgba(255,255,255,0.05)',
      overflow: 'hidden',
      background: 'var(--kh-surface)',
      padding: '11px 0',
    }}>
      <div style={{
        display: 'flex', whiteSpace: 'nowrap',
        animation: 'kh-marquee 30s linear infinite',
        willChange: 'transform',
      }}>
        <span style={{
          fontSize: '12px', letterSpacing: '0.14em',
          textTransform: 'uppercase', color: 'var(--kh-text-dim)',
          fontFamily: "var(--font-outfit,'Outfit',sans-serif)",
          paddingRight: '0',
          display: 'inline-block',
        }}>
          {text}
        </span>
      </div>
    </div>
  );
}

// ─── Activity card ────────────────────────────────────────────────────────────

function ActivityCard({ activity }: { activity: Activity }) {
  const [hovered, setHovered] = useState(false);
  return (
    <Link
      href={activity.href}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', gap: '10px',
        padding: '20px 12px 18px',
        borderRadius: '16px',
        background: hovered ? 'rgba(232,83,14,0.06)' : 'var(--kh-surface)',
        border: `1px solid ${hovered ? 'rgba(232,83,14,0.2)' : 'var(--kh-border)'}`,
        textDecoration: 'none',
        transform: hovered ? 'translateY(-4px)' : 'translateY(0)',
        transition: 'background 200ms ease, border-color 200ms ease, transform 200ms ease',
        cursor: 'pointer',
      }}
    >
      <span style={{ fontSize: '28px', lineHeight: 1, filter: hovered ? 'saturate(1.3)' : 'none', transition: 'filter 200ms ease' }}>
        {activity.emoji}
      </span>
      <span style={{
        fontSize: '12px', fontWeight: 600,
        color: hovered ? 'var(--kh-text)' : 'var(--kh-text-dim)',
        textAlign: 'center', letterSpacing: '0.02em',
        fontFamily: "var(--font-outfit,'Outfit',sans-serif)",
        transition: 'color 200ms ease',
      }}>
        {activity.label}
      </span>
    </Link>
  );
}

// ─── Activities section ───────────────────────────────────────────────────────

function ActivitiesSection() {
  const fontPlayfair = "var(--font-playfair,'Playfair Display',Georgia,serif)";
  const fontOutfit   = "var(--font-outfit,'Outfit',system-ui,sans-serif)";

  return (
    <section style={{ padding: '64px 20px', maxWidth: '720px', margin: '0 auto' }}>
      <Reveal>
        <p style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--kh-accent)', marginBottom: '8px', fontFamily: fontOutfit }}>
          АКТИВНОСТИ
        </p>
        <h2 style={{ fontFamily: fontPlayfair, fontSize: 'clamp(24px, 5vw, 36px)', fontWeight: 700, color: 'var(--kh-text)', margin: '0 0 32px', lineHeight: 1.2 }}>
          Выбери своё приключение
        </h2>
      </Reveal>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: '10px',
      }}
        className="grid-activities"
      >
        <style>{`
          @media (max-width: 540px) { .grid-activities { grid-template-columns: repeat(2, 1fr) !important; } }
        `}</style>
        {ACTIVITIES.map((act, i) => (
          <Reveal key={act.href} delay={(((i % 4) + 1) as 1 | 2 | 3 | 4)}>
            <ActivityCard activity={act} />
          </Reveal>
        ))}
      </div>
    </section>
  );
}

// ─── Bento card ───────────────────────────────────────────────────────────────

function BentoCard({ item }: { item: BentoItem }) {
  const fontOutfit = "var(--font-outfit,'Outfit',system-ui,sans-serif)";
  const [hovered, setHovered] = useState(false);

  return (
    <Link
      href={item.href}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex', flexDirection: 'column', justifyContent: 'flex-end',
        padding: '16px',
        borderRadius: '20px',
        background: item.bg,
        border: `1px solid ${item.tagColor ? item.tagColor + '30' : 'var(--kh-border)'}`,
        gridColumn: item.colSpan ? `span ${item.colSpan}` : 'span 1',
        gridRow:    item.rowSpan ? `span ${item.rowSpan}` : 'span 1',
        textDecoration: 'none',
        position: 'relative', overflow: 'hidden',
        transform: hovered ? 'scale(1.02)' : 'scale(1)',
        transition: 'transform 250ms var(--kh-ease)',
        cursor: 'pointer',
        minHeight: '140px',
      }}
    >
      {/* Decorative emoji */}
      <span aria-hidden="true" style={{
        position: 'absolute', top: '12px', right: '16px',
        fontSize: '40px', opacity: 0.12, transform: 'rotate(10deg)',
        pointerEvents: 'none',
      }}>
        {item.emoji}
      </span>
      {/* Tag */}
      {item.tag && (
        <span style={{
          display: 'inline-block', marginBottom: '8px',
          padding: '3px 9px', borderRadius: '100px',
          fontSize: '10px', fontWeight: 800,
          letterSpacing: '0.12em', textTransform: 'uppercase',
          background: `${item.tagColor ?? 'var(--kh-accent)'}22`,
          border: `1px solid ${item.tagColor ?? 'var(--kh-accent)'}40`,
          color:    item.tagColor ?? 'var(--kh-accent)',
          fontFamily: fontOutfit,
          alignSelf: 'flex-start',
        }}>
          {item.tag}
        </span>
      )}
      <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--kh-text)', margin: '0 0 3px', fontFamily: "var(--font-playfair,'Playfair Display',Georgia,serif)", lineHeight: 1.25 }}>
        {item.title}
      </h3>
      <p style={{ fontSize: '12px', color: 'var(--kh-text-dim)', margin: 0, fontFamily: fontOutfit }}>
        {item.subtitle}
      </p>
    </Link>
  );
}

// ─── Bento section ────────────────────────────────────────────────────────────

function BentoSection() {
  const fontPlayfair = "var(--font-playfair,'Playfair Display',Georgia,serif)";
  const fontOutfit   = "var(--font-outfit,'Outfit',system-ui,sans-serif)";

  return (
    <section style={{ padding: '0 20px 64px', maxWidth: '720px', margin: '0 auto' }}>
      <Reveal>
        <p style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--kh-accent2)', marginBottom: '8px', fontFamily: fontOutfit }}>
          ПОПУЛЯРНОЕ
        </p>
        <h2 style={{ fontFamily: fontPlayfair, fontSize: 'clamp(22px, 5vw, 34px)', fontWeight: 700, color: 'var(--kh-text)', margin: '0 0 24px', lineHeight: 1.2 }}>
          Куда едут этим летом
        </h2>
      </Reveal>

      <div
        className="bento-grid"
        style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gridAutoRows: '140px', gap: '10px' }}
      >
        <style>{`
          @media (max-width: 600px) {
            .bento-grid {
              grid-template-columns: repeat(2, 1fr) !important;
              grid-auto-rows: 120px !important;
            }
          }
        `}</style>
        {BENTO_ITEMS.map((item, i) => (
          <Reveal key={item.title} delay={((i % 3) + 1) as 1 | 2 | 3}>
            <BentoCard item={item} />
          </Reveal>
        ))}
      </div>
    </section>
  );
}

// ─── Feed section ─────────────────────────────────────────────────────────────

function FeedSection() {
  const fontPlayfair = "var(--font-playfair,'Playfair Display',Georgia,serif)";
  const fontOutfit   = "var(--font-outfit,'Outfit',system-ui,sans-serif)";

  return (
    <section style={{ padding: '0 20px 64px', maxWidth: '720px', margin: '0 auto' }}>
      <Reveal>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '24px' }}>
          {/* Pulsing green dot */}
          <div style={{ position: 'relative', width: '10px', height: '10px', flexShrink: 0 }}>
            <span
              aria-hidden="true"
              style={{
                position: 'absolute', inset: 0,
                borderRadius: '50%', background: '#3FB950',
                animation: 'kh-sos-pulse 1.8s ease-out infinite',
                animationDuration: '1.5s',
              }}
            />
            <span style={{ position: 'absolute', inset: '1px', borderRadius: '50%', background: '#3FB950', display: 'block' }} />
          </div>
          <span style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#3FB950', fontFamily: fontOutfit }}>
            ПРЯМО СЕЙЧАС
          </span>
        </div>
        <h2 style={{ fontFamily: fontPlayfair, fontSize: 'clamp(22px, 5vw, 34px)', fontWeight: 700, color: 'var(--kh-text)', margin: '0 0 20px', lineHeight: 1.2 }}>
          Что происходит
        </h2>
      </Reveal>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {FEED_ITEMS.map((item, i) => (
          <Reveal key={i} delay={((i % 4) + 1) as 1 | 2 | 3 | 4}>
            <FeedItemCard item={item} />
          </Reveal>
        ))}
      </div>
    </section>
  );
}

function FeedItemCard({ item }: { item: FeedItem }) {
  const fontOutfit = "var(--font-outfit,'Outfit',system-ui,sans-serif)";
  const [hovered, setHovered] = useState(false);

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex', alignItems: 'center', gap: '14px',
        padding: '14px 16px',
        borderRadius: '14px',
        background: hovered ? 'var(--kh-surface2)' : 'var(--kh-surface)',
        border: '1px solid var(--kh-border)',
        transition: 'background 200ms ease',
        cursor: 'default',
      }}
    >
      <span style={{ fontSize: '22px', flexShrink: 0 }}>{item.emoji}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ margin: 0, fontSize: '13px', color: 'var(--kh-text)', fontFamily: fontOutfit, lineHeight: 1.4 }}>
          {item.text}
        </p>
      </div>
      <span style={{ fontSize: '11px', color: 'var(--kh-text-dim)', flexShrink: 0, fontFamily: fontOutfit }}>
        {item.time}
      </span>
    </div>
  );
}

// ─── CTA section ──────────────────────────────────────────────────────────────

function CTASection() {
  const fontPlayfair = "var(--font-playfair,'Playfair Display',Georgia,serif)";
  const fontOutfit   = "var(--font-outfit,'Outfit',system-ui,sans-serif)";
  const [hovered, setHovered] = useState(false);

  return (
    <section style={{
      position: 'relative', overflow: 'hidden',
      padding: '64px 20px 80px', textAlign: 'center',
    }}>
      {/* Glow */}
      <div aria-hidden="true" style={{
        position: 'absolute', bottom: '-20%', left: '50%', transform: 'translateX(-50%)',
        width: '600px', height: '300px',
        background: 'radial-gradient(ellipse, rgba(232,83,14,0.12) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />
      <div style={{ position: 'relative', zIndex: 1, maxWidth: '560px', margin: '0 auto' }}>
        <Reveal>
          <h2 style={{ fontFamily: fontPlayfair, fontSize: 'clamp(26px, 6vw, 42px)', fontWeight: 700, color: 'var(--kh-text)', margin: '0 0 12px', lineHeight: 1.15 }}>
            Готов к экспедиции?
          </h2>
          <p style={{ fontSize: '15px', color: 'var(--kh-text-dim)', margin: '0 0 32px', fontFamily: fontOutfit, lineHeight: 1.6 }}>
            Более 200 туров от проверенных операторов Камчатки
          </p>
        </Reveal>
        <Reveal delay={2}>
          <Link
            href="/tours"
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            style={{
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              padding: '14px 40px', borderRadius: '100px',
              background: hovered ? 'var(--kh-accent)' : 'transparent',
              border: '1.5px solid var(--kh-accent)',
              color: hovered ? '#fff' : 'var(--kh-accent)',
              fontSize: '16px', fontWeight: 700, textDecoration: 'none',
              fontFamily: fontOutfit,
              transition: 'background 250ms ease, color 250ms ease',
              boxShadow: hovered ? '0 8px 32px var(--kh-accent-glow)' : 'none',
            }}
          >
            Начать поиск
          </Link>
        </Reveal>
      </div>
    </section>
  );
}

// ─── Home Bottom Nav ──────────────────────────────────────────────────────────

function HomeBottomNav() {
  const navItems = [
    { icon: <Home size={20} strokeWidth={1.5} />,    label: 'Дом',   href: '/'        },
    { icon: <MapPin size={20} strokeWidth={1.5} />,  label: 'Карта', href: '/map'     },
    { icon: <Heart size={20} strokeWidth={1.5} />,   label: 'Вишл',  href: '/profile/wishlist' },
    { icon: <UserCircle size={20} strokeWidth={1.5} />, label: 'ЛК', href: '/profile' },
  ] as const;
  const fontOutfit = "var(--font-outfit,'Outfit',system-ui,sans-serif)";

  return (
    <nav
      className="md:hidden"
      aria-label="Нижняя навигация"
      style={{
        position: 'fixed', bottom: '24px', left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 100,
        display: 'flex', gap: '4px',
        padding: '6px',
        borderRadius: '100px',
        background: 'rgba(20,20,20,0.85)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        border: '1px solid var(--kh-border-strong)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
      }}
    >
      {navItems.map((item, i) => {
        const isActive = i === 0;
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-label={item.label}
            style={{
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center',
              gap: '3px',
              padding: '8px 16px',
              borderRadius: '100px',
              background: isActive ? 'var(--kh-accent)' : 'transparent',
              color: isActive ? '#fff' : 'var(--kh-text-dim)',
              textDecoration: 'none',
              transition: 'background 200ms ease, color 200ms ease',
              minWidth: '52px',
            }}
          >
            {item.icon}
            <span style={{ fontSize: '9px', fontWeight: 600, letterSpacing: '0.04em', fontFamily: fontOutfit }}>
              {item.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function HomePageClient() {
  const [mounted, setMounted]   = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const scrollY = useScrollY();

  useEffect(() => {
    setMounted(true);
  }, []);

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
    <div style={{ background: 'var(--kh-bg)', color: 'var(--kh-text)', minHeight: '100dvh' }}>
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
