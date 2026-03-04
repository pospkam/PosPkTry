👌, [04.03.2026 14:36]
'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import {
  Sun, Moon, UserCircle,
  House, Map, Heart, User, AlertTriangle
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
    ripple.style.cssText = 
      position:absolute;
      width:${size}px;height:${size}px;
      left:${e.clientX - rect.left - size / 2}px;
      top:${e.clientY - rect.top - size / 2}px;
      background:rgba(0,212,255,0.3);
      border-radius:50%;
      transform:scale(0);
      animation:kh-ripple 600ms ease-out forwards;
      pointer-events:none;
    
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

const HelicopterIcon = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2 8 L16 8" />
    <path d="M18 8 L22 8" />
    <path d="M9 8 L9 6" />
    <path d="M5 12 Q5 15 8 15 L16 15 Q19 15 19 12 L19 10 Q17 8 9 8 Q5 8 5 10 Z" />
    <path d="M8 15 L6 20 L18 20 L16 15" />
    <path d="M20 6 L22 4" />
  </svg>
)

👌, [04.03.2026 14:36]
const MarineIcon = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 2 L12 10" />
    <path d="M8 5 L12 2 L16 5" />
    <path d="M6 10 L18 10" />
    <path d="M4 10 Q7 10 8 13 L16 13 Q17 10 20 10" />
    <path d="M3 17 Q6 14 9 17 Q12 20 15 17 Q18 14 21 17" />
    <path d="M3 21 Q6 18 9 21 Q12 24 15 21 Q18 18 21 21" />
  </svg>
)

const RaftingIcon = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 3 L9 9 L15 9 Z" />
    <path d="M12 9 L12 13" />
    <path d="M5 13 L19 13 Q20 13 20 14 L20 16 Q20 17 19 17 L5 17 Q4 17 4 16 L4 14 Q4 13 5 13 Z" />
    <path d="M3 20 Q6 17 9 20 Q12 23 15 20 Q18 17 21 20" />
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
  { id: 'helicopter',label: 'Вертолёты', Icon: HelicopterIcon, href: '/tours?category=helicopter' },
  { id: 'marine',    label: 'Морские',   Icon: MarineIcon,     href: '/tours?category=marine'     },
  { id: 'rafting',   label: 'Сплавы',    Icon: RaftingIcon,    href: '/tours?category=rafting'    },
]

const NAV_ITEMS = [
  { label: 'Домой',    Icon: House,          href: '/',                      danger: false },
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
    : Array.from({ length: 5 }, (_, i) => __placeholder__${i})

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
          const isReal = !src.startsWiplaceholderer__')
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
                border: '1px solid rgba(255,255,255,0.2)',
                transition: 'transform 200ms ease',
              }}

👌, [04.03.2026 14:36]
>
              {isReal ? (
                <img
                  src={src}
                  alt={Камчатка ${i + 1}}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <span className="text-white/30 text-xs">Фото</span>
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

  useEffect(() => { setMounted(true) }, [])
  if (!mounted) return null

  const bgImage = isDark ? '/images/dark.jpg' : '/images/light.jpg'

  return (
    <>
      {/* ── глобальные анимации ── */}
      <style>{
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
        .kh-hide-scroll::-webkit-scrollbar { display: none; }
        .kh-activity:hover {
          border-color: rgba(0,212,255,0.6) !important;
          box-shadow: 0 0 14px rgba(0,212,255,0.35);
        }
        .kh-header-btn:hover {
          color: #00D4FF;
          filter: drop-shadow(0 0 6px #00D4FF);
        }
        .kh-nav-btn:hover { color: #00D4FF; }
      }</style>

      <div
        className="relative min-h-screen"
        style={{
          backgroundImage: url('${bgImage}'),
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
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

👌, [04.03.2026 14:36]
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
            Здесь начинается<br />Россия
          </h1>
          <p
            className="text-white/80 text-lg"
            style={{ textShadow: '0 1px 8px rgba(0,0,0,0.7)' }}
          >
            Камчатка — земля огня и льда
          </p>
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
            className="flex gap-3 overflow-x-auto pb-1 kh-hide-scroll"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            {ACTIVITIES.map(({ id, label, Icon, href }) => (
              <button
                key={id}
                onClick={(e) => { ripple(e); router.push(href) }}
                className="kh-activity relative flex-shrink-0 flex flex-col items-center justify-center
                           gap-2 py-4 px-3 text-white transition-all duration-200"
                style={{
                  minWidth: 80,
                  background: 'rgba(255,255,255,0.15)',
                  backdropFilter: 'blur(10px)',
                  WebkitBackdropFilter: 'blur(10px)',
                  border: '1px solid rgba(255,255,255,0.25)',
                  borderRadius: 16,
                  overflow: 'hidden',
                }}
              >
                <Icon />
                <span className="text-xs font-medium leading-tight text-center whitespace-nowrap">{label}</span>
              </button>
            ))}
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
              background: 'rgba(255,255,255,0.2)',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
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
                  onClick={(e) => { ripple(e); router.push(href) }}

👌, [04.03.2026 14:36]
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
    </>
  )
}
