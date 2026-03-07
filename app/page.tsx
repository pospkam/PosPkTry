
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

// --- Header ---
function Header() {
  return (
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
      </div>
    </header>
  )
}

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
    </section>
  )
}

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
      `}</style>
    </div>
  )
// Удалён ошибочный фрагмент, который был вне функции

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
