/**
 * WeatherEffects — погодные анимации для Samsung Weather Theme.
 * Вынесены из SamsungWeatherDynamic.tsx для оптимизации React reconciliation.
 */

'use client';

import React from 'react';

interface SunProps {
  timeOfDay: 'morning' | 'day' | 'evening' | 'night';
}

/** Солнце — отображается утром и днём */
export function Sun({ timeOfDay }: SunProps) {
  if (timeOfDay === 'evening' || timeOfDay === 'night') return null;
  return <div className="sun" />;
}

/** Луна — отображается ночью */
export function Moon({ timeOfDay }: SunProps) {
  if (timeOfDay !== 'night') return null;
  return <div className="moon" />;
}

/** Звёзды — отображаются ночью */
export function Stars({ timeOfDay }: SunProps) {
  if (timeOfDay !== 'night') return null;

  const stars = Array.from({ length: 100 }, (_, starIndex) => (
    <div
      key={`star-${starIndex}`}
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
}

interface WeatherAnimations {
  rain?: boolean;
  snow?: boolean;
  wind?: boolean;
  thunder?: boolean;
}

/** Дождь */
export function Rain({ animations }: { animations: WeatherAnimations }) {
  if (!animations.rain) return null;

  const raindrops = Array.from({ length: 50 }, (_, i) => {
    const id = `rain-${i}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    return (
      <div
        key={id}
        className="raindrop"
        style={{
          left: `${Math.random() * 100}%`,
          animationDuration: `${0.5 + Math.random() * 0.5}s`,
          animationDelay: `${Math.random() * 2}s`,
        }}
      />
    );
  });

  return <div className="rain-container">{raindrops}</div>;
}

/** Снег */
export function Snow({ animations }: { animations: WeatherAnimations }) {
  if (!animations.snow) return null;

  const snowflakes = Array.from({ length: 50 }, (_, i) => {
    const id = `snow-${i}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    return (
      <div
        key={id}
        className="snowflake"
        style={{
          left: `${Math.random() * 100}%`,
          animationDuration: `${3 + Math.random() * 4}s`,
          animationDelay: `${Math.random() * 5}s`,
          opacity: Math.random(),
        }}
      />
    );
  });

  return <div className="snow-container">{snowflakes}</div>;
}

/** Ветер */
export function Wind({ animations, windSpeed }: { animations: WeatherAnimations; windSpeed?: number }) {
  if (!animations.wind) return null;

  const lines = Array.from({ length: 5 }, (_, i) => (
    <div
      key={`wind-${i}`}
      className="wind-line"
      style={{
        top: `${20 + i * 15}%`,
        animationDuration: `${2 + Math.random()}s`,
        animationDelay: `${Math.random() * 2}s`,
      }}
    />
  ));

  return (
    <div className={`wind-container ${windSpeed && windSpeed > 10 ? 'wind-strong' : 'wind-light'}`}>
      {lines}
    </div>
  );
}

/** Гроза */
export function Thunder({ animations }: { animations: WeatherAnimations }) {
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
}
