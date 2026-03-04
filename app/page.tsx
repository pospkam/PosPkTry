'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import {
  Sun, Moon, UserCircle, Search, X, Camera,
  Map, Heart, User, AlertTriangle
} from 'lucide-react'
import { useTheme } from '@/contexts/ThemeContext'

// ─────────────────────────────────────────────
// RIPPLE
// ─────────────────────────────────────────────
function useRipple() {
  return (e: React.MouseEvent<HTMLElement>) => {
    const el = e.currentTarget
    const ripple = document.createElement('span')
    const rect = el.getBoundingClientRect()
    const size = Math.max(rect.width, rect.height)
    ripple.style.cssText = `
      position:absolute;
      width:${size}px;height:${size}px;
      left:${e.clientX - rect.left - size / 2}px;
      top:${e.clientY - rect.top - size / 2}px;
      background:rgba(0,212,255,0.3);
      border-radius:50%;
      transform:scale(0);
      animation:kh-ripple 600ms ease-out forwards;
      pointer-events:none;
    `
    
    el.appendChild(ripple)
    setTimeout(() => ripple.remove(), 600)
  }
}

// ─────────────────────────────────────────────
// SVG ИКОНКИ АКТИВНОСТЕЙ (stroke only, no fill)
// ─────────────────────────────────────────────
const VolcanoIcon = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 2c0 0-1 2-1 4" />
    <path d="M12 2c0 0 1 2 1 4" />
    <path d="M11 6 L5 20 L19 20 L13 6 Z" />
    <path d="M3 20 Q6 17 9 20 Q12 23 15 20 Q18 17 21 20" />
  </svg>
)

const FishingIcon = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 4 L4 14" />
    <path d="M4 4 Q10 2 12 8" />
    <path d="M12 8 Q14 14 10 16" />
    <circle cx="10" cy="17" r="1.5" />
    <path d="M3 20 Q6 17 9 20 Q12 23 15 20 Q18 17 21 20" />
  </svg>
)

const ThermalIcon = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M8 2 Q8 4 9 5 Q10 6 9 8" />
    <path d="M12 2 Q12 4 13 5 Q14 6 13 8" />
    <path d="M16 2 Q16 4 17 5 Q18 6 17 8" />
    <path d="M4 16 Q4 13 7 12 L17 12 Q20 13 20 16 L20 18 Q20 20 17 20 L7 20 Q4 20 4 18 Z" />
    <path d="M4 16 Q2 18 4 20" />
    <path d="M20 16 Q22 18 20 20" />
  </svg>
)

const SnowmobileIcon = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2 13 Q7 9 12 10 L20 10 Q22 10 22 13 L22 15 L2 15 Z" />
    <path d="M10 10 L12 6 L17 6 Q19 6 19 8 L19 10" />
    <circle cx="6" cy="18" r="2" />
    <circle cx="18" cy="18" r="2" />
    <path d="M2 15 L0 18" />
    <path d="M8 15 L8 16" />
    <path d="M16 15 L16 16" />
  </svg>
)

const JeepIcon = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 17 L3 12 Q3 9 5 9 L8 6 L16 6 L19 9 Q21 9 21 12 L21 17" />
    <path d="M1 17 L23 17" />
    <circle cx="6" cy="19.5" r="2" />
    <circle cx="18" cy="19.5" r="2" />
    <path d="M8 6 L8 9 L16 9 L16 6" />
    <path d="M12 9 L12 6" />
    <path d="M3 13 L21 13" />
  </svg>
)



// ─────────────────────────────────────────────
// ДАННЫЕ
// ─────────────────────────────────────────────
const ACTIVITIES = [
  { id: 'volcanoes',  label: 'Вулканы',   Icon: VolcanoIcon,    href: '/tours?category=volcanoes'  },
  { id: 'fishing',   label: 'Рыбалка',   Icon: FishingIcon,    href: '/tours?category=fishing'    },
  { id: 'thermal',   label: 'Термы',     Icon: ThermalIcon,    href: '/tours?category=thermal'    },
  { id: 'snowmobile',label: 'Снегоход',  Icon: SnowmobileIcon, href: '/tours?category=snowmobile' },
  { id: 'jeep',      label: 'Джип-туры', Icon: JeepIcon,       href: '/tours?category=jeep'       },
]

const NAV_ITEMS = [
  { label: 'Поиск',    Icon: Search,         href: '#search',                danger: false },
  { label: 'Карта',    Icon: Map,            href: '/map',                   danger: false },
  { label: 'Избранное',Icon: Heart,          href: '/hub/tourist/wishlist',  danger: false },
  { label: 'ЛК',       Icon: User,           href: '/profile',               danger: false },
  { label: 'СОС',      Icon: AlertTriangle,  href: '/safety',                danger: true  },
]

