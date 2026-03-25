'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Sparkles, Mountain, Fish, Flame, PawPrint, Compass, Ship } from 'lucide-react';

const SUGGESTIONS = [
  { icon: Mountain, text: 'Восхождение на вулкан', query: 'Хочу подняться на вулкан, 2 дня' },
  { icon: Fish, text: 'Рыбалка на чавычу', query: 'Рыбалка на чавычу, июль' },
  { icon: Flame, text: 'Горячие источники', query: 'Горячие источники на выходные' },
  { icon: PawPrint, text: 'Медведи Курильского', query: 'Увидеть медведей, 1 день' },
  { icon: Compass, text: 'Треккинг по тайге', query: 'Треккинг 3 дня, средний уровень' },
  { icon: Ship, text: 'Морская прогулка', query: 'Морская прогулка по океану' },
];

export function AISection() {
  const router = useRouter();
  const [query, setQuery] = useState('');

  function go(text: string) {
    router.push(`/ai-assistant?q=${encodeURIComponent(text)}`);
  }

  return (
    <section className="py-20 md:py-28 px-5">
      <div className="max-w-4xl mx-auto text-center">

        {/* Badge */}
        <div className="inline-flex items-center gap-2 bg-[var(--accent)]/10 rounded-full px-4 py-1.5 mb-6">
          <span className="w-2 h-2 rounded-full bg-[var(--success)] animate-pulse" />
          <span className="text-xs font-medium text-[var(--accent)]">Кузьмич онлайн</span>
        </div>

        {/* Heading */}
        <h2 className="font-playfair text-3xl sm:text-4xl md:text-5xl font-bold text-[var(--text-primary)] mb-4 leading-tight">
          Расскажите, о чём мечтаете
        </h2>

        <p className="text-[var(--text-secondary)] text-base md:text-lg mb-10 max-w-lg mx-auto leading-relaxed">
          AI-помощник Кузьмич знает Камчатку как свои пять пальцев.
          Опишите идеальный отдых — он подберёт маршрут.
        </p>

        {/* Large input */}
        <div className="max-w-2xl mx-auto mb-12">
          <div className="flex items-center gap-3 bg-[var(--bg-card)] border border-[var(--border)] rounded-lg px-5 py-4 shadow-sm">
            <Sparkles className="w-5 h-5 text-[var(--accent)] flex-shrink-0" />
            <input
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && query.trim()) go(query.trim());
              }}
              placeholder="Например: хочу 5 дней, рыбалка + вулканы, бюджет 80 тыс..."
              className="flex-1 bg-transparent text-[var(--text-primary)] placeholder:text-[var(--text-muted)] text-sm md:text-base outline-none"
            />
            <button
              type="button"
              onClick={() => query.trim() && go(query.trim())}
              disabled={!query.trim()}
              className="flex-shrink-0 px-6 py-2.5 rounded-lg bg-[var(--accent)] text-white text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-40"
            >
              Спросить
            </button>
          </div>
        </div>

        {/* Suggestion cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 max-w-2xl mx-auto">
          {SUGGESTIONS.map(({ icon: Icon, text, query: q }) => (
            <button
              key={text}
              type="button"
              onClick={() => go(q)}
              className="group flex items-center gap-3 bg-[var(--bg-card)] border border-[var(--border)] rounded-lg px-4 py-3.5 text-left hover:border-[var(--accent)] hover:bg-[var(--bg-hover)] transition-all"
            >
              <Icon className="w-4 h-4 text-[var(--text-muted)] group-hover:text-[var(--accent)] transition-colors flex-shrink-0" />
              <span className="text-sm text-[var(--text-secondary)] group-hover:text-[var(--text-primary)] transition-colors">
                {text}
              </span>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
