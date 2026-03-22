'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { MapPin, ShieldCheck, Compass, AlertTriangle } from 'lucide-react';
import { Reveal } from '@/components/homepage/Reveal';
import { useInView } from '@/hooks/useInView';

interface StatItem {
  icon: typeof MapPin;
  value: number | string;
  suffix: string;
  label: string;
}

function AnimatedNumber({ target, suffix }: { target: number | string; suffix: string }) {
  const [count, setCount] = useState(0);
  const [ref, inView] = useInView();

  const numTarget = typeof target === 'number' ? target : 0;
  const isStatic = typeof target === 'string';

  useEffect(() => {
    if (!inView || isStatic) return;

    const duration = 1200;
    const steps = 30;
    const stepTime = duration / steps;
    const increment = numTarget / steps;
    let current = 0;
    let step = 0;

    const timer = setInterval(() => {
      step++;
      current = Math.min(Math.round(increment * step), numTarget);
      setCount(current);
      if (step >= steps) clearInterval(timer);
    }, stepTime);

    return () => clearInterval(timer);
  }, [inView, numTarget, isStatic]);

  return (
    <span ref={ref as React.Ref<HTMLSpanElement>}>
      {isStatic ? target : count}{suffix}
    </span>
  );
}

export function PlatformStats() {
  const [stats, setStats] = useState<{ totalRoutes: number; verifiedPartners: number } | null>(null);

  useEffect(() => {
    fetch('/api/public/stats')
      .then(r => r.json())
      .then(data => {
        if (data.success) setStats(data.data);
      })
      .catch(() => {});
  }, []);

  const items: StatItem[] = [
    { icon: MapPin,        value: stats?.totalRoutes      ?? 1000, suffix: '+', label: 'Маршрутов на Камчатке'        },
    { icon: ShieldCheck,   value: stats?.verifiedPartners ?? 18,   suffix: '+', label: 'Операторов на платформе'      },
    { icon: Compass,       value: 14,                               suffix: '',  label: 'Категорий маршрутов'          },
    { icon: AlertTriangle, value: '24/7',                           suffix: '',  label: 'SOS-система безопасности'     },
  ];

  return (
    <section className="py-16 bg-[var(--kh-surface)]">
      <div className="max-w-6xl mx-auto px-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-6">
          {items.map((item, i) => {
            const Icon = item.icon;
            return (
              <Reveal key={item.label} delay={Math.min(i + 1, 4) as 1 | 2 | 3 | 4}>
                <div className="text-center">
                  <div className="w-12 h-12 mx-auto mb-3 rounded-lg bg-[var(--kh-accent)]/10 flex items-center justify-center">
                    <Icon className="w-6 h-6 text-[var(--kh-accent)]" />
                  </div>
                  <p className="font-playfair text-3xl md:text-4xl font-bold text-[var(--kh-text)]">
                    <AnimatedNumber target={item.value} suffix={item.suffix} />
                  </p>
                  <p className="text-xs text-[var(--kh-text-dim)] mt-1">{item.label}</p>
                </div>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}
