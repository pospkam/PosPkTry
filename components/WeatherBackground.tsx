'use client';

import { useEffect, useState } from 'react';

type WeatherType = 'clear' | 'snow' | 'rain' | 'wind';
type TimeOfDay = 'night' | 'morning' | 'day' | 'evening';

interface WeatherData {
  temperature: number;
  feelsLike: number;
  condition: string;
  weatherType: WeatherType;
  timeOfDay: TimeOfDay;
  windSpeed: number;
  humidity: number;
  pressure: number;
  emoji: string;
  location: string;
  isFallback?: boolean;
}

export default function WeatherBackground() {
  const [timeOfDay, setTimeOfDay] = useState<TimeOfDay>('day');
  const [weather, setWeather] = useState<WeatherType>('clear');
  const [weatherData, setWeatherData] = useState<WeatherData | null>(null);
  const [temperature, setTemperature] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Получаем реальную погоду с Яндекс API
    const fetchWeather = async () => {
      try {
        console.log('Запрос погоды с Яндекс API...');
        const response = await fetch('/api/weather');
        const result = await response.json();
        
        if (result.success && result.data) {
          const data = result.data;
          console.log('✅ Погода получена:', data);
          
          setWeatherData(data);
          setWeather(data.weatherType);
          setTimeOfDay(data.timeOfDay);
          setTemperature(data.temperature);
          
          if (data.isFallback) {
            console.log('Используются fallback данные погоды');
          }
        } else {
          console.error('❌ Ошибка получения погоды:', result.error);
          // Используем локальное время суток
          updateLocalTimeOfDay();
        }
      } catch (error) {
        console.error('❌ Ошибка запроса погоды:', error);
        updateLocalTimeOfDay();
      } finally {
        setLoading(false);
      }
    };

    // Определяем время суток локально (fallback) - Камчатское время UTC+12
    const updateLocalTimeOfDay = () => {
      // Получаем время в Петропавловске-Камчатском (UTC+12)
      const now = new Date();
      const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
      const kamchatkaTime = new Date(utc + (3600000 * 12));
      const hour = kamchatkaTime.getHours();
      
      console.log('Текущий час в Камчатке:', hour);
      
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

    // Первоначальная загрузка
    fetchWeather();
    
    // Обновляем погоду каждые 10 минут
    const weatherInterval = setInterval(fetchWeather, 600000);
    
    // Обновляем время суток каждую минуту
    const timeInterval = setInterval(updateLocalTimeOfDay, 60000);

    return () => {
      clearInterval(weatherInterval);
      clearInterval(timeInterval);
    };
  }, []);

  // Прозрачные градиенты для разного времени суток (намекают, но не закрывают фото)
  const gradients = {
    night: 'linear-gradient(180deg, rgba(10, 25, 41, 0.5) 0%, rgba(26, 35, 50, 0.4) 30%, rgba(42, 52, 66, 0.3) 70%, rgba(10, 25, 41, 0.4) 100%)',
    morning: 'linear-gradient(180deg, rgba(255, 179, 71, 0.25) 0%, rgba(255, 204, 51, 0.2) 20%, rgba(135, 206, 235, 0.15) 50%, rgba(179, 217, 245, 0.1) 100%)',
    day: 'linear-gradient(180deg, rgba(74, 144, 226, 0.2) 0%, rgba(127, 180, 232, 0.15) 50%, rgba(179, 217, 245, 0.1) 100%)',
    evening: 'linear-gradient(180deg, rgba(255, 107, 107, 0.3) 0%, rgba(255, 142, 83, 0.25) 30%, rgba(74, 144, 226, 0.2) 70%, rgba(44, 95, 141, 0.3) 100%)'
  };

  return (
    <div suppressHydrationWarning>
      {/* Динамический фон по времени суток */}
      <div 
        className="fixed inset-0 -z-20 transition-all duration-[3000ms]"
        style={{ background: gradients[timeOfDay] }}
      />

      {/* Фоновое изображение с параллакс эффектом */}
      <div className="fixed inset-0 -z-10">
        <div 
          className="w-full h-full bg-cover bg-top bg-no-repeat transition-opacity duration-[3000ms]"
          style={{
            backgroundImage: `url(/fon.jpg)`,
            opacity: timeOfDay === 'night' ? 0.7 : 0.9,
            transform: 'scale(1.1)', // Небольшое увеличение для параллакс эффекта
          }}
        />
      </div>

      {/* Погодные эффекты */}
      {weather === 'snow' && <SnowEffect />}
      {weather === 'rain' && <RainEffect />}
      {weather === 'wind' && <WindEffect />}

      {/* Индикатор времени и погоды - с реальными данными */}
      <div className="fixed top-4 right-4 z-50 bg-black/30 backdrop-blur-xl rounded-xl sm:rounded-2xl px-4 py-3 sm:px-6 sm:py-4 border border-white/30 shadow-2xl">
        {loading ? (
          <div className="flex items-center gap-3 text-white">
            <div className="animate-spin rounded-full h-6 w-6 border-2 border-white/30 border-t-white"></div>
            <span className="text-sm">Загрузка...</span>
          </div>
        ) : (
          <div className="flex items-center gap-3 sm:gap-4 text-white">
            {/* Иконка погоды */}
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-white/20 flex items-center justify-center">
              <svg className="w-6 h-6 sm:w-8 sm:h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                {weather === 'snow' && <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />}
                {weather === 'rain' && <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />}
                {weather === 'wind' && <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />}
                {weather === 'clear' && <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />}
              </svg>
            </div>
            
            {/* Информация о погоде */}
            <div className="text-left">
              {/* Температура */}
              {temperature !== null && (
                <div className="text-2xl sm:text-3xl font-black text-white drop-shadow-lg">
                  {temperature > 0 ? '+' : ''}{temperature}°
                </div>
              )}
              
              {/* Описание и время суток */}
              <div className="flex items-center gap-2 text-xs sm:text-sm">
                <span className="font-semibold text-white/90 capitalize">
                  {getTimeLabel(timeOfDay)}
                </span>
                <span className="text-white/60">•</span>
                <span className="text-white/80">
                  {getWeatherLabel(weather)}
                </span>
              </div>
              
              {/* Дополнительная информация */}
              {weatherData && (
                <div className="text-xs text-white/60 mt-1 hidden sm:block">
                  Ветер: {weatherData.windSpeed} м/с • Влажность: {weatherData.humidity}%
                </div>
              )}
            </div>
          </div>
        )}
        
        {/* Индикатор fallback данных */}
        {weatherData?.isFallback && (
          <div className="absolute -bottom-1 -right-1 bg-yellow-500/80 text-yellow-900 text-[10px] px-2 py-0.5 rounded-full font-bold">
            DEMO
          </div>
        )}
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
          <svg className="w-3 h-3 text-white" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2L9 9L2 12L9 15L12 22L15 15L22 12L15 9L12 2Z" />
          </svg>
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
          <svg className="w-6 h-6 text-green-300/60" viewBox="0 0 24 24" fill="currentColor">
            <path d="M17 8C8 10 5.9 16.17 3.82 21.34l1.89.66C7.82 17.34 9.93 12 16 10l-2.56-2.56" />
          </svg>
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
