'use client';

import { useEffect, useState } from 'react';

type WeatherType = 'clear' | 'snow' | 'rain' | 'clouds';
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

      {/* Индикатор времени суток */}
      <div className="fixed top-4 right-4 z-50 bg-white/10 backdrop-blur-md rounded-2xl px-4 py-2 border border-white/20">
        <div className="flex items-center gap-3 text-white">
          <span className="text-2xl">{getTimeIcon(timeOfDay)}</span>
          <div className="text-sm">
            <div className="font-semibold">{getTimeLabel(timeOfDay)}</div>
            <div className="text-xs text-white/70">{new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}</div>
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
