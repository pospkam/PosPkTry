
import type { Metadata } from 'next'

import HomePageClient from './_HomePageClient'

export const metadata: Metadata = {
  title: 'Kamchatour Hub — Туры на Камчатку | Рыбалка, вулканы, экология',
  description: 'Единая платформа туризма Камчатки. 6 ролей пользователей, AI-помощник, SOS с геолокацией, eco-points, реальные гиды и операторы.',
  keywords: 'туры Камчатка, рыбалка Камчатка, вулканы, горячие источники, гиды Камчатка, безопасный туризм',
  openGraph: {
    title: 'Kamchatour Hub — Туры на Камчатку',
    description: 'Рыбалка на чавычу, восхождения на вулканы, термальные источники. Бронирование онлайн с гарантией безопасности.',
    images: [
      {
        url: '/images/og-hero.webp',
        width: 1200,
        height: 630,
        alt: 'Камчатка — туры и приключения',
      },
    ],
    type: 'website',
    locale: 'ru_RU',
    siteName: 'Kamchatour Hub',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Kamchatour Hub — Туры на Камчатку',
    images: ['/images/og-hero.webp'],
  },
  robots: {
    index: true,
    follow: true,
  },
  alternates: {
    canonical: '/',
  },
}

export default function Page() {
  return <HomePageClient />
}
=======
import { useState, useEffect, useRef } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { Sun, Moon, UserCircle, Search, X, Camera, Map, Heart, User, AlertTriangle, Sparkles } from 'lucide-react'
import { useTheme } from '@/contexts/ThemeContext'

// ─────────────────────────────────────────────
// RIPPLE
// ─────────────────────────────────────────────
function useRipple() {
  return (e: React.MouseEvent<HTMLElement>) => {
    const el = e.currentTarget
    const ripple = document.createElement('span')
    const rect = el.getBoundingClientRect()
    const size = Math.max(rect.width, rect.height) * 2
    ripple.style.cssText = `
      position:absolute;
      width:${size}px;height:${size}px;
      left:${e.clientX - rect.left - size / 2}px;
      top:${e.clientY - rect.top - size / 2}px;
      background:rgba(0,212,255,0.25);
      border-radius:50%;
      transform:scale(0);
      animation:kh-ripple 600ms ease-out forwards;
      pointer-events:none;
      z-index:999;
    `
    el.style.position = 'relative'
    el.style.overflow = 'hidden'
    el.appendChild(ripple)
    setTimeout(() => ripple.remove(), 650)
  }
}

// ─────────────────────────────────────────────
// SVG ИКОНКИ
// ─────────────────────────────────────────────
const Icons: Record<string, () => JSX.Element> = {
  volcanoes: () => (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3L7 13H4L12 21L20 13H17Z"/>
      <path d="M11 6L11 3M13 7L14 4M9 7L8 5" strokeWidth="1"/>
    </svg>
  ),
  fishing: () => (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="9" cy="4" r="1.8"/>
      <path d="M8 6L6 14L9 14"/>
      <path d="M8 10L18 5"/>
      <path d="M18 5L18 11Q18 15 14 15Q11 15 10 18"/>
      <path d="M8 21Q10 23 12 21Q14 19 16 21"/>
    </svg>
  ),
  thermal: () => (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 21Q12 17 20 21"/>
      <path d="M2 23L22 23"/>
      <circle cx="12" cy="11" r="3"/>
      <path d="M9 11L4 15M15 11L20 15"/>
      <path d="M10 5Q10 3 12 3Q12 5 14 5Q14 3 16 3" strokeWidth="1.1"/>
    </svg>
  ),
  geysers: () => (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22L12 13"/>
      <path d="M9 18Q7 15 9 12Q11 9 9 6Q11 2 14 6Q12 9 14 12Q16 15 14 18"/>
      <path d="M7 11Q5 9 6 6M17 11Q19 9 18 6"/>
      <ellipse cx="12" cy="22" rx="4" ry="1.5"/>
    </svg>
  ),
  bears: () => (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="8" cy="7" r="2.5"/>
      <circle cx="6.2" cy="4.8" r="1.2"/>
      <circle cx="9.8" cy="4.8" r="1.2"/>
      <path d="M5 10Q8 13 11 10"/>
      <path d="M5 10L4 17L7 17L8 14L9 17L12 17L11 10"/>
      <path d="M4 17L3 21M12 17L13 21M7 17L7 21M9 17L9 21"/>
    </svg>
  ),
  trekking: () => (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="4" r="2"/>
      <path d="M10 8L8 17L10 23M14 8L16 17L14 23"/>
      <path d="M9 12L15 12"/>
      <path d="M19 7L19 19" strokeWidth="1.3"/>
      <path d="M17 9L19 7L21 9" strokeWidth="1.3"/>
    </svg>
  ),
  helicopter: () => (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 11L22 11"/>
      <ellipse cx="12" cy="14" rx="5" ry="3"/>
      <path d="M10 14L9 20L15 20L14 14"/>
      <path d="M12 11L12 5"/>
      <circle cx="12" cy="5" r="1.2"/>
      <path d="M12 20L12 23"/>
    </svg>
  ),
  sea: () => (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 18Q6.5 16 10 18Q13.5 20 17 18Q20 16 21 18"/>
      <path d="M3 21.5Q6.5 19.5 10 21.5Q13.5 23.5 17 21.5"/>
      <path d="M6 18L7 12L17 12L18 18"/>
      <path d="M11 12L11 5L19 9"/>
    </svg>
  ),
}

