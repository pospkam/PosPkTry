'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Search, RefreshCw, Sun, Moon, User, Mountain, Clock, ChevronDown } from 'lucide-react';
import Logo from '@/components/shared/Logo';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useTheme } from '@/contexts/ThemeContext';
import BottomNav from '@/components/shared/BottomNav';

// ─── Категории ────────────────────────────────────────────────────────────────

const CATEGORIES = [
  { value: '',                     label: 'Все маршруты' },
  { value: 'vulkani',              label: 'Вулканы' },
  { value: 'rybalka',              label: 'Рыбалка' },
  { value: 'termalnye_istochniki', label: 'Термы' },
  { value: 'geyzery',              label: 'Гейзеры' },
  { value: 'trekking',             label: 'Треккинг' },
  { value: 'vertoletnye_tury',     label: 'Вертолёт' },
  { value: 'medvedi',              label: 'Медведи' },
  { value: 'morskie_progulki',     label: 'Море' },
  { value: 'snegohod',             label: 'Снегоход' },
  { value: 'dzhip',                label: 'Джип' },
  { value: 'lakes',                label: 'Озёра' },
  { value: 'mountains',            label: 'Горы' },
  { value: 'rivers',               label: 'Реки' },
  { value: 'eco',                  label: 'Эко' },
];

const CATEGORY_LABELS: Record<string, string> = {
  vulkani: 'Вулканы', rybalka: 'Рыбалка', termalnye_istochniki: 'Термы',
  geyzery: 'Гейзеры', trekking: 'Треккинг', vertoletnye_tury: 'Вертолёт',
  medvedi: 'Медведи', morskie_progulki: 'Море', snegohod: 'Снегоход',
  dzhip: 'Джип', lakes: 'Озёра', mountains: 'Горы', rivers: 'Реки', eco: 'Эко',
  // aliases
  volcanoes: 'Вулканы', fishing: 'Рыбалка', thermal: 'Термы',
  geysers: 'Гейзеры', snowmobile: 'Снегоход', jeep: 'Джип',
  wildlife: 'Медведи', adventure: 'Треккинг', helicopter: 'Вертолёт',
};

// Цвет категории на бейдже карточки
const CATEGORY_ACCENT: Record<string, string> = {
  vulkani: 'rgba(232,115,74,0.9)', geyzery: 'rgba(232,115,74,0.9)',
  morskie_progulki: 'rgba(0,168,204,0.9)', lakes: 'rgba(0,168,204,0.9)', rivers: 'rgba(0,168,204,0.9)',
  mountains: 'rgba(63,185,80,0.9)', trekking: 'rgba(63,185,80,0.9)', eco: 'rgba(63,185,80,0.9)',
  snegohod: 'rgba(210,153,34,0.9)', dzhip: 'rgba(210,153,34,0.9)',
  medvedi: 'rgba(232,115,74,0.75)', termalnye_istochniki: 'rgba(0,168,204,0.75)',
  rybalka: 'rgba(100,180,255,0.85)', vertoletnye_tury: 'rgba(180,120,255,0.85)',
};

// ─── Типы ─────────────────────────────────────────────────────────────────────

interface ApiTour {
  id: string;
  name: string;
  description: string;
  shortDescription: string;
  category: string;
  difficulty: string;
  duration: number;
  price: number;
  currency: string;
  maxGroupSize: number;
  minGroupSize: number;
  rating: number;
  reviewCount: number;
  images?: string[];
  included: string[];
  season: unknown[];
  sourceUrl?: string | null;
  sourceName?: string | null;
  source: 'tour' | 'route';
}

function formatPrice(price: number): string {
  return new Intl.NumberFormat('ru-RU').format(price) + ' ₽';
}

function formatDuration(hours: number): string {
  if (!hours || hours <= 0) return '';
  if (hours < 24) return `${hours} ч`;
  const days = Math.round(hours / 24);
  return `${days} ${days === 1 ? 'день' : days < 5 ? 'дня' : 'дней'}`;
}

