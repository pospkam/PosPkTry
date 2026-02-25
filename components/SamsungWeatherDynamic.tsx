'use client';

import { useEffect, useState } from 'react';
import { fetchYandexWeather, getTimeOfDay, needsWeatherAnimation, type WeatherData } from '@/lib/weather/yandex-weather';
import { Sun, Moon, Stars, Rain, Snow, Wind, Thunder } from '@/components/weather/WeatherEffects';
import { Wind as WindIcon, Droplets } from 'lucide-react';

export default function SamsungWeatherDynamic() {
  const [timeOfDay, setTimeOfDay] = useState<string>('day');
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [animations, setAnimations] = useState({
    rain: false,
    snow: false,
    wind: false,
    thunder: false,
  });

  // Обновление времени суток
  useEffect(() => {
    const updateTime = () => {
      setTimeOfDay(getTimeOfDay());
    };

    updateTime();
    const interval = setInterval(updateTime, 60000); // Каждую минуту

    return () => clearInterval(interval);
  }, []);

  // Получение погоды
  useEffect(() => {
    const loadWeather = async () => {
      const weatherData = await fetchYandexWeather();
      if (weatherData) {
        setWeather(weatherData);
        setAnimations(needsWeatherAnimation(weatherData.weatherCode));
      }
    };

    loadWeather();
    const interval = setInterval(loadWeather, 600000); // Каждые 10 минут

    return () => clearInterval(interval);
  }, []);

  return (
    <>
      {/* Основной фон с градиентом */}
      <div className="weather-background" data-time={timeOfDay}>
        {/* Облака (статические) */}
        <div className="cloud cloud-1"></div>
        <div className="cloud cloud-2"></div>
        <div className="cloud cloud-3"></div>

        {/* Градиент сверху */}
        <div className="gradient-overlay-top"></div>
      </div>

      {/* Солнце или луна */}
      <Sun timeOfDay={timeOfDay as 'morning' | 'day' | 'evening' | 'night'} />
      <Moon timeOfDay={timeOfDay as 'morning' | 'day' | 'evening' | 'night'} />

      {/* Звёзды (только ночью) */}
      <Stars timeOfDay={timeOfDay as 'morning' | 'day' | 'evening' | 'night'} />

      {/* Погодные анимации */}
      <Rain animations={animations} />
      <Snow animations={animations} />
      <Wind animations={animations} windSpeed={weather?.windSpeed} />
      <Thunder animations={animations} />

      {/* ВИДЖЕТ ПОГОДЫ - ВИДИМЫЙ */}
      {weather && (
        <div
          className="fixed top-24 right-6 bg-white/20 backdrop-blur-xl px-6 py-4 rounded-2xl text-white z-50 border border-white/30 shadow-2xl"
        >
          <div className="text-center space-y-2">
            <div className="text-5xl font-bold">{weather.temperature}°C</div>
            <div className="text-lg">{weather.condition}</div>
            <div className="text-sm opacity-80">Ощущается: {weather.feelsLike}°C</div>
            <div className="flex items-center justify-center gap-4 text-sm pt-2 border-t border-white/20">
              <div className="flex items-center gap-1"><WindIcon className="w-4 h-4" /> {weather.windSpeed} м/с</div>
              <div className="flex items-center gap-1"><Droplets className="w-4 h-4" /> {weather.humidity}%</div>
            </div>
            <div className="text-xs opacity-60 pt-1">Петропавловск-Камчатский</div>
          </div>
        </div>
      )}
    </>
  );
}
