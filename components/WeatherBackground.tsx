'use client';

import { useEffect, useState } from 'react';

type WeatherType = 'clear' | 'snow' | 'rain' | 'wind';
type TimeOfDay = 'night' | 'morning' | 'day' | 'evening';

export default function WeatherBackground() {
  const [timeOfDay, setTimeOfDay] = useState<TimeOfDay>('day');
  const [weather, setWeather] = useState<WeatherType>('clear');

  useEffect(() => {
    // Определяем время суток по часам
    const updateTimeOfDay = () => {
      const hour = new Date().getHours();
      
      if (hour >= 0 && hour < 6) {
        setTimeOfDay('night');
      } else if (hour >= 6 && hour < 12) {
        setTimeOfDay('morning');
      } else if (hour >= 12 && hour < 18) {
        setTimeOfDay('day');
      } else {
        setTimeOfDay('evening');
      }
    };

    updateTimeOfDay();
    const interval = setInterval(updateTimeOfDay, 60000); // Обновляем каждую минуту

    // Демо: меняем погоду каждые 30 секунд для демонстрации
    const weatherTypes: WeatherType[] = ['clear', 'snow', 'rain', 'wind'];
    let weatherIndex = 0;
    
    const weatherInterval = setInterval(() => {
      weatherIndex = (weatherIndex + 1) % weatherTypes.length;
      setWeather(weatherTypes[weatherIndex]);
    }, 30000);

    return () => {
      clearInterval(interval);
      clearInterval(weatherInterval);
    };
  }, []);

  // Градиенты для разного времени суток
  const gradients = {
    night: 'linear-gradient(180deg, #0a1929 0%, #1a2332 30%, #2a3442 70%, #0a1929 100%)',
    morning: 'linear-gradient(180deg, #FFB347 0%, #FFCC33 20%, #87CEEB 50%, #B3D9F5 100%)',
    day: 'linear-gradient(180deg, #4A90E2 0%, #7FB4E8 50%, #B3D9F5 100%)',
    evening: 'linear-gradient(180deg, #FF6B6B 0%, #FF8E53 30%, #4A90E2 70%, #2C5F8D 100%)'
  };

  return (
    <>
      {/* Динамический фон по времени суток */}
      <div 
        className="fixed inset-0 -z-20 transition-all duration-[3000ms]"
        style={{ background: gradients[timeOfDay] }}
      />

      {/* Фоновое изображение */}
      <div className="fixed inset-0 -z-10 opacity-30">
        <div 
          className="w-full h-full bg-cover bg-top bg-no-repeat transition-opacity duration-[3000ms]"
          style={{
            backgroundImage: `url(/fon.jpg)`,
            opacity: timeOfDay === 'night' ? 0.1 : 0.3
          }}
        />
      </div>

      {/* Погодные эффекты */}
      {weather === 'snow' && <SnowEffect />}
      {weather === 'rain' && <RainEffect />}
      {weather === 'wind' && <WindEffect />}

      {/* Индикатор времени и погоды */}
      <div className="fixed top-4 right-4 z-50 bg-white/10 backdrop-blur-md rounded-2xl px-4 py-2 border border-white/20">
        <div className="flex items-center gap-3 text-white">
          <span className="text-2xl">
            {weather === 'clear' && '☀️'}
            {weather === 'snow' && '❄️'}
            {weather === 'rain' && '🌧️'}
            {weather === 'wind' && '💨'}
          </span>
          <div className="text-sm">
            <div className="font-semibold capitalize">{getTimeLabel(timeOfDay)}</div>
            <div className="text-xs text-white/70">{getWeatherLabel(weather)}</div>
          </div>
        </div>
      </div>
    </>
  );
}

// Эффект снега
function SnowEffect() {
  const snowflakes = Array.from({ length: 50 }, (_, i) => ({
    id: i,
    left: Math.random() * 100,
    delay: Math.random() * 5,
    duration: 5 + Math.random() * 5,
    size: 2 + Math.random() * 4
  }));

  return (
    <div className="fixed inset-0 pointer-events-none z-10 overflow-hidden">
      {snowflakes.map(flake => (
        <div
          key={flake.id}
          className="absolute text-white animate-fall"
          style={{
            left: `${flake.left}%`,
            top: '-10px',
            animationDelay: `${flake.delay}s`,
            animationDuration: `${flake.duration}s`,
            fontSize: `${flake.size}px`,
            opacity: 0.8
          }}
        >
          ❄
        </div>
      ))}
      <style jsx>{`
        @keyframes fall {
          to {
            transform: translateY(110vh) translateX(50px);
            opacity: 0;
          }
        }
        .animate-fall {
          animation: fall linear infinite;
        }
      `}</style>
    </div>
  );
}

// Эффект дождя
function RainEffect() {
  const raindrops = Array.from({ length: 100 }, (_, i) => ({
    id: i,
    left: Math.random() * 100,
    delay: Math.random() * 2,
    duration: 0.5 + Math.random() * 0.5
  }));

  return (
    <div className="fixed inset-0 pointer-events-none z-10 overflow-hidden">
      {raindrops.map(drop => (
        <div
          key={drop.id}
          className="absolute w-0.5 h-12 bg-gradient-to-b from-blue-300/60 to-transparent animate-rain"
          style={{
            left: `${drop.left}%`,
            top: '-50px',
            animationDelay: `${drop.delay}s`,
            animationDuration: `${drop.duration}s`
          }}
        />
      ))}
      <style jsx>{`
        @keyframes rain {
          to {
            transform: translateY(110vh);
          }
        }
        .animate-rain {
          animation: rain linear infinite;
        }
      `}</style>
    </div>
  );
}

// Эффект ветра
function WindEffect() {
  const leaves = Array.from({ length: 20 }, (_, i) => ({
    id: i,
    startY: Math.random() * 100,
    delay: Math.random() * 5,
    duration: 3 + Math.random() * 4
  }));

  return (
    <div className="fixed inset-0 pointer-events-none z-10 overflow-hidden">
      {leaves.map(leaf => (
        <div
          key={leaf.id}
          className="absolute text-2xl animate-wind"
          style={{
            left: '-50px',
            top: `${leaf.startY}%`,
            animationDelay: `${leaf.delay}s`,
            animationDuration: `${leaf.duration}s`
          }}
        >
          🍃
        </div>
      ))}
      <style jsx>{`
        @keyframes wind {
          to {
            transform: translateX(110vw) translateY(-100px) rotate(360deg);
            opacity: 0;
          }
        }
        .animate-wind {
          animation: wind linear infinite;
        }
      `}</style>
    </div>
  );
}

function getTimeLabel(time: TimeOfDay): string {
  const labels = {
    night: 'Ночь',
    morning: 'Утро',
    day: 'День',
    evening: 'Вечер'
  };
  return labels[time];
}

function getWeatherLabel(weather: WeatherType): string {
  const labels = {
    clear: 'Ясно',
    snow: 'Снег',
    rain: 'Дождь',
    wind: 'Ветер'
  };
  return labels[weather];
}
