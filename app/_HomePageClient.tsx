'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Sun, Moon, User, House, Map, Heart, AlertTriangle } from 'lucide-react';
import { VolcanoIcon, FishingIcon, ThermalIcon, SnowmobileIcon, JeepIcon } from '@/components/icons';

const activities = [
  { icon: VolcanoIcon, label: 'Вулканы', category: 'volcanoes' },
  { icon: FishingIcon, label: 'Рыбалка', category: 'fishing' },
  { icon: ThermalIcon, label: 'Термы', category: 'thermal' },
  { icon: SnowmobileIcon, label: 'Снегоход', category: 'snowmobile' },
  { icon: JeepIcon, label: 'Джип-туры', category: 'jeep' },
];

const navItems = [
  { icon: House, label: 'Главная', href: '/' },
  { icon: Map, label: 'Карта', href: '/map' },
  { icon: Heart, label: 'Избранное', href: '/hub/tourist/wishlist' },
  { icon: User, label: 'Профиль', href: '/profile' },
  { icon: AlertTriangle, label: 'SOS', href: '/safety', isSos: true },
];

export default function HomePageClient() {
  const [isDark, setIsDark] = useState(false);
  const [activeTab, setActiveTab] = useState('/');
  const router = useRouter();

  useEffect(() => {
    // Detect mobile and set default light theme
    const isMobile = window.innerWidth <= 430;
    const savedTheme = localStorage.getItem('kh-theme');
    const defaultLight = isMobile && !savedTheme;
    setIsDark(savedTheme === 'dark' || (!defaultLight && savedTheme !== 'light'));
  }, []);

  const toggleTheme = () => {
    const newTheme = !isDark;
    setIsDark(newTheme);
    localStorage.setItem('kh-theme', newTheme ? 'dark' : 'light');
  };

  const handleActivityClick = (category: string) => {
    router.push(`/tours?category=${category}`);
  };

  const handleNavClick = (href: string) => {
    setActiveTab(href);
    router.push(href);
  };

  const createRipple = (event: React.MouseEvent) => {
    const button = event.currentTarget;
    const circle = document.createElement('span');
    const diameter = Math.max(button.clientWidth, button.clientHeight);
    const radius = diameter / 2;

    circle.style.width = circle.style.height = `${diameter}px`;
    circle.style.left = `${event.clientX - button.offsetLeft - radius}px`;
    circle.style.top = `${event.clientY - button.offsetTop - radius}px`;
    circle.classList.add('ripple-effect');

    const ripple = button.getElementsByClassName('ripple-effect')[0];
    if (ripple) {
      ripple.remove();
    }

    button.appendChild(circle);
  };

  return (
    <div className={`min-h-screen ${isDark ? 'dark' : ''}`}>
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-transparent backdrop-blur-md">
        <div className="flex justify-between items-center px-4 py-3 max-w-md mx-auto">
          <div className="text-2xl font-bold text-white">KH</div>
          <div className="flex items-center gap-4">
            <button
              onClick={toggleTheme}
              className="p-2 rounded-full hover:bg-cyan-400/20 transition-colors duration-200"
              onMouseDown={createRipple}
            >
              {isDark ? <Sun className="w-5 h-5 text-white" /> : <Moon className="w-5 h-5 text-white" />}
            </button>
            <button
              className="p-2 rounded-full hover:bg-cyan-400/20 transition-colors duration-200"
              onMouseDown={createRipple}
            >
              <User className="w-5 h-5 text-white" />
            </button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative h-screen flex items-center justify-center">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: `url('/images/${isDark ? 'dark' : 'light'}.jpg')`,
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/50 to-black/70" />
        <div className="relative z-10 text-center text-white px-4">
          <h1 className="text-4xl font-bold mb-2 drop-shadow-lg">
            Здесь начинается Россия
          </h1>
          <h2 className="text-lg text-white/80 drop-shadow">
            Камчатка — земля огня и льда
          </h2>
        </div>
      </section>

      {/* Activities */}
      <section className="py-8 px-4 max-w-md mx-auto">
        <h2 className="text-2xl font-bold text-white mb-6 text-center">
          Активности Камчатки
        </h2>
        <div className="grid grid-cols-2 gap-4">
          {activities.map((activity) => (
            <button
              key={activity.category}
              onClick={() => handleActivityClick(activity.category)}
              className="bg-white/15 backdrop-blur-md border border-white/25 rounded-2xl p-4 text-center hover:border-cyan-400 transition-all duration-200 hover:shadow-lg hover:shadow-cyan-400/50"
              onMouseDown={createRipple}
            >
              <activity.icon className="w-8 h-8 mx-auto mb-2 text-white" />
              <span className="text-sm text-white">{activity.label}</span>
            </button>
          ))}
        </div>
      </section>

      {/* Carousel */}
      <section className="py-8 px-4 max-w-md mx-auto">
        <h2 className="text-2xl font-bold text-white mb-6 text-center">
          Камчатка глазами путешественников
        </h2>
        <div className="flex gap-4 overflow-x-auto scrollbar-hide">
          {/* Placeholder for carousel items */}
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex-shrink-0 w-32 h-24 bg-gray-300 rounded-2xl"></div>
          ))}
        </div>
      </section>

      {/* Bottom Nav - Mobile Only */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white/20 backdrop-blur-xl border-t border-white/30 rounded-t-3xl mx-4 mb-6 py-3 px-6 max-w-md mx-auto md:hidden">
        <div className="flex justify-around">
          {navItems.map((item) => (
            <button
              key={item.href}
              onClick={() => handleNavClick(item.href)}
              className={`flex flex-col items-center p-2 rounded-lg transition-colors duration-200 ${
                activeTab === item.href ? 'text-cyan-400' : item.isSos ? 'text-red-500' : 'text-white'
              }`}
              onMouseDown={createRipple}
            >
              <item.icon className="w-5 h-5" />
              <span className="text-xs mt-1">{item.label}</span>
            </button>
          ))}
        </div>
      </nav>

      {/* Ripple Styles */}
      <style jsx>{`
        .ripple-effect {
          position: absolute;
          border-radius: 50%;
          background-color: rgba(0, 212, 255, 0.3);
          transform: scale(0);
          animation: ripple 600ms linear;
          pointer-events: none;
        }

        @keyframes ripple {
          to {
            transform: scale(4);
            opacity: 0;
          }
        }

        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }

        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </div>
  );
}
