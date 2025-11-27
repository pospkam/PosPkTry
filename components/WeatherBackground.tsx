'use client';

import { useEffect, useState } from 'react';
import { CloudSnow, Wind } from 'lucide-react';

type WeatherType = 'clear' | 'snow' | 'rain' | 'clouds' | 'wind';
type TimeOfDay = 'dawn' | 'morning' | 'afternoon' | 'evening' | 'late-evening' | 'night';

export default function WeatherBackground() {
  const [timeOfDay, setTimeOfDay] = useState<TimeOfDay>('afternoon');
  const [weather, setWeather] = useState<WeatherType>('clear');

  useEffect(() => {
    // Определяем время суток по часам (Камчатское время UTC+12)
    const updateTimeOfDay = () => {
      const hour = new Date().getHours();
      
      if (hour >= 5 && hour < 7) {
        setTimeOfDay('dawn');
      } else if (hour >= 7 && hour < 12) {
        setTimeOfDay('morning');
      } else if (hour >= 12 && hour < 18) {
        setTimeOfDay('afternoon');
      } else if (hour >= 18 && hour < 21) {
        setTimeOfDay('evening');
      } else if (hour >= 21 && hour < 23) {
        setTimeOfDay('late-evening');
      } else {
        setTimeOfDay('night');
      }
    };

    updateTimeOfDay();
    const interval = setInterval(updateTimeOfDay, 60000); // Обновляем каждую минуту

    return () => {
      clearInterval(interval);
    };
  }, []);

  // Градиенты для 6 временных зон
  const gradients = {
    dawn: 'linear-gradient(180deg, #F9A8D4 0%, #FED7AA 50%, #FBBF24 100%)',
    morning: 'linear-gradient(180deg, #7DD3FC 0%, #BAE6FD 50%, #E0F2FE 100%)',
    afternoon: 'linear-gradient(180deg, #60A5FA 0%, #7DD3FC 50%, #93C5FD 100%)',
    evening: 'linear-gradient(180deg, #FCA5A5 0%, #F9A8D4 50%, #D8B4FE 100%)',
    'late-evening': 'linear-gradient(180deg, #818CF8 0%, #A78BFA 50%, #C4B5FD 100%)',
    night: 'linear-gradient(180deg, #1e1b4b 0%, #312e81 50%, #0c4a6e 100%)'
  };

  return (
    <>
      {/* Динамический градиентный фон */}
      <div 
        className="fixed inset-0 -z-20 transition-all duration-[3000ms]"
        style={{ background: gradients[timeOfDay] }}
      />

      {/* Облака - всегда присутствуют */}
      <CloudsEffect />

      {/* ПОГОДНЫЕ АНИМАЦИИ */}
      {weather === 'snow' && <SnowEffect />}
      {weather === 'wind' && <WindEffect />}

      {/* Индикатор времени суток */}
      <div className={`fixed top-4 right-4 z-50 ${timeOfDay === 'night' ? 'bg-white/15' : 'bg-white/60'} backdrop-blur-md rounded-2xl px-4 py-2 border ${timeOfDay === 'night' ? 'border-white/20' : 'border-white/30'} shadow-lg`}>
        <div className={`flex items-center gap-3 ${timeOfDay === 'night' ? 'text-white' : 'text-gray-900'}`}>
          <span className="text-2xl">{getTimeIcon(timeOfDay)}</span>
          <div className="text-sm">
            <div className="font-semibold">{getTimeLabel(timeOfDay)}</div>
            <div className={`text-xs ${timeOfDay === 'night' ? 'text-white/70' : 'text-gray-600'}`}>{new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}</div>
          </div>
        </div>
      </div>
    </>
  );
}

