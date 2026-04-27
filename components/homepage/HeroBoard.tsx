'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowRight, Bot, Map as MapIcon, Shield } from 'lucide-react';

const STEPS = [
  { icon: Bot, label: 'AI подберёт', desc: 'маршрут за 2 минуты' },
  { icon: MapIcon, label: 'Покажет на карте', desc: 'все точки поездки' },
  { icon: Shield, label: 'Сведёт с', desc: 'проверенным оператором' },
];

export function HeroBoard() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 100);
    return () => clearTimeout(t);
  }, []);

  return (
    <section className="relative overflow-hidden rounded-2xl">
      {/* Фоновое фото с градиентом */}
      <div className="absolute inset-0 z-0">
        <img
          src="/images/hero/IMG_20260316_133026.jpg"
          alt="Камчатка"
          className="w-full h-full object-cover"
          loading="eager"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[var(--bg-primary)] via-[var(--bg-primary)]/70 to-[var(--bg-primary)]/30" />
      </div>

      {/* Контент */}
      <div className="relative z-10 p-5 md:p-6">
        <h1
          className={`mb-3 font-playfair text-3xl font-bold leading-[1.1] text-white md:text-4xl transition-all duration-700 ${
            visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
          }`}
        >
          Камчатка, которую вы{' '}
          <span className="text-orange-400">почувствуете</span> по-настоящему
        </h1>

        <p
          className={`mb-4 max-w-md text-sm leading-relaxed text-white/80 transition-all duration-700 delay-150 ${
            visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
          }`}
        >
          Не маркетплейс туров — ваш персональный инструмент планирования.
          AI, интерактивная карта и только проверенные операторы.
        </p>

        <div className={`flex flex-wrap gap-3 mb-5 transition-all duration-700 delay-300 ${
          visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
        }`}>
          <Link
            href="/planner"
            className="inline-flex items-center gap-2 rounded-lg bg-orange-500 px-5 py-2.5 text-sm font-semibold text-white transition-all hover:bg-orange-600 hover:shadow-lg hover:shadow-orange-500/25 active:scale-95"
          >
            <Bot className="h-4 w-4" />
            Подобрать маршрут
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            href="/marketplace"
            className="inline-flex items-center gap-2 rounded-lg border border-white/30 bg-white/10 backdrop-blur-sm px-5 py-2.5 text-sm font-semibold text-white transition-all hover:bg-white/20 hover:border-white/50 active:scale-95"
          >
            Смотреть туры
          </Link>
        </div>

        {/* 3 шага */}
        <div className={`grid grid-cols-3 gap-2 transition-all duration-700 delay-500 ${
          visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
        }`}>
          {STEPS.map(({ icon: Icon, label, desc }, i) => (
            <div key={i} className="flex items-start gap-2 p-2.5 rounded-lg bg-white/10 backdrop-blur-sm border border-white/20">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 bg-orange-500/20">
                <Icon className="w-4 h-4 text-orange-400" />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-semibold text-white leading-tight">{label}</p>
                <p className="text-[10px] text-white/60 leading-tight">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