// ─── Карточка маршрута ────────────────────────────────────────────────────────

function RouteCard({ tour }: { tour: ApiTour }) {
  const cat = CATEGORY_LABELS[tour.category] ?? tour.category;
  const badgeBg = CATEGORY_ACCENT[tour.category] ?? 'rgba(100,120,150,0.85)';
  const desc = (tour.shortDescription || tour.description || '').slice(0, 110);
  const durationStr = formatDuration(tour.duration);

  return (
    <Link
      href={`/tours/${tour.id}`}
      className="group"
      style={{
        display: 'block',
        borderRadius: '16px',
        overflow: 'hidden',
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        transition: 'transform 200ms ease, box-shadow 200ms ease, border-color 200ms ease',
        textDecoration: 'none',
      }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLAnchorElement).style.transform = 'translateY(-3px)';
        (e.currentTarget as HTMLAnchorElement).style.boxShadow = '0 8px 32px rgba(0,0,0,0.5)';
        (e.currentTarget as HTMLAnchorElement).style.borderColor = 'var(--border-strong)';
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLAnchorElement).style.transform = 'translateY(0)';
        (e.currentTarget as HTMLAnchorElement).style.boxShadow = 'none';
        (e.currentTarget as HTMLAnchorElement).style.borderColor = 'var(--border)';
      }}
    >
      {/* Изображение */}
      <div style={{ position: 'relative', aspectRatio: '16/9', background: 'var(--bg-secondary)', overflow: 'hidden' }}>
        {tour.images && tour.images.length > 0 ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={tour.images[0]}
            alt={tour.name}
            loading="lazy"
            style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 400ms ease' }}
            onMouseEnter={e => { (e.currentTarget as HTMLImageElement).style.transform = 'scale(1.06)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLImageElement).style.transform = 'scale(1)'; }}
          />
        ) : (
          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Mountain style={{ width: '36px', height: '36px', color: 'var(--text-muted)' }} />
          </div>
        )}
        {/* Градиент снизу */}
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.6) 0%, transparent 50%)' }} />
        {/* Бейдж категории */}
        <span style={{
          position: 'absolute', top: '10px', left: '10px',
          padding: '3px 10px', borderRadius: '100px',
          fontSize: '11px', fontWeight: 700,
          background: badgeBg, color: '#fff',
          backdropFilter: 'blur(6px)',
          letterSpacing: '0.02em',
        }}>
          {cat}
        </span>
        {/* Длительность */}
        {durationStr && (
          <span style={{
            position: 'absolute', bottom: '10px', right: '10px',
            display: 'flex', alignItems: 'center', gap: '4px',
            padding: '3px 8px', borderRadius: '8px',
            fontSize: '11px', fontWeight: 600,
            background: 'rgba(0,0,0,0.55)', color: '#fff',
            backdropFilter: 'blur(6px)',
          }}>
            <Clock size={10} />
            {durationStr}
          </span>
        )}
      </div>

      {/* Контент */}
      <div style={{ padding: '14px 16px 16px' }}>
        <h3 style={{ fontSize: '14px', fontWeight: 700, lineHeight: 1.35, color: 'var(--text-primary)', margin: 0, marginBottom: '6px' }}>
          {tour.name}
        </h3>
        {desc && (
          <p style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.55, margin: '0 0 12px', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
            {desc}
          </p>
        )}

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          {tour.price > 0 ? (
            <span style={{ fontSize: '16px', fontWeight: 800, color: 'var(--accent)' }}>
              от {formatPrice(tour.price)}
            </span>
          ) : (
            <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>По запросу</span>
          )}
          <span style={{
            fontSize: '12px', color: 'var(--ocean)',
            display: 'flex', alignItems: 'center', gap: '2px',
          }}>
            Подробнее →
          </span>
        </div>
      </div>
    </Link>
  );
}

