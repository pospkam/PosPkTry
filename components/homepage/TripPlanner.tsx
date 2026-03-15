'use client';

import { useState } from 'react';
import { Search, Calendar, DollarSign, Filter, AlertCircle } from 'lucide-react';

interface TourResult {
  id: string;
  title: string;
  operator_name: string;
  start_date: string;
  end_date: string;
  days: number;
  price: number | null;
  free_slots: number;
}

interface PlannerState {
  loaded: boolean;
  error: string | null;
  results: TourResult[] | null;
}

const INTERESTS = [
  { id: 'vulkan', label: 'Вулканы' },
  { id: 'geyser', label: 'Гейзеры' },
  { id: 'bear', label: 'Медведи' },
  { id: 'fish', label: 'Рыбалка' },
  { id: 'thermal', label: 'Термальные' },
  { id: 'sea', label: 'Морские' },
  { id: 'heli', label: 'Вертолёты' },
  { id: 'trek', label: 'Треккинг' },
];

const BUDGET_OPTIONS = [
  { value: '100k', label: 'до 100 000 ₽' },
  { value: '100-250k', label: '100–250 000 ₽' },
  { value: '250-400k', label: '250–400 000 ₽' },
  { value: '400k+', label: 'от 400 000 ₽' },
];

export function TripPlanner() {
  const [arrival, setArrival] = useState('');
  const [departure, setDeparture] = useState('');
  const [budget, setBudget] = useState('250-400k');
  const [interests, setInterests] = useState<string[]>(['vulkan', 'bear']);
  const [state, setState] = useState<PlannerState>({ loaded: false, error: null, results: null });

  const toggleInterest = (id: string) => {
    setInterests(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  async function handleSearch() {
    if (!arrival || !departure) {
      setState({ loaded: true, error: 'Укажите даты', results: null });
      return;
    }

    if (new Date(arrival) >= new Date(departure)) {
      setState({ loaded: true, error: 'Дата выезда должна быть позже прилёта', results: null });
      return;
    }

    setState({ loaded: true, error: null, results: null });

    try {
      const res = await fetch('/api/planner', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          arrival,
          departure,
          budget,
          interests,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setState({ loaded: true, error: null, results: data.tours || [] });
      } else {
        setState({ loaded: true, error: data.error || 'Ошибка поиска', results: null });
      }
    } catch {
      setState({ loaded: true, error: 'Ошибка соединения', results: null });
    }
  }

  return (
    <section id="planner" className="py-12 md:py-20 px-6 md:px-10 max-w-4xl mx-auto">
      <div className="space-y-8">
        {/* Заголовок */}
        <div>
          <h2 className="font-playfair text-3xl md:text-4xl font-bold text-[var(--text-primary)] mb-2">
            Спланировать поездку
          </h2>
          <p className="text-[var(--text-secondary)]">
            Укажите даты, бюджет и интересы — мы подберём лучшие туры
          </p>
        </div>

        {/* Форма */}
        <div className="space-y-6 bg-[var(--bg-card)] p-6 md:p-8 rounded-lg border border-[var(--border)]">
          {/* Даты */}
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="ds-label mb-2 flex items-center gap-1.5">
                <Calendar className="w-4 h-4" />
                Прилёт в Камчатку
              </label>
              <input
                type="date"
                value={arrival}
                onChange={e => setArrival(e.target.value)}
                className="ds-input w-full"
              />
            </div>
            <div>
              <label className="ds-label mb-2 flex items-center gap-1.5">
                <Calendar className="w-4 h-4" />
                Отъезд из Камчатки
              </label>
              <input
                type="date"
                value={departure}
                onChange={e => setDeparture(e.target.value)}
                className="ds-input w-full"
              />
            </div>
          </div>

          {/* Бюджет */}
          <div>
            <label className="ds-label mb-2 flex items-center gap-1.5">
              <DollarSign className="w-4 h-4" />
              Бюджет на активности
            </label>
            <select
              value={budget}
              onChange={e => setBudget(e.target.value)}
              className="ds-input w-full"
            >
              {BUDGET_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Интересы */}
          <div>
            <label className="ds-label mb-3 flex items-center gap-1.5">
              <Filter className="w-4 h-4" />
              Что хотите увидеть?
            </label>
            <div className="flex flex-wrap gap-2">
              {INTERESTS.map(interest => (
                <button
                  key={interest.id}
                  type="button"
                  onClick={() => toggleInterest(interest.id)}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                    interests.includes(interest.id)
                      ? 'bg-[var(--accent)] text-white'
                      : 'bg-[var(--bg-hover)] text-[var(--text-secondary)] hover:bg-[var(--border)]'
                  }`}
                >
                  {interest.label}
                </button>
              ))}
            </div>
          </div>

          {/* Ошибка */}
          {state.error && (
            <div className="flex items-center gap-2 text-sm text-[var(--danger)] bg-[var(--danger)]/10 px-4 py-3 rounded">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {state.error}
            </div>
          )}

          {/* Кнопка */}
          <button
            type="button"
            onClick={handleSearch}
            disabled={state.loaded === false && state.error === null}
            className="ds-btn ds-btn-primary w-full flex items-center justify-center gap-2"
          >
            <Search className="w-4 h-4" />
            {state.loaded === false && state.error === null ? 'Поиск…' : 'Найти туры'}
          </button>
        </div>

        {/* Результаты */}
        {state.loaded && state.results !== null && (
          <div>
            {state.results.length === 0 ? (
              <p className="text-center text-[var(--text-muted)] py-8">
                По вашему запросу туры не найдены. Попробуйте расширить даты или бюджет.
              </p>
            ) : (
              <div className="space-y-4">
                <p className="text-sm text-[var(--text-secondary)]">
                  Найдено {state.results.length} тур{state.results.length === 1 ? '' : 'ов'}
                </p>
                {state.results.map(tour => (
                  <div
                    key={tour.id}
                    className="bg-[var(--bg-card)] p-4 md:p-6 rounded-lg border border-[var(--border)] hover:border-[var(--accent)] transition-colors"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <h3 className="font-semibold text-[var(--text-primary)] mb-1">
                          {tour.title}
                        </h3>
                        <p className="text-sm text-[var(--text-secondary)] mb-3">
                          {tour.operator_name}
                        </p>
                        <div className="flex flex-wrap gap-4 text-sm text-[var(--text-muted)]">
                          <span>📅 {tour.days} дн.</span>
                          <span>👥 {tour.free_slots} мест</span>
                          {tour.price && <span>💰 {tour.price.toLocaleString('ru-RU')} ₽</span>}
                        </div>
                      </div>
                      <button type="button" className="ds-btn ds-btn-primary text-sm px-4 py-2">
                        Забронировать
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