// ─────────────────────────────────────────────
// ДАННЫЕ
// ─────────────────────────────────────────────
const ACTIVITIES = [
  { id: 'volcanoes',  label: 'Вулканы',         href: '/tours?category=volcanoes'  },
  { id: 'fishing',    label: 'Рыбалка',          href: '/tours?category=fishing'    },
  { id: 'thermal',    label: 'Термы',            href: '/tours?category=thermal'    },
  { id: 'geysers',    label: 'Гейзеры',          href: '/tours?category=geysers'    },
  { id: 'bears',      label: 'Медведи',          href: '/tours?category=bears'      },
  { id: 'trekking',   label: 'Треккинг',         href: '/tours?category=trekking'   },
  { id: 'helicopter', label: 'Вертолёт',         href: '/tours?category=helicopter' },
  { id: 'sea',        label: 'Морские прогулки', href: '/tours?category=sea'        },
]

const NAV_ITEMS = [
  { label: 'Поиск',     Icon: Search,        href: '#search',               danger: false },
  { label: 'Карта',     Icon: Map,           href: '/map',                  danger: false },
  { label: 'Избранное', Icon: Heart,         href: '/hub/tourist/wishlist', danger: false },
  { label: 'ЛК',        Icon: User,          href: '/profile',              danger: false },
  { label: 'СОС',       Icon: AlertTriangle, href: '/safety',               danger: true  },
]

const CAROUSEL_IMAGES: string[] = []

// ─────────────────────────────────────────────
// КАРУСЕЛЬ АКТИВНОСТЕЙ
// ─────────────────────────────────────────────
const N = ACTIVITIES.length
const CARD_W = 86
const GAP = 12
import type { Metadata } from 'next'

import HomePageClient from './_HomePageClient'

export const metadata: Metadata = {
  title: 'Kamchatour Hub — Туры на Камчатку | Рыбалка, вулканы, экология',
  description: 'Единая платформа туризма Камчатки. 6 ролей пользователей, AI-помощник, SOS с геолокацией, eco-points, реальные гиды и операторы.',
  keywords: 'туры Камчатка, рыбалка Камчатка, вулканы, горячие источники, гиды Камчатка, безопасный туризм',
  openGraph: {
    title: 'Kamchatour Hub — Туры на Камчатку',
    description: 'Рыбалка на чавычу, восхождения на вулканы, термальные источники. Бронирование онлайн с гарантией безопасности.',
    images: [
      {
        url: '/images/og-hero.webp',
        width: 1200,
        height: 630,
        alt: 'Камчатка — туры и приключения',
      },
    ],
    type: 'website',
    locale: 'ru_RU',
    siteName: 'Kamchatour Hub',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Kamchatour Hub — Туры на Камчатку',
    images: ['/images/og-hero.webp'],
  },
  robots: {
    index: true,
    follow: true,
  },
  alternates: {
    canonical: '/',
  },
}

export default function Page() {
  return <HomePageClient />
}
const STEP = CARD_W + GAP