// ─── Скелетон ─────────────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div style={{ borderRadius: '16px', overflow: 'hidden', background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
      <div style={{ aspectRatio: '16/9', background: 'var(--bg-hover)' }} className="animate-pulse" />
      <div style={{ padding: '14px 16px 16px' }}>
        <div className="animate-pulse" style={{ height: '14px', borderRadius: '6px', background: 'var(--bg-hover)', marginBottom: '8px', width: '75%' }} />
        <div className="animate-pulse" style={{ height: '10px', borderRadius: '4px', background: 'var(--bg-hover)', marginBottom: '5px', width: '100%' }} />
        <div className="animate-pulse" style={{ height: '10px', borderRadius: '4px', background: 'var(--bg-hover)', marginBottom: '12px', width: '60%' }} />
        <div className="animate-pulse" style={{ height: '14px', borderRadius: '6px', background: 'var(--bg-hover)', width: '40%' }} />
      </div>
    </div>
  );
}

// ─── Sidebar-категории (desktop) ──────────────────────────────────────────────

interface SidebarCatsProps {
  active: string;
  onSelect: (v: string) => void;
}

function SidebarCategories({ active, onSelect }: SidebarCatsProps) {
  return (
    <nav aria-label="Фильтр категорий" style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
      {CATEGORIES.map(c => {
        const isActive = active === c.value;
        return (
          <button
            key={c.value}
            onClick={() => onSelect(c.value)}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '9px 14px', borderRadius: '10px',
              border: isActive ? '1px solid var(--accent)' : '1px solid transparent',
              background: isActive ? 'var(--accent-muted)' : 'transparent',
              color: isActive ? 'var(--accent)' : 'var(--text-secondary)',
              fontSize: '13px', fontWeight: isActive ? 700 : 400,
              cursor: 'pointer', textAlign: 'left',
              transition: 'all 150ms ease',
            }}
            onMouseEnter={e => {
              if (!isActive) (e.currentTarget as HTMLButtonElement).style.background = 'var(--bg-hover)';
            }}
            onMouseLeave={e => {
              if (!isActive) (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
            }}
          >
            {c.label}
            {isActive && <ChevronDown size={13} style={{ transform: 'rotate(-90deg)' }} />}
          </button>
        );
      })}
    </nav>
  );
}

// ─── Главная страница ─────────────────────────────────────────────────────────

