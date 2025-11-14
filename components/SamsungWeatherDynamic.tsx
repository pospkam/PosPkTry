'use client';

import { useEffect, useState } from 'react';
import { fetchYandexWeather, getTimeOfDay, needsWeatherAnimation, type WeatherData } from '@/lib/weather/yandex-weather';

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

  // Рендер дождя
  const renderRain = () => {
    if (!animations.rain) return null;

    const drops = Array.from({ length: 100 }, (_, i) => (
      <div
        key={i}
        className="rain-drop"
        style={{
          left: `${Math.random() * 100}%`,
          animationDuration: `${0.3 + Math.random() * 0.3}s`,
          animationDelay: `${Math.random() * 2}s`,
        }}
      />
    ));

    return <div className="rain-container">{drops}</div>;
  };

  // Рендер снега
  const renderSnow = () => {
    if (!animations.snow) return null;

    const flakes = Array.from({ length: 50 }, (_, i) => (
      <div
        key={i}
        className="snowflake"
        style={{
          left: `${Math.random() * 100}%`,
          animationDuration: `${3 + Math.random() * 3}s, ${2 + Math.random() * 2}s`,
          animationDelay: `${Math.random() * 5}s`,
          width: `${8 + Math.random() * 8}px`,
          height: `${8 + Math.random() * 8}px`,
        }}
      />
    ));

    return <div className="snow-container">{flakes}</div>;
  };

  // Рендер ветра
  const renderWind = () => {
    if (!animations.wind) return null;

    const lines = Array.from({ length: 15 }, (_, i) => (
      <div
        key={i}
        className="wind-line"
        style={{
          top: `${Math.random() * 100}%`,
          animationDuration: `${1 + Math.random() * 2}s`,
          animationDelay: `${Math.random() * 3}s`,
          width: `${100 + Math.random() * 100}px`,
        }}
      />
    ));

    return <div className={`wind-container ${weather?.windSpeed && weather.windSpeed > 10 ? 'wind-strong' : 'wind-light'}`}>{lines}</div>;
  };

  // Рендер грозы
  const renderThunder = () => {
    if (!animations.thunder) return null;

    return (
      <div
        className="thunder-flash"
        style={{
          animation: 'thunder-strike 0.3s ease-out infinite',
          animationDelay: `${Math.random() * 5}s`,
        }}
      />
    );
  };

  // Рендер солнца (утро/день)
  const renderSun = () => {
    if (timeOfDay === 'evening' || timeOfDay === 'night') return null;
    return <div className="sun" />;
  };

  // Рендер луны (ночь)
  const renderMoon = () => {
    if (timeOfDay !== 'night') return null;
    return <div className="moon" />;
  };

  // Рендер звезд (ночь)
  const renderStars = () => {
    if (timeOfDay !== 'night') return null;

    const stars = Array.from({ length: 100 }, (_, i) => (
      <div
        key={i}
        className="star"
        style={{
          left: `${Math.random() * 100}%`,
          top: `${Math.random() * 60}%`,
          animationDuration: `${2 + Math.random() * 3}s`,
          animationDelay: `${Math.random() * 5}s`,
        }}
      />
    ));

    return <div className="stars-container">{stars}</div>;
  };

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
      {renderSun()}
      {renderMoon()}

      {/* Звезды (только ночью) */}
      {renderStars()}

      {/* Погодные анимации */}
      {renderRain()}
      {renderSnow()}
      {renderWind()}
      {renderThunder()}

      {/* Информация о погоде (для отладки - можно удалить) */}
      {weather && (
        <div
          className="fixed bottom-4 right-4 bg-white/10 backdrop-blur-lg px-4 py-2 rounded-xl text-white text-sm z-50"
        >
          <div>{weather.condition}</div>
          <div>{weather.temperature}°C</div>
          <div>Ветер: {weather.windSpeed} м/с</div>
        </div>
      )}
    </>
  );
}