// ─────────────────────────────────────────────
// КАРУСЕЛЬ
// ─────────────────────────────────────────────
// Добавь реальные пути сюда когда загрузишь файлы:
const CAROUSEL_IMAGES: string[] = [
  // '/images/carousel/photo1.jpg',
  // '/images/carousel/photo2.jpg',
]

function PhotoCarousel() {
  const [selected, setSelected] = useState<string | null>(null)

  const items = CAROUSEL_IMAGES.length > 0
    ? CAROUSEL_IMAGES
    : Array.from({ length: 5 }, (_, i) => `__placeholder__${i}`)

  return (
    <section className="px-4 pb-6">
      <h2
        className="font-playfair text-white text-xl font-bold text-center mb-3"
        style={{ textShadow: '0 2px 8px rgba(0,0,0,0.7)' }}
      >
        Камчатка глазами путешественников
      </h2>

      <div
        className="flex gap-3 overflow-x-auto pb-1"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {items.map((src, i) => {
          const isReal = !src.startsWith('__placeholder__')
          return (
            <div
              key={i}
              onClick={() => isReal ? setSelected(src) : null}
              className="flex-shrink-0 rounded-2xl overflow-hidden"
              style={{
                minWidth: 120,
                height: 160,
                cursor: isReal ? 'pointer' : 'default',
                background: 'rgba(255,255,255,0.1)',
                backdropFilter: 'blur(10px)',
                WebkitBackdropFilter: 'blur(10px)',
                border: '1px solid rgba(255,255,255,0.2)',
                borderRadius: 16,
                transition: 'transform 200ms ease',
              }}
            >
              {isReal ? (
                <img
                  src={src}
                  alt={`Камчатка ${i + 1}`}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Camera size={28} className="text-white/40" />
                </div>
              )}
            </div>
          )
        })}
      </div>

      {selected && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90"
          onClick={() => setSelected(null)}
          style={{ animation: 'kh-fade 300ms ease' }}
        >
          <img
            src={selected}
            alt="Камчатка"
            className="max-w-full max-h-full object-contain rounded-2xl"
            style={{ animation: 'kh-scale 300ms ease' }}
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </section>
  )
}

// ─────────────────────────────────────────────
// ГЛАВНАЯ СТРАНИЦА
// ─────────────────────────────────────────────
export default function HomePage() {
  const { isDark, toggleTheme } = useTheme()
  const router  = useRouter()
  const pathname = usePathname()
  const ripple  = useRipple()
  const [mounted, setMounted] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [selectedActivity, setSelectedActivity] = useState<string | null>(null)

  useEffect(() => { setMounted(true) }, [])
  if (!mounted) return null

  const bgImage = isDark ? '/images/dark.jpg' : '/images/light.jpg'

  return (
    <>
      {/* ── глобальные анимации ── */}
      <style>{`
        @keyframes kh-ripple {
          to { transform: scale(4); opacity: 0; }
        }
        @keyframes kh-fade {
          from { opacity: 0; } to { opacity: 1; }
        }
        @keyframes kh-scale {
          from { transform: scale(0.85); opacity: 0; }
          to   { transform: scale(1);    opacity: 1; }
        }
        @keyframes kh-slide-up {
          from { opacity: 0; transform: translateY(100%); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .kh-hide-scroll::-webkit-scrollbar { display: none; }
        .kh-activity:hover {
          border-color: rgba(0,212,255,0.5) !important;
        }
        .kh-header-btn:hover {
          color: #00D4FF;
          filter: drop-shadow(0 0 6px #00D4FF);
        }
        .kh-nav-btn:hover { color: #00D4FF; }
      `}</style>

      <div
        className="relative"
        style={{
          backgroundImage: `url('${bgImage}')`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          minHeight: '100dvh',
        }}
      >
        {/* ── верхний градиент ── */}
        <div
          className="fixed top-0 left-0 right-0 h-28 pointer-events-none z-10"
          style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.55), transparent)' }}
        />

        {/* ── ХЕДЕР ── */}
        <header className="fixed top-0 left-0 right-0 z-20 flex items-center justify-between px-4 h-14">
          <span className="font-playfair text-white text-2xl font-bold tracking-wide"
            style={{ textShadow: '0 1px 8px rgba(0,0,0,0.5)' }}>
            КН
          </span>
          <div className="flex items-center gap-2">
            {/* переключатель темы */}
            <button
              onClick={(e) => { ripple(e); toggleTheme() }}
              className="kh-header-btn relative text-white transition-all duration-200
                         flex items-center justify-center min-h-[44px] min-w-[44px] rounded-full overflow-hidden"
              style={{
                background: 'rgba(255,255,255,0.12)',
                backdropFilter: 'blur(8px)',
                border: '1px solid rgba(255,255,255,0.25)',
              }}
            >
              {isDark ? <Sun size={20} /> : <Moon size={20} />}
            </button>
            {/* личный кабинет */}

<button
              onClick={(e) => { ripple(e); router.push('/profile') }}
              className="kh-header-btn relative text-white transition-all duration-200
                         flex items-center justify-center min-h-[44px] min-w-[44px] rounded-full overflow-hidden"
              style={{
                background: 'rgba(255,255,255,0.12)',
                backdropFilter: 'blur(8px)',
                border: '1px solid rgba(255,255,255,0.25)',
              }}
            >
              <UserCircle size={20} />
            </button>
          </div>
        </header>

        {/* ── HERO ── */}
        <section className="relative flex flex-col items-center text-center px-4 pt-20 pb-6">
          <h1
            className="font-playfair text-white font-bold text-4xl leading-tight mb-2"
            style={{ textShadow: '0 2px 16px rgba(0,0,0,0.85)' }}
          >
            Здесь начинается Россия
          </h1>
          <h2
            className="text-white/80 text-lg font-normal"
            style={{ textShadow: '0 1px 8px rgba(0,0,0,0.7)' }}
          >
            Камчатка — земля огня и льда
          </h2>
        </section>

        {/* ── АКТИВНОСТИ ── */}
        <section className="px-4 pb-6">
          <h2
            className="font-playfair text-white text-xl font-bold text-center mb-4"
            style={{ textShadow: '0 2px 8px rgba(0,0,0,0.7)' }}
          >
            Активности Камчатки
          </h2>
          <div
            className="flex flex-wrap justify-center gap-3 mx-auto"
            style={{ maxWidth: 340 }}
          >
            {ACTIVITIES.map(({ id, label, Icon, href }) => {
              const isSelected = selectedActivity === id
              return (
                <button
                  key={id}
                  onClick={(e) => {
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
            style={{
              background: isDark ? 'rgba(0,0,0,0.3)' : 'rgba(255,255,255,0.2)',
              backdropFilter: 'blur(10px)',
              WebkitBackdropFilter: 'blur(10px)',
              border: '1px solid rgba(255,255,255,0.3)',
              borderRadius: 50,
              width: 'calc(100% - 32px)',
              maxWidth: 430,
            }}
          >
            {NAV_ITEMS.map(({ label, Icon, href, danger }) => {
              const isActive = pathname === href
              const color = danger
                ? '#ef4444'
                : isActive ? '#00D4FF' : 'rgba(255,255,255,0.75)'
              return (
                <button
                  key={href}
                  onClick={(e) => {
                    ripple(e)
                    if (href === '#search') { setSearchOpen(true) } else { router.push(href) }
                  }}
                  className="kh-nav-btn relative flex flex-col items-center gap-1
                             min-w-[44px] min-h-[44px] justify-center transition-all duration-200 overflow-hidden"
                  style={{ color }}
                >
                  <Icon size={22} />
                  <span className="text-[10px] font-medium">{label}</span>
                </button>
              )
            })}
          </div>
        </nav>

        {/* ── ФУТЕР (только desktop) ── */}
        <footer
          className="hidden md:block py-5 px-8"
          style={{
            background: 'rgba(0,0,0,0.45)',
            backdropFilter: 'blur(8px)',
            borderTop: '1px solid rgba(255,255,255,0.1)',
          }}
        >
          <div className="flex items-center justify-between max-w-5xl mx-auto">
            <span className="text-white/60 text-sm">© 2025 KamchatourHub</span>
            <div className="flex gap-6">
              {['О проекте', 'Контакты', 'Операторам', 'Политика'].map(link => (
                <a
                  key={link}
                  href="#"
                  className="text-white/60 text-sm hover:text-white transition-colors"
                >
                  {link}
                </a>
              ))}
            </div>
          </div>
        </footer>
      </div>

      {/* Search Modal */}
      {searchOpen && (
        <div
          className="fixed inset-0 z-50 flex flex-col"
          style={{
            background: isDark ? 'rgba(0,0,0,0.7)' : 'rgba(255,255,255,0.7)',
            backdropFilter: 'blur(10px)',
            WebkitBackdropFilter: 'blur(10px)',
            animation: 'kh-slide-up 300ms ease forwards',
          }}
        >
          <div className="flex items-center justify-between px-5 pt-5 pb-3">
            <h2
              className="font-playfair text-white text-xl font-bold"
              style={{ textShadow: '0 1px 4px rgba(0,0,0,0.5)' }}
            >
              Поиск туров
            </h2>
            <button
              onClick={() => setSearchOpen(false)}
              className="text-white min-h-[44px] min-w-[44px] flex items-center justify-center rounded-full"
              style={{
                background: 'rgba(255,255,255,0.1)',
                border: '1px solid rgba(255,255,255,0.2)',
              }}
              aria-label="Закрыть поиск"
            >
              <X size={20} />
            </button>
          </div>
          <div className="flex-1 flex items-center justify-center px-4">
            <p className="text-white/60 text-base text-center">Выберите даты и активности</p>
          </div>
        </div>
      )}
    </>
  )
}