// Эффект облаков
function CloudsEffect() {
  const clouds = [
    { id: 1, top: '15%', left: '-10%', width: '800px', duration: 120 },
    { id: 2, top: '40%', right: '-15%', width: '1000px', duration: 100, delay: 50 },
    { id: 3, bottom: '20%', left: '-20%', width: '900px', duration: 110, delay: 70 }
  ];

  return (
    <div className="fixed inset-0 pointer-events-none -z-10 overflow-hidden">
      {clouds.map(cloud => (
        <div
          key={cloud.id}
          className="absolute rounded-full opacity-20"
          style={{
            top: cloud.top,
            left: cloud.left,
            right: cloud.right,
            bottom: cloud.bottom,
            width: cloud.width,
            height: '300px',
            background: 'radial-gradient(ellipse, rgba(255, 255, 255, 0.6) 0%, transparent 70%)',
            animation: `float ${cloud.duration}s ease-in-out infinite`,
            animationDelay: `${cloud.delay || 0}s`
          }}
        />
      ))}
      <style jsx>{`
        @keyframes float {
          0%, 100% {
            transform: translate(0, 0);
          }
          25% {
            transform: translate(100px, -50px);
          }
          50% {
            transform: translate(200px, 0);
          }
          75% {
            transform: translate(100px, 50px);
          }
        }
      `}</style>
    </div>
  );
}

function getTimeIcon(time: TimeOfDay): React.ReactNode {
  // NO EMOJIS - Using lucide-react icons
  const icons: Record<TimeOfDay, string> = {
    dawn: 'Sunrise',
    morning: 'Sun',
    afternoon: 'Sun',
    evening: 'Sunset',
    'late-evening': 'CloudMoon',
    night: 'Moon'
  };
  return icons[time];
}

function getTimeLabel(time: TimeOfDay): string {
  const labels = {
    dawn: 'Рассвет',
    morning: 'Утро',
    afternoon: 'День',
    evening: 'Вечер',
    'late-evening': 'Поздний вечер',
    night: 'Ночь'
  };
  return labels[time];
}

// ЭФФЕКТ СНЕГА (50 СНЕЖИНОК)
function SnowEffect() {
  const snowflakes = Array.from({ length: 50 }, (_, i) => ({
    id: i,
    left: Math.random() * 100,
    delay: Math.random() * 3,
    duration: 3 + Math.random() * 2,
    size: 16 + Math.random() * 16
  }));

  return (
    <div className="fixed inset-0 pointer-events-none z-10 overflow-hidden">
      {snowflakes.map((flake) => (
        <CloudSnow
          key={flake.id}
          className="absolute text-white/60 animate-snow"
          style={{
            left: `${flake.left}%`,
            top: `-${Math.random() * 20}px`,
            width: `${flake.size}px`,
            height: `${flake.size}px`,
            animationDelay: `${flake.delay}s`,
            animationDuration: `${flake.duration}s`
          }}
        />
      ))}
      <style jsx>{`
        @keyframes snow {
          0% {
            transform: translateY(0) translateX(0) rotate(0deg);
            opacity: 1;
          }
          100% {
            transform: translateY(100vh) translateX(100px) rotate(360deg);
            opacity: 0.3;
          }
        }
      `}</style>
    </div>
  );
}

// ЭФФЕКТ ВЕТРА (20 ЛИНИЙ)
function WindEffect() {
  const windLines = Array.from({ length: 20 }, (_, i) => ({
    id: i,
    top: Math.random() * 100,
    delay: Math.random() * 2,
    duration: 2 + Math.random()
  }));

  return (
    <div className="fixed inset-0 pointer-events-none z-10 overflow-hidden">
      {windLines.map((line) => (
        <Wind
          key={line.id}
          className="absolute text-white/40 animate-wind"
          style={{
            top: `${line.top}%`,
            left: '-10%',
            width: '32px',
            height: '32px',
            animationDelay: `${line.delay}s`,
            animationDuration: `${line.duration}s`
          }}
        />
      ))}
      <style jsx>{`
        @keyframes wind {
          0% {
            transform: translateX(0);
            opacity: 0;
          }
          50% {
            opacity: 1;
          }
          100% {
            transform: translateX(120vw);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
}
