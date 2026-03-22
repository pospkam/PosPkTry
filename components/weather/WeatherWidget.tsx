'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Sun, CloudRain, AlertTriangle, Wind, Droplets, CloudSnow } from 'lucide-react';
import { Weather } from '@/types';

interface WeatherWidgetProps {
  lat?: number;
  lng?: number;
  location?: string;
  className?: string;
  compact?: boolean;
}

export function WeatherWidget({ 
  lat = 53.0475, 
  lng = 158.6522, 
  location = 'Петропавловск-Камчатский',
  className = '',
  compact = false
}: WeatherWidgetProps) {
  const [weather, setWeather] = useState<Weather | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasAlert, setHasAlert] = useState(false);

  useEffect(() => {
    fetchWeather();
  }, [lat, lng]);

  const fetchWeather = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/weather?lat=${lat}&lng=${lng}`);
      const data = await response.json();
      if (data.success) {
        setWeather(data.data);
        setHasAlert(!!data.data.alerts?.length);
      }
    } catch (err) {
    } finally {
      setLoading(false);
    }
  };

  const getIcon = (condition: string) => {
    switch (condition.toLowerCase()) {
      case 'clear': return Sun;
      case 'cloudy': return CloudRain;
      case 'rain': return CloudRain;
      case 'snow': return CloudSnow;
      default: return Sun;
    }
  };

  if (loading) {
    return (
      <motion.div className={`bg-[var(--bg-card)] border border-[var(--border)] rounded-lg p-4 ${className}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <div className="skeleton h-12 w-12 rounded-full mb-2 mx-auto"></div>
        <div className="skeleton h-8 w-20 mx-auto mb-4"></div>
        <div className="grid grid-cols-3 gap-2">
          <div className="skeleton h-4 w-full"></div>
          <div className="skeleton h-4 w-full"></div>
          <div className="skeleton h-4 w-full"></div>
        </div>
      </motion.div>
    );
  }

  if (!weather) return null;

  const Icon = getIcon(weather.condition);
  const size = compact ? '280px' : 'full';

  return (
    <motion.div className={`${hasAlert ? 'bg-[var(--danger)]/10 border border-[var(--danger)]/30 animate-pulse' : 'bg-[var(--bg-card)] border border-[var(--border)]'} rounded-lg p-6 ${className}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <div className="flex items-center gap-4 mb-4">
        <Icon size={compact ? 32 : 48} className={hasAlert ? 'text-[var(--danger)]' : 'text-[var(--accent)]'} />
        <div>
          <p className="text-3xl md:text-4xl font-bold text-[var(--text-primary)]">{weather.temperature}°</p>
          <p className="text-sm text-[var(--text-secondary)] capitalize">{weather.condition}</p>
        </div>
      </div>
      {hasAlert && (
        <motion.div className="bg-red-500/20 border border-red-400/30 rounded-xl p-4 mb-4" animate={{ scale: [1, 1.02, 1] }} transition={{ repeat: Infinity, duration: 3 }}>
          <AlertTriangle size={20} className="text-red-600 inline mr-2" />
          <span className="text-sm font-medium text-[var(--danger)]">Штормовое предупреждение!</span>
        </motion.div>
      )}
      {!compact && (
        <>
          <div className="grid grid-cols-3 gap-4 mb-4 text-sm">
            <div className="flex items-center gap-2 text-[var(--text-secondary)]">
              <Droplets size={16} />
              {weather.humidity}%
            </div>
            <div className="flex items-center gap-2 text-[var(--text-secondary)]">
              <Wind size={16} />
              {weather.windSpeed} м/с
            </div>
            <div className="text-[var(--text-secondary)]">{weather.visibility} км</div>
          </div>
          <div className="grid grid-cols-3 gap-4 pt-4 border-t border-[var(--border)]">
            {weather.forecast.slice(0, 3).map((day, i) => (
              <motion.div key={i} className="text-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.1 }}>
                <p className="text-xs text-[var(--text-secondary)]">{new Date(day.date).toLocaleDateString('ru-RU', { weekday: 'short' })}</p>
                <Sun size={20} className="mx-auto mb-1 text-[var(--accent)]" />
                <p className="font-semibold">{day.temperature.min}°–{day.temperature.max}°</p>
              </motion.div>
            ))}
          </div>
        </>
      )}
    </motion.div>
  );
}