function ActivityCarousel({
  ripple,
  router,
}: {
  ripple: (e: React.MouseEvent<HTMLElement>) => void
  router: ReturnType<typeof useRouter>
}) {
  const trackRef = useRef<HTMLDivElement>(null)
  const posRef = useRef(N)
  const autoRef = useRef<NodeJS.Timeout | null>(null)
  const [current, setCurrent] = useState(0)
  const touchX = useRef(0)

  const ITEMS = [...ACTIVITIES, ...ACTIVITIES, ...ACTIVITIES]

  const getX = (idx: number) => {
    const vw = Math.min(typeof window !== 'undefined' ? window.innerWidth : 390, 430)
    return vw / 2 - idx * STEP - CARD_W / 2
  }

  const moveTo = (idx: number, animated: boolean) => {
    if (!trackRef.current) return
    trackRef.current.style.transition = animated ? 'transform 0.42s cubic-bezier(.4,0,.2,1)' : 'none'
    trackRef.current.style.transform = `translateX(${getX(idx)}px)`
  }

  const advance = (dir = 1) => {
    const next = posRef.current + dir
    posRef.current = next
    moveTo(next, true)
    setCurrent(((next % N) + N) % N)
  }

  const jumpTo = (logIdx: number) => {
    const cur = posRef.current
    const base = N + logIdx
    const options = [base - N, base, base + N]
    const closest = options.reduce((a, b) => (Math.abs(a - cur) < Math.abs(b - cur) ? a : b))
    posRef.current = closest
    moveTo(closest, true)
    setCurrent(logIdx)
  }

  const resetAuto = () => {
    if (autoRef.current) clearInterval(autoRef.current)
    autoRef.current = setInterval(() => advance(1), 2300)
  }

  useEffect(() => {
    moveTo(N, false)
    autoRef.current = setInterval(() => advance(1), 2300)
    return () => { if (autoRef.current) clearInterval(autoRef.current) }
  }, [])

  const onTransitionEnd = () => {
    const p = posRef.current
    if (p < N) { posRef.current = p + N; moveTo(p + N, false) }
    else if (p >= 2 * N) { posRef.current = p - N; moveTo(p - N, false) }
  }

  return (
    <section className="pb-5">
      <p style={{
        textAlign: 'center', fontSize: 11, letterSpacing: 2,
        textTransform: 'uppercase', color: 'rgba(255,255,255,0.55)',
        marginBottom: 12, paddingLeft: 16, paddingRight: 16,
        textShadow: '0 1px 4px rgba(0,0,0,0.8)',
      }}>
        Активности Камчатки
      </p>

      <div
        style={{ position: 'relative', height: 116, overflow: 'hidden' }}
        onTouchStart={(e) => { touchX.current = e.touches[0].clientX }}
        onTouchEnd={(e) => {
          const dx = touchX.current - e.changedTouches[0].clientX
          if (Math.abs(dx) > 28) { advance(dx > 0 ? 1 : -1); resetAuto() }
        }}
      >
        <div
          ref={trackRef}
          onTransitionEnd={onTransitionEnd}
          style={{
            display: 'flex', alignItems: 'center', gap: GAP,
            position: 'absolute', top: 0, left: 0, height: '100%',
            willChange: 'transform',
          }}
        >
          {ITEMS.map((act, i) => {
            // Вычисляем дистанцию через current (state) — стабильно
            const logI = i % N
            const rawDist = i - (N + current)
            const dist = ((rawDist % N) + N + Math.floor(N / 2)) % N - Math.floor(N / 2)
            const isCenter = dist === 0
            const isNear = Math.abs(dist) === 1
            const absDist = Math.abs(dist)
            const scale = isCenter ? 1 : isNear ? 0.88 : 0.75
            const opacity = isCenter ? 1 : isNear ? 0.7 : absDist === 2 ? 0.38 : 0

            if (absDist > 2) {
              return <div key={i} style={{ width: CARD_W, height: 100, flexShrink: 0, opacity: 0 }} />
            }

            const Icon = Icons[act.id]
            return (
              <button
                key={i}
                onClick={(e) => {
                  ripple(e)
                  jumpTo(logI)
                  resetAuto()
                  setTimeout(() => router.push(act.href), 280)
                }}
                style={{
                  width: CARD_W, height: 100, flexShrink: 0,
                  borderRadius: 20,
                  background: isCenter ? 'rgba(0,0,0,0.35)' : 'rgba(0,0,0,0.2)',
                  backdropFilter: 'blur(12px)',
                  WebkitBackdropFilter: 'blur(12px)',
                  border: isCenter ? '1.5px solid #00D4FF' : '1px solid rgba(255,255,255,0.2)',
                  boxShadow: isCenter ? '0 0 24px rgba(0,212,255,0.4), inset 0 1px 0 rgba(255,255,255,0.15)' : 'inset 0 1px 0 rgba(255,255,255,0.1)',
                  display: 'flex', flexDirection: 'column',
                  alignItems: 'center', justifyContent: 'center', gap: 6,
                  transform: `scale(${scale}) translateY(${isCenter ? -6 : 0}px)`,
                  opacity,
                  transition: 'transform 0.42s cubic-bezier(.4,0,.2,1), opacity 0.42s ease, border-color 0.42s ease, box-shadow 0.42s ease',
                  color: isCenter ? '#00D4FF' : 'rgba(255,255,255,0.95)',
                  cursor: 'pointer', position: 'relative', overflow: 'hidden',
                }}
              >
                <Icon />
                <span style={{
                  fontSize: 9.5, textAlign: 'center', lineHeight: 1.3,
                  padding: '0 6px', fontWeight: isCenter ? 600 : 400,
                  fontFamily: 'sans-serif',
                  textShadow: '0 1px 4px rgba(0,0,0,0.6)',
                  color: isCenter ? '#00D4FF' : '#fff',
                }}>
                  {act.label}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Dots */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: 5, marginTop: 10 }}>
        {ACTIVITIES.map((_, i) => (
          <button
            key={i}
            onClick={() => { jumpTo(i); resetAuto() }}
            style={{
              width: i === current ? 22 : 6, height: 6, borderRadius: 3,
              background: i === current ? '#00D4FF' : 'rgba(255,255,255,0.3)',
              transition: 'all 0.35s ease', border: 'none', cursor: 'pointer', padding: 0,
            }}
          />
        ))}
      </div>
    </section>
  )
}

// ─────────────────────────────────────────────
// ФОТО КАРУСЕЛЬ
// ─────────────────────────────────────────────
function PhotoCarousel() {
  const [selected, setSelected] = useState<string | null>(null)
  const items = CAROUSEL_IMAGES.length > 0
    ? CAROUSEL_IMAGES
    : Array.from({ length: 5 }, (_, i) => `__placeholder__${i}`)
>>>>>>> c89c73789d933459e68d4ab3d6d705eab9bc1698

// --- Header ---
function Header() {
  return (
<<<<<<< HEAD
    <header className="fixed top-0 left-0 w-full z-30 flex items-center justify-between px-4 h-14"
      style={{
        maxWidth: 430,
        margin: "0 auto",
        background: "rgba(13,27,42,0.85)",
        backdropFilter: "blur(10px)",
        WebkitBackdropFilter: "blur(10px)",
        borderBottom: "1px solid var(--kh-nav-border)",
      }}>
      <span className="font-bold text-2xl tracking-tight" style={{ color: "#00D4FF", fontFamily: 'Playfair Display, serif' }}>КН</span>
      <div className="flex gap-2">
        <button className="relative p-2 rounded-full bg-white/10 border border-white/20 backdrop-blur-md" aria-label="Переключить тему">
          <Sun className="w-5 h-5 text-cyan-300" />
        </button>
        <button className="relative p-2 rounded-full bg-white/10 border border-white/20 backdrop-blur-md" aria-label="Профиль">
          <User className="w-5 h-5 text-cyan-300" />
        </button>
=======
    <section className="pb-6">
      <h2 style={{
        fontFamily: 'Georgia, serif', color: '#fff', fontSize: 18,
        fontWeight: 700, textAlign: 'center', marginBottom: 12,
        padding: '0 16px',
        textShadow: '0 2px 12px rgba(0,0,0,0.9), 0 0 30px rgba(0,0,0,0.7)',
      }}>
        Камчатка глазами путешественников
      </h2>
      <div style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingLeft: 16, paddingBottom: 6, scrollbarWidth: 'none' }}>
        {items.map((src, i) => {
          const isReal = !src.startsWith('__placeholder__')
          const colors = [
            'rgba(0,80,160,0.5)', 'rgba(140,40,0,0.5)',
            'rgba(0,100,80,0.5)', 'rgba(80,0,120,0.5)', 'rgba(0,60,100,0.5)',
          ]
          return (
            <div
              key={i}
              onClick={() => isReal ? setSelected(src) : null}
              style={{
                minWidth: 130, height: 168, flexShrink: 0,
                background: `linear-gradient(145deg, ${colors[i % colors.length]}, rgba(0,0,0,0.5))`,
                backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
                border: '1px solid rgba(255,255,255,0.15)', borderRadius: 20,
                cursor: isReal ? 'pointer' : 'default',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                overflow: 'hidden',
              }}
            >
              {isReal
                ? <img src={src} alt={`Камчатка ${i + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : <Camera size={28} color="rgba(255,255,255,0.3)" />
              }
            </div>
          )
        })}
        <div style={{ width: 16, flexShrink: 0 }} />
>>>>>>> c89c73789d933459e68d4ab3d6d705eab9bc1698
      </div>
    </header>
  )
}

<<<<<<< HEAD
// --- Hero Section ---
function Hero({ onSearch }: { onSearch: () => void }) {
  const ripple = useRipple()
  return (
    <section className="pt-20 pb-6 flex flex-col items-center text-center" style={{ maxWidth: 430, margin: "0 auto" }}>
      <h1 className="font-playfair text-3xl font-bold mb-2 text-white" style={{ letterSpacing: "-0.01em" }}>
        Здесь начинается Россия
      </h1>
      <div className="text-base text-white/70 mb-6">Камчатка — земля огня и льда</div>
      <button
        className="relative flex items-center gap-2 px-6 py-3 rounded-full bg-white/10 border border-cyan-400/20 text-white font-semibold text-base shadow-md backdrop-blur-md"
        style={{ boxShadow: "0 2px 16px 0 rgba(0,212,255,0.10)" }}
        onClick={e => { ripple(e); onSearch() }}
      >
        <Search className="w-5 h-5 text-cyan-300" />
        <span>Поиск маршрута</span>
      </button>
=======
      {selected && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90"
          onClick={() => setSelected(null)}
          style={{ animation: 'kh-fade 300ms ease' }}
        >
          <img src={selected} alt="Камчатка"
            style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', borderRadius: 16, animation: 'kh-scale 300ms ease' }}
            onClick={(e) => e.stopPropagation()} />
        </div>
      )}
>>>>>>> c89c73789d933459e68d4ab3d6d705eab9bc1698
    </section>
  )
}

<<<<<<< HEAD
// --- Activities Carousel ---
const ACTIVITIES = [
  { id: 'volcanoes', label: 'Вулканы', icon: <Sun />, color: 'from-cyan-400 to-blue-500' },
  { id: 'fishing', label: 'Рыбалка', icon: <Heart />, color: 'from-blue-400 to-cyan-500' },
  { id: 'thermal', label: 'Термы', icon: <Moon />, color: 'from-cyan-400 to-amber-300' },
  { id: 'geysers', label: 'Гейзеры', icon: <AlertTriangle />, color: 'from-cyan-400 to-pink-400' },
  { id: 'bears', label: 'Медведи', icon: <User />, color: 'from-yellow-400 to-orange-400' },
  { id: 'trekking', label: 'Треккинг', icon: <Map />, color: 'from-green-400 to-cyan-400' },
  { id: 'helicopter', label: 'Вертолёт', icon: <Bot />, color: 'from-cyan-400 to-purple-400' },
  { id: 'sea', label: 'Морские прогулки', icon: <Camera />, color: 'from-blue-400 to-cyan-400' },
]
=======
// ─────────────────────────────────────────────
// AI МОДАЛ
// ─────────────────────────────────────────────
function AIModal({ onClose }: { onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end"
      style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(10px)', animation: 'kh-fade 0.2s ease' }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 'calc(100% - 32px)', margin: '0 16px 16px',
          background: 'rgba(5,14,31,0.97)',
          backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
          borderRadius: 24, border: '1px solid rgba(0,212,255,0.25)',
          padding: 24, animation: 'kh-slide-up 0.3s cubic-bezier(.4,0,.2,1)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <div style={{
            width: 42, height: 42, borderRadius: '50%',
            background: 'rgba(0,212,255,0.15)', border: '1px solid rgba(0,212,255,0.35)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#00D4FF',
          }}>
            <Sparkles size={20} />
          </div>
          <div>
            <div style={{ fontWeight: 600, fontSize: 15, color: '#fff', fontFamily: 'sans-serif' }}>AI Помощник</div>
            <div style={{ fontSize: 11, color: '#00D4FF', letterSpacing: 0.5, fontFamily: 'sans-serif' }}>● Онлайн</div>
          </div>
          <button onClick={onClose} style={{ marginLeft: 'auto', color: 'rgba(150,150,150,0.8)', background: 'none', border: 'none', fontSize: 26, lineHeight: 1, cursor: 'pointer', padding: '0 4px' }}>×</button>
        </div>
        <div style={{ background: 'rgba(0,212,255,0.07)', borderRadius: 16, padding: '13px 16px', marginBottom: 16, border: '1px solid rgba(0,212,255,0.12)' }}>
          <p style={{ fontFamily: 'sans-serif', fontSize: 14, lineHeight: 1.65, color: 'rgba(255,255,255,0.85)', margin: 0 }}>
            Привет! Я помогу подобрать тур на Камчатку под ваши интересы и бюджет. С чего начнём?
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {['Вулканы', 'Рыбалка', 'Термы', 'Медведи'].map(tag => (
            <div key={tag} style={{
              padding: '7px 14px', borderRadius: 20,
              background: 'rgba(0,212,255,0.08)', border: '1px solid rgba(0,212,255,0.2)',
              fontSize: 12, fontFamily: 'sans-serif', color: '#00D4FF', cursor: 'pointer',
            }}>{tag}</div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────
// ГЛАВНАЯ СТРАНИЦА
// ─────────────────────────────────────────────
export default function HomePage() {
  const { isDark, toggleTheme } = useTheme()
  const router = useRouter()
  const pathname = usePathname()
  const ripple = useRipple()
  const [mounted, setMounted] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [aiOpen, setAiOpen] = useState(false)
>>>>>>> c89c73789d933459e68d4ab3d6d705eab9bc1698

function ActivitiesCarousel() {
  const [center, setCenter] = useState(0)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const count = ACTIVITIES.length

  // Auto-scroll
  useEffect(() => {
    intervalRef.current = setInterval(() => {
      setCenter(c => (c + 1) % count)
    }, 2200)
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [count])

  // Swipe support
  const startX = useRef<number | null>(null)
  const handleTouchStart = (e: React.TouchEvent) => {
    startX.current = e.touches[0].clientX
    if (intervalRef.current) clearInterval(intervalRef.current)
  }
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (startX.current !== null) {
      const dx = e.changedTouches[0].clientX - startX.current
      if (Math.abs(dx) > 40) {
        setCenter(c => (c + (dx < 0 ? 1 : -1) + count) % count)
      }
    }
    intervalRef.current = setInterval(() => {
      setCenter(c => (c + 1) % count)
    }, 2200)
  }

  return (
<<<<<<< HEAD
    <section className="w-full px-0 py-2 flex flex-col items-center" style={{ maxWidth: 430, margin: "0 auto" }}>
      <div
        className="flex items-center justify-center gap-0 w-full overflow-x-hidden relative"
        style={{ height: 120 }}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {ACTIVITIES.map((a, i) => {
          const pos = (i - center + count) % count
          const isCenter = pos === 0
          const style = isCenter
            ? {
                transform: "scale(1.1) translateY(-6px)",
                zIndex: 2,
                boxShadow: "0 0 22px 0 rgba(0,212,255,0.4)",
                border: "2px solid #00D4FF",
                background: "rgba(0,212,255,0.08)",
              }
            : {
                transform: "scale(0.88)",
                opacity: 0.7,
                zIndex: 1,
              }
          return (
            <div
              key={a.id}
              className="flex flex-col items-center justify-center mx-1 rounded-2xl transition-all duration-300"
              style={{ width: 88, height: 104, ...style }}
            >
              <div className="w-14 h-14 flex items-center justify-center rounded-xl bg-white/10 border border-cyan-400/20 mb-2">
                {a.icon}
              </div>
              <span className="text-white text-xs font-semibold text-center" style={{ textShadow: "0 1px 4px rgba(0,0,0,0.4)" }}>{a.label}</span>
            </div>
          )
        })}
      </div>
      <div className="flex gap-1 mt-2 justify-center">
        {ACTIVITIES.map((_, i) => (
          <span key={i} className={"w-2 h-2 rounded-full " + (i === center ? "bg-cyan-400" : "bg-white/20")}></span>
        ))}
      </div>
    </section>
  )
}

// --- Photo Section ---
function PhotoSection() {
  return (
    <section className="px-4 pb-6">
      <h2 className="font-playfair text-white text-xl font-bold text-center mb-3" style={{ textShadow: '0 2px 8px rgba(0,0,0,0.7)' }}>
        Камчатка глазами путешественников
      </h2>
      <div className="flex gap-3 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="flex-shrink-0 rounded-2xl overflow-hidden bg-white/10 border border-white/20"
            style={{ minWidth: 138, height: 172, borderRadius: 20, backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)' }}
          >
            <div className="w-full h-full flex items-center justify-center">
              <Camera size={32} className="text-white/40" />
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

// --- Bottom Navbar ---
const NAV_ITEMS = [
  { label: 'Поиск', Icon: Search, href: '#search', danger: false },
  { label: 'Карта', Icon: Map, href: '/map', danger: false },
  { label: 'Избранное', Icon: Heart, href: '/hub/tourist/wishlist', danger: false },
  { label: 'ЛК', Icon: User, href: '/profile', danger: false },
  { label: 'СОС', Icon: AlertTriangle, href: '/safety', danger: true },
]

function BottomNavbar() {
  const [active, setActive] = useState(0)
  const ripple = useRipple()
  return (
    <nav
      className="fixed left-1/2 bottom-4 z-40 flex items-center justify-between px-2 py-1 w-[98vw] max-w-[420px] h-[64px] rounded-full"
      style={{
        transform: "translateX(-50%)",
        background: "var(--kh-nav-bg)",
        border: "1.5px solid var(--kh-nav-border)",
        boxShadow: "0 4px 24px 0 rgba(0,0,0,0.18)",
        backdropFilter: "blur(10px)",
        WebkitBackdropFilter: "blur(10px)",
      }}
    >
      {NAV_ITEMS.map((item, i) => (
        <button
          key={item.label}
          className={
            "flex flex-col items-center justify-center flex-1 px-2 py-1 relative " +
            (item.danger ? "text-red-500" : (i === active ? "text-cyan-400" : "text-white/80"))
          }
          style={{ minWidth: 56 }}
          onClick={e => { ripple(e); setActive(i) }}
        >
          <item.Icon className="w-6 h-6 mb-0.5" />
          <span className="text-xs font-medium leading-none">{item.label}</span>
        </button>
      ))}
    </nav>
  )
}

// --- AI Assistant Button ---
function AIAssistantButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      className="fixed z-50 right-6 bottom-24 w-14 h-14 rounded-full flex items-center justify-center border-2 border-cyan-400 shadow-lg bg-white/10 backdrop-blur-md"
      style={{
        boxShadow: "0 0 24px 0 rgba(0,212,255,0.25)",
        animation: "ai-glow 2.2s infinite alternate"
      }}
      onClick={onClick}
      aria-label="AI Assistant"
    >
      <Bot className="w-7 h-7 text-cyan-400" />
    </button>
  )
}

// --- Main Page ---
export default function HomePage() {
  const [searchOpen, setSearchOpen] = useState(false)
  const [aiOpen, setAiOpen] = useState(false)
  return (
    <div
      className="min-h-screen w-full flex flex-col items-center"
      style={{
        background: "linear-gradient(158deg,#050e1f 0%,#1c0800 52%,#060e20 100%)",
        maxWidth: 430,
        margin: "0 auto",
        paddingBottom: 96,
      }}
    >
      <Header />
      <main className="w-full flex-1 flex flex-col items-center" style={{ marginTop: 56 }}>
        <Hero onSearch={() => setSearchOpen(true)} />
        <ActivitiesCarousel />
        <PhotoSection />
      </main>
      <BottomNavbar />
      <AIAssistantButton onClick={() => setAiOpen(true)} />
      {/* Модальные окна (SearchModal, AI Modal) — реализовать отдельно */}
      {searchOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="bg-white rounded-2xl p-6 max-w-xs w-full text-black relative">
            <button className="absolute top-2 right-2" onClick={() => setSearchOpen(false)}><X className="w-5 h-5" /></button>
            <div className="font-bold text-lg mb-2">Поиск маршрута</div>
            <div className="text-sm text-gray-600 mb-4">(Заглушка: здесь будет поиск)</div>
            <input className="w-full border rounded px-3 py-2 mb-2" placeholder="Ключевое слово..." />
            <button className="w-full py-2 rounded bg-cyan-400 text-white font-semibold">Искать</button>
          </div>
        </div>
      )}
      {aiOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="bg-white rounded-2xl p-6 max-w-xs w-full text-black relative">
            <button className="absolute top-2 right-2" onClick={() => setAiOpen(false)}><X className="w-5 h-5" /></button>
            <div className="font-bold text-lg mb-2">AI-помощник</div>
            <div className="text-sm text-gray-600 mb-4">(Заглушка: здесь будет чат-бот)</div>
            <button className="w-full py-2 rounded bg-cyan-400 text-white font-semibold">Начать диалог</button>
          </div>
        </div>
      )}
      {/* Ripple effect keyframes */}
      <style>{`
        @keyframes kh-ripple {
          to { transform: scale(2.2); opacity: 0; }
        }
        @keyframes ai-glow {
          0% { box-shadow: 0 0 24px 0 rgba(0,212,255,0.25); }
          100% { box-shadow: 0 0 44px 0 rgba(0,212,255,0.45); }
        }
=======
    <>
      <style>{`
        @keyframes kh-ripple { to { transform: scale(4); opacity: 0; } }
        @keyframes kh-fade { from { opacity: 0; } to { opacity: 1; } }
        @keyframes kh-scale { from { transform: scale(0.85); opacity: 0; } to { transform: scale(1); opacity: 1; } }
        @keyframes kh-slide-up { from { opacity: 0; transform: translateY(100%); } to { opacity: 1; transform: translateY(0); } }
        @keyframes kh-glow { 0%,100% { box-shadow: 0 0 16px rgba(0,212,255,0.3); } 50% { box-shadow: 0 0 28px rgba(0,212,255,0.6); } }
        .kh-tap { -webkit-tap-highlight-color: transparent; }
        .kh-header-btn:hover { color: #00D4FF; filter: drop-shadow(0 0 6px #00D4FF); }
>>>>>>> c89c73789d933459e68d4ab3d6d705eab9bc1698
      `}</style>
    </div>
  )
// Удалён ошибочный фрагмент, который был вне функции

<<<<<<< HEAD
// --- Photo Section ---
function PhotoSection() {
  return (
    <section className="px-4 pb-6">
      <h2 className="font-playfair text-white text-xl font-bold text-center mb-3" style={{ textShadow: '0 2px 8px rgba(0,0,0,0.7)' }}>
        Камчатка глазами путешественников
      </h2>
      <div className="flex gap-3 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="flex-shrink-0 rounded-2xl overflow-hidden bg-white/10 border border-white/20"
            style={{ minWidth: 138, height: 172, borderRadius: 20, backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)' }}
          >
            <div className="w-full h-full flex items-center justify-center">
              <Camera size={32} className="text-white/40" />
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

// --- Bottom Navbar ---
const NAV_ITEMS = [
  { label: 'Поиск', Icon: Search, href: '#search', danger: false },
  { label: 'Карта', Icon: Map, href: '/map', danger: false },
  { label: 'Избранное', Icon: Heart, href: '/hub/tourist/wishlist', danger: false },
  { label: 'ЛК', Icon: User, href: '/profile', danger: false },
  { label: 'СОС', Icon: AlertTriangle, href: '/safety', danger: true },
]

function BottomNavbar() {
  const [active, setActive] = useState(0)
  const ripple = useRipple()
  return (
    <nav
      className="fixed left-1/2 bottom-4 z-40 flex items-center justify-between px-2 py-1 w-[98vw] max-w-[420px] h-[64px] rounded-full"
      style={{
        transform: "translateX(-50%)",
        background: "var(--kh-nav-bg)",
        border: "1.5px solid var(--kh-nav-border)",
        boxShadow: "0 4px 24px 0 rgba(0,0,0,0.18)",
        backdropFilter: "blur(10px)",
        WebkitBackdropFilter: "blur(10px)",
      }}
    >
      {NAV_ITEMS.map((item, i) => (
        <button
          key={item.label}
          className={
            "flex flex-col items-center justify-center flex-1 px-2 py-1 relative " +
            (item.danger ? "text-red-500" : (i === active ? "text-cyan-400" : "text-white/80"))
          }
          style={{ minWidth: 56 }}
          onClick={e => { ripple(e); setActive(i) }}
        >
          <item.Icon className="w-6 h-6 mb-0.5" />
          <span className="text-xs font-medium leading-none">{item.label}</span>
        </button>
      ))}
    </nav>
  )
}

// --- AI Assistant Button ---
function AIAssistantButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      className="fixed z-50 right-6 bottom-24 w-14 h-14 rounded-full flex items-center justify-center border-2 border-cyan-400 shadow-lg bg-white/10 backdrop-blur-md"
      style={{
        boxShadow: "0 0 24px 0 rgba(0,212,255,0.25)",
        animation: "ai-glow 2.2s infinite alternate"
      }}
      onClick={onClick}
      aria-label="AI Assistant"
    >
      <Bot className="w-7 h-7 text-cyan-400" />
    </button>
  )
}

// --- Main Page ---
// Оставляем только server component с metadata и импортом HomePageClient
                    ripple(e)
                    setSelectedActivity(prev => prev === id ? null : id)
                    setTimeout(() => router.push(href), 300)
                  }}
                  className="kh-activity relative flex flex-col items-center justify-center
                             gap-2 py-4 px-3 text-white transition-all duration-200"
                  style={{
                    width: 100,
                    background: isDark ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.15)',
                    backdropFilter: 'blur(10px)',
                    WebkitBackdropFilter: 'blur(10px)',
                    border: isSelected ? '1px solid rgba(0,212,255,0.8)' : '1px solid rgba(255,255,255,0.25)',
                    borderRadius: 16,
                    overflow: 'hidden',
                    boxShadow: isSelected ? '0 0 12px rgba(0,212,255,0.4)' : 'none',
                    color: isSelected ? '#00D4FF' : 'white',
                  }}
                >
                  <Icon />
                  <span className="text-xs font-medium leading-tight text-center whitespace-nowrap">{label}</span>
                </button>
              )
            })}
          </div>
        </section>

        {/* ── КАРУСЕЛЬ ── */}
        <PhotoCarousel />

        {/* ── нижний градиент ── */}
        <div
          className="h-24 pointer-events-none"
          style={{ background: 'linear-gradient(to bottom, transparent, rgba(0,0,0,0.65))' }}
        />

        {/* ── НИЖНИЙ НАВБАР (только mobile) ── */}
        <nav className="fixed bottom-0 left-0 right-0 z-20 flex justify-center pb-8 md:hidden">
          <div
            className="flex items-center justify-around px-4 py-2"
=======
      <div style={{
        backgroundImage: `url('${bgImage}')`,
        backgroundSize: 'cover', backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat', minHeight: '100dvh', position: 'relative',
      }}>
        {/* Оверлей — темнее на светлой теме для читаемости */}
        <div className="fixed inset-0 pointer-events-none" style={{
          background: isDark ? 'rgba(0,0,0,0.15)' : 'rgba(0,0,0,0.4)',
          zIndex: 0,
        }} />

        {/* верхний градиент */}
        <div className="fixed top-0 left-0 right-0 h-32 pointer-events-none" style={{
          background: 'linear-gradient(to bottom, rgba(0,0,0,0.65), transparent)',
          zIndex: 1,
        }} />

        {/* ── ХЕДЕР ── */}
        <header className="fixed top-0 left-0 right-0 flex items-center justify-between px-4 h-14" style={{ zIndex: 20 }}>
          <span style={{
            fontFamily: 'Georgia, serif', color: '#fff', fontSize: 22,
            fontWeight: 700, letterSpacing: 2,
            textShadow: '0 1px 8px rgba(0,0,0,0.7)',
          }}>КН</span>
          <div className="flex items-center gap-2">
            <button
              onClick={(e) => { ripple(e); toggleTheme() }}
              className="kh-tap kh-header-btn relative text-white transition-all duration-200 flex items-center justify-center"
              style={{
                width: 44, height: 44, borderRadius: '50%',
                background: 'rgba(0,0,0,0.3)',
                backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
                border: '1px solid rgba(255,255,255,0.3)', overflow: 'hidden',
              }}
            >
              {isDark ? <Sun size={19} /> : <Moon size={19} />}
            </button>
            <button
              onClick={(e) => { ripple(e); router.push('/profile') }}
              className="kh-tap kh-header-btn relative text-white transition-all duration-200 flex items-center justify-center"
              style={{
                width: 44, height: 44, borderRadius: '50%',
                background: 'rgba(0,0,0,0.3)',
                backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
                border: '1px solid rgba(255,255,255,0.3)', overflow: 'hidden',
              }}
            >
              <UserCircle size={19} />
            </button>
          </div>
        </header>

        {/* Контент */}
        <div style={{ position: 'relative', zIndex: 2 }}>

          {/* ── ПОИСК (вместо hero) ── */}
          <section style={{ padding: '72px 16px 20px', display: 'flex', justifyContent: 'center' }}>
            <button
              onClick={(e) => { ripple(e); setSearchOpen(true) }}
              className="kh-tap relative flex items-center gap-3 transition-all duration-200"
              style={{
                width: '100%', maxWidth: 390,
                padding: '14px 18px', borderRadius: 50,
                background: 'rgba(0,0,0,0.3)',
                backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
                border: '1px solid rgba(255,255,255,0.25)',
                color: 'rgba(255,255,255,0.7)',
                fontFamily: 'sans-serif', fontSize: 15,
                overflow: 'hidden', cursor: 'pointer',
                textShadow: '0 1px 4px rgba(0,0,0,0.5)',
              }}
            >
              <Search size={17} color="rgba(255,255,255,0.6)" />
              Куда хотите поехать?
            </button>
          </section>

          {/* ── КАРУСЕЛЬ АКТИВНОСТЕЙ ── */}
          <ActivityCarousel ripple={ripple} router={router} />

          {/* ── ФОТО КАРУСЕЛЬ ── */}
          <PhotoCarousel />

          <div style={{ height: 100 }} />
        </div>

        {/* ── AI КНОПКА ── */}
        <button
          onClick={(e) => { ripple(e); setAiOpen(true) }}
          className="kh-tap"
          style={{
            position: 'fixed', bottom: 86, right: 20,
            width: 52, height: 52, borderRadius: '50%',
            background: 'rgba(0,212,255,0.15)',
            backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
            border: '1.5px solid rgba(0,212,255,0.5)',
            animation: 'kh-glow 2.5s ease infinite',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#00D4FF', zIndex: 40, cursor: 'pointer', overflow: 'hidden',
          }}
        >
          <Sparkles size={22} />
        </button>

        {/* ── НИЖНИЙ НАВБАР ── */}
        <nav className="fixed bottom-0 left-0 right-0 flex justify-center pb-3 md:hidden" style={{ zIndex: 30 }}>
          <div
>>>>>>> c89c73789d933459e68d4ab3d6d705eab9bc1698
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-around',
              padding: '8px 6px',
              background: 'rgba(0,0,0,0.55)',
              backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
              border: '1px solid rgba(255,255,255,0.15)',
              borderRadius: 50,
              width: 'calc(100% - 32px)', maxWidth: 390,
              boxShadow: '0 8px 40px rgba(0,0,0,0.4)',
            }}
          >
            {NAV_ITEMS.map(({ label, Icon, href, danger }) => {
              const isActive = pathname === href
              const color = danger ? '#ef4444' : isActive ? '#00D4FF' : 'rgba(255,255,255,0.65)'
              return (
                <button
                  key={href}
                  onClick={(e) => {
                    ripple(e)
                    if (href === '#search') setSearchOpen(true)
                    else router.push(href)
                  }}
                  className="kh-tap relative flex flex-col items-center gap-1 transition-all duration-200"
                  style={{
                    color,
                    background: isActive ? 'rgba(0,212,255,0.12)' : 'transparent',
                    borderRadius: 24, padding: '5px 10px',
                    border: 'none', cursor: 'pointer',
                    minWidth: 52, minHeight: 44,
                    justifyContent: 'center', overflow: 'hidden',
                  }}
                >
                  <Icon size={21} />
                  <span style={{ fontSize: 9.5, fontFamily: 'sans-serif' }}>{label}</span>
                </button>
              )
            })}
          </div>
        </nav>
      </div>

      {/* ── ПОИСК МОДАЛ ── */}
      {searchOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end"
          style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(10px)', animation: 'kh-fade 0.2s ease' }}
          onClick={() => setSearchOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '100%',
              background: 'rgba(5,14,31,0.98)',
              backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
              borderRadius: '24px 24px 0 0',
              border: '1px solid rgba(255,255,255,0.1)',
              padding: '20px 20px 48px',
              animation: 'kh-slide-up 0.3s cubic-bezier(.4,0,.2,1)',
            }}
          >
            <div style={{ width: 40, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.2)', margin: '0 auto 20px' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
              <h3 style={{ fontFamily: 'Georgia, serif', fontSize: 20, color: '#fff' }}>Найти тур</h3>
              <button onClick={() => setSearchOpen(false)} style={{ color: 'rgba(255,255,255,0.5)', background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
                <X size={22} />
              </button>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>
              {ACTIVITIES.map(a => {
                const Icon = Icons[a.id]
                return (
                  <button
                    key={a.id}
                    onClick={() => { setSearchOpen(false); router.push(a.href) }}
                    style={{
                      padding: '8px 14px', borderRadius: 22,
                      background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)',
                      fontSize: 13, fontFamily: 'sans-serif',
                      display: 'flex', alignItems: 'center', gap: 6,
                      color: 'rgba(255,255,255,0.85)', cursor: 'pointer',
                    }}
                  >
                    <span style={{ display: 'flex', width: 16, height: 16, color: 'rgba(255,255,255,0.6)' }}><Icon /></span>
                    {a.label}
                  </button>
                )
              })}
            </div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
              {['Лето', 'Зима', 'Весна', 'Осень'].map(s => (
                <button key={s} style={{
                  flex: 1, padding: '10px 0', borderRadius: 12,
                  background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
                  textAlign: 'center', fontSize: 13, fontFamily: 'sans-serif',
                  color: '#fff', cursor: 'pointer',
                }}>{s}</button>
              ))}
            </div>
            <button
              onClick={() => { setSearchOpen(false); router.push('/search') }}
              style={{
                width: '100%', padding: 14, borderRadius: 16,
                background: '#00D4FF', color: '#000',
                fontWeight: 700, fontSize: 15, fontFamily: 'sans-serif',
                border: 'none', cursor: 'pointer',
              }}
            >
              Найти туры
            </button>
          </div>
        </div>
      )}

      {/* ── AI МОДАЛ ── */}
      {aiOpen && <AIModal onClose={() => setAiOpen(false)} />}
    </>
  )
}
