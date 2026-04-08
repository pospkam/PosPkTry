'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { X, Fish, Calendar, Trophy, Target, MapPin, Sparkles, ArrowRight } from 'lucide-react';
import { type FishSpecies } from '@/lib/fish-species';

const MONTH_SHORT = ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн', 'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек'];

interface Props {
  species: FishSpecies;
  onClose: () => void;
}

export default function FishSpeciesModal({ species, onClose }: Props) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handler);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[999] flex items-end sm:items-center justify-center"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" />

      {/* Card */}
      <div
        className="relative w-full sm:max-w-md mx-0 sm:mx-4 bg-[var(--bg-card)] sm:rounded-xl rounded-t-2xl border border-[var(--border)] shadow-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}
        style={{ maxHeight: '90vh', overflowY: 'auto' }}
      >
        {/* Header strip */}
        <div
          className="px-5 pt-5 pb-4 flex items-start gap-3"
          style={{ background: `${species.color}18`, borderBottom: `2px solid ${species.color}30` }}
        >
          <div
            className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ background: `${species.color}25` }}
          >
            <Fish className="w-5 h-5" style={{ color: species.color }} />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-bold text-[var(--text-primary)]"
                style={{ fontFamily: 'var(--font-playfair)' }}>
              {species.name}
            </h2>
            <p className="text-xs text-[var(--text-muted)] italic mt-0.5">{species.nameLatin}</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-[var(--bg-hover)] text-[var(--text-muted)] transition-colors flex-shrink-0"
            aria-label="Закрыть"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-5 py-4 space-y-4">
          {/* Описание */}
          <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
            {species.shortDesc}
          </p>

          {/* Сезон — месяцы */}
          <div>
            <div className="flex items-center gap-1.5 mb-2">
              <Calendar className="w-3.5 h-3.5 text-[var(--text-muted)]" />
              <span className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide">
                Сезон
              </span>
              <span className="text-xs text-[var(--text-muted)] ml-1">— {species.season}</span>
            </div>
            <div className="flex gap-1 flex-wrap">
              {MONTH_SHORT.map((m, i) => {
                const active = species.seasonMonths.includes(i + 1);
                return (
                  <span
                    key={m}
                    className="text-xs px-1.5 py-0.5 rounded font-medium"
                    style={{
                      background: active ? `${species.color}20` : 'var(--bg-hover)',
                      color: active ? species.color : 'var(--text-muted)',
                      fontWeight: active ? 600 : 400,
                    }}
                  >
                    {m}
                  </span>
                );
              })}
            </div>
          </div>

          {/* Рекорд + Место */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-[var(--bg-hover)] rounded-lg p-3">
              <div className="flex items-center gap-1.5 mb-1">
                <Trophy className="w-3.5 h-3.5" style={{ color: species.color }} />
                <span className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide">Рекорд</span>
              </div>
              <p className="text-sm text-[var(--text-primary)] font-medium">{species.recordKg}</p>
            </div>
            <div className="bg-[var(--bg-hover)] rounded-lg p-3">
              <div className="flex items-center gap-1.5 mb-1">
                <MapPin className="w-3.5 h-3.5" style={{ color: species.color }} />
                <span className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide">Место</span>
              </div>
              <p className="text-sm text-[var(--text-primary)] font-medium leading-tight">{species.habitat}</p>
            </div>
          </div>

          {/* Методы ловли */}
          <div>
            <div className="flex items-center gap-1.5 mb-2">
              <Target className="w-3.5 h-3.5 text-[var(--text-muted)]" />
              <span className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide">
                Способы ловли
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {species.methods.map(m => (
                <span
                  key={m}
                  className="text-xs px-2.5 py-1 rounded-full border font-medium"
                  style={{
                    borderColor: `${species.color}40`,
                    color: species.color,
                    background: `${species.color}10`,
                  }}
                >
                  {m}
                </span>
              ))}
            </div>
          </div>

          {/* Интересный факт */}
          <div
            className="rounded-lg p-3"
            style={{ background: `${species.color}08`, border: `1px solid ${species.color}20` }}
          >
            <div className="flex items-start gap-2">
              <Sparkles className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" style={{ color: species.color }} />
              <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                {species.funFact}
              </p>
            </div>
          </div>

          {/* Ссылка на полную страницу */}
          <Link
            href={`/fish/${species.id}`}
            onClick={onClose}
            className="flex items-center justify-between gap-2 px-3 py-2.5 rounded-lg border border-[var(--border)] hover:border-[var(--accent)]/40 hover:bg-[var(--bg-hover)] transition-all duration-150 group"
          >
            <span className="text-sm font-semibold text-[var(--text-primary)] group-hover:text-[var(--accent)] transition-colors">
              Полная страница — {species.name}
            </span>
            <ArrowRight className="w-4 h-4 text-[var(--text-muted)] group-hover:text-[var(--accent)] transition-colors flex-shrink-0" />
          </Link>
        </div>
      </div>
    </div>
  );
}