export default function ToursPageClient() {
  const searchParams = useSearchParams();
  const { isDark, toggleTheme } = useTheme();

  const [tours, setTours]       = useState<ApiTour[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState('');
  const [total, setTotal]       = useState(0);
  const [offset, setOffset]     = useState(0);
  const LIMIT = 18;

  const [search, setSearch]     = useState('');
  const [category, setCategory] = useState(() => searchParams.get('category') ?? '');

  const fetchTours = useCallback(async (reset = false) => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      if (search)   params.set('search', search);
      if (category) params.set('category', category);
      const currentOffset = reset ? 0 : offset;
      params.set('limit',  String(LIMIT));
      params.set('offset', String(currentOffset));

      const res = await fetch(`/api/tours?${params.toString()}`);
      const data: { success: boolean; error?: string; data: { tours: ApiTour[]; pagination: { total: number } } } = await res.json();
      if (!data.success) throw new Error(data.error ?? 'Ошибка API');

      const newTours = data.data.tours;
      setTours(prev => reset ? newTours : [...prev, ...newTours]);
      setTotal(data.data.pagination.total);
      setOffset(reset ? newTours.length : currentOffset + newTours.length);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка загрузки');
    } finally {
      setLoading(false);
    }
  }, [search, category, offset]);

  useEffect(() => {
    setOffset(0);
    setTours([]);
    fetchTours(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, category]);

  const hasFilters = Boolean(search || category);
  const activeLabel = CATEGORY_LABELS[category] ?? '';

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', paddingBottom: '80px' }}>
      <style>{`
        .tours-input::placeholder { color: var(--text-muted); }
        .tours-input:focus { border-color: var(--ocean) !important; outline: none; }
        @media (min-width: 768px) { .md-pb-0 { padding-bottom: 0 !important; } }
      `}</style>

      {/* ── Хедер ── */}
      <header style={{
        position: 'sticky', top: 0, zIndex: 50,
        background: 'rgba(13,17,23,0.85)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        borderBottom: '1px solid var(--border)',
      }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '11px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Link href="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center' }}>
            <Logo size={28} />
          </Link>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              onClick={toggleTheme}
              aria-label="Переключить тему"
              style={{
                width: '36px', height: '36px', borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'var(--bg-card)', border: '1px solid var(--border)',
                color: 'var(--text-secondary)', cursor: 'pointer',
              }}
            >
              {isDark ? <Sun size={15} /> : <Moon size={15} />}
            </button>
            <Link
              href="/profile"
              aria-label="Профиль"
              style={{
                width: '36px', height: '36px', borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'var(--bg-card)', border: '1px solid var(--border)',
                color: 'var(--text-secondary)',
              }}
            >
              <User size={15} />
            </Link>
          </div>
        </div>
      </header>

      {/* ── Hero-баннер ── */}
      <div style={{
        background: `
          radial-gradient(ellipse 60% 100% at 80% 50%, rgba(0,168,204,0.12) 0%, transparent 70%),
          radial-gradient(ellipse 50% 80% at 20% 50%, rgba(232,115,74,0.14) 0%, transparent 70%),
          var(--bg-secondary)
        `,
        borderBottom: '1px solid var(--border)',
      }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '24px 20px 20px' }}>
          <h1 style={{
            fontFamily: "var(--font-playfair,'Playfair Display',serif)",
            fontSize: 'clamp(22px,5vw,32px)', fontWeight: 700,
            color: 'var(--text-primary)', margin: '0 0 4px',
          }}>
            {activeLabel ? `${activeLabel} — маршруты Камчатки` : 'Маршруты Камчатки'}
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0 }}>
            {loading && tours.length === 0
              ? 'Загрузка каталога...'
              : `${total} ${total === 1 ? 'маршрут' : total < 5 ? 'маршрута' : 'маршрутов'}${activeLabel ? ` в категории «${activeLabel}»` : ' в каталоге'}`
            }
          </p>

          {/* Поиск — в hero на мобайле/десктопе */}
          <div style={{ position: 'relative', marginTop: '16px', maxWidth: '480px' }}>
            <Search style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', width: '16px', height: '16px', color: 'var(--text-muted)', pointerEvents: 'none' }} />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Вулканы, рыбалка, медведи..."
              className="tours-input"
              style={{
                width: '100%', boxSizing: 'border-box',
                paddingLeft: '40px', paddingRight: '16px', paddingTop: '10px', paddingBottom: '10px',
                borderRadius: '12px', fontSize: '14px',
                background: 'var(--bg-card)',
                border: '1px solid var(--border-strong)',
                color: 'var(--text-primary)',
                transition: 'border-color 150ms ease',
              }}
            />
          </div>
        </div>
      </div>

      {/* ── Мобайл: категории горизонтально ── */}
      <div className="md:hidden" style={{ overflowX: 'auto', scrollbarWidth: 'none', padding: '12px 20px 0', borderBottom: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', gap: '6px', paddingBottom: '12px', minWidth: 'max-content' }}>
          {CATEGORIES.map(c => {
            const isActive = category === c.value;
            return (
              <button
                key={c.value}
                onClick={() => setCategory(c.value)}
                style={{
                  padding: '7px 14px', borderRadius: '100px', whiteSpace: 'nowrap',
                  fontSize: '13px', fontWeight: isActive ? 700 : 400,
                  background: isActive ? 'var(--accent)' : 'var(--bg-card)',
                  border: isActive ? '1px solid var(--accent)' : '1px solid var(--border)',
                  color: isActive ? '#fff' : 'var(--text-secondary)',
                  cursor: 'pointer', transition: 'all 150ms ease',
                }}
              >
                {c.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Основной контент ── */}
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '20px', display: 'flex', gap: '24px', alignItems: 'flex-start' }}>

        {/* Sidebar (только desktop) */}
        <aside
          className="hidden md:block"
          style={{
            width: '200px', flexShrink: 0,
            position: 'sticky', top: '72px',
            padding: '16px',
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            borderRadius: '16px',
          }}
        >
          <p style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', margin: '0 0 10px 4px' }}>
            Категории
          </p>
          <SidebarCategories active={category} onSelect={v => setCategory(v)} />
        </aside>

        {/* Каталог */}
        <div style={{ flex: 1, minWidth: 0 }}>

          {/* Сброс фильтров */}
          {hasFilters && (
            <div style={{ marginBottom: '12px', display: 'flex', justifyContent: 'flex-end' }}>
              <button
                onClick={() => { setSearch(''); setCategory(''); }}
                style={{
                  fontSize: '12px', color: 'var(--text-muted)',
                  background: 'none', border: 'none', cursor: 'pointer',
                  textDecoration: 'underline', textUnderlineOffset: '3px',
                }}
              >
                Сбросить фильтры
              </button>
            </div>
          )}

          {error ? (
            <div style={{ padding: '60px 0', textAlign: 'center' }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '10px 20px', borderRadius: '12px', background: 'rgba(248,81,73,0.08)', border: '1px solid rgba(248,81,73,0.2)', marginBottom: '16px' }}>
                <span style={{ fontSize: '14px', color: 'var(--danger)' }}>{error}</span>
              </div>
              <div>
                <button
                  onClick={() => { setError(''); fetchTours(true); }}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: '8px',
                    padding: '10px 20px', borderRadius: '12px', fontSize: '14px', fontWeight: 600,
                    background: 'var(--bg-card)', border: '1px solid var(--border-strong)',
                    color: 'var(--text-primary)', cursor: 'pointer',
                  }}
                >
                  <RefreshCw style={{ width: '15px', height: '15px' }} />
                  Повторить
                </button>
              </div>
            </div>

          ) : loading && tours.length === 0 ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '16px' }}>
              {Array.from({ length: 9 }).map((_, i) => <SkeletonCard key={i} />)}
            </div>

          ) : tours.length === 0 ? (
            <div style={{ padding: '80px 0', textAlign: 'center' }}>
              <Mountain style={{ width: '40px', height: '40px', margin: '0 auto 12px', color: 'var(--text-muted)' }} />
              <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '12px' }}>
                Ничего не найдено
              </p>
              {hasFilters && (
                <button
                  onClick={() => { setSearch(''); setCategory(''); }}
                  style={{ fontSize: '13px', color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}
                >
                  Сбросить фильтры
                </button>
              )}
            </div>

          ) : (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '16px' }}>
                {tours.map(tour => <RouteCard key={tour.id} tour={tour} />)}
              </div>

              {tours.length < total && (
                <div style={{ marginTop: '32px', textAlign: 'center' }}>
                  <button
                    onClick={() => fetchTours(false)}
                    disabled={loading}
                    style={{
                      padding: '11px 28px', borderRadius: '12px', fontSize: '14px', fontWeight: 600,
                      background: 'var(--bg-card)', border: '1px solid var(--border-strong)',
                      color: 'var(--text-primary)', cursor: loading ? 'not-allowed' : 'pointer',
                      opacity: loading ? 0.5 : 1, transition: 'opacity 150ms ease',
                    }}
                  >
                    {loading ? 'Загрузка...' : `Показать ещё (${total - tours.length})`}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <BottomNav activePath="/tours" />
    </div>
  );
}
