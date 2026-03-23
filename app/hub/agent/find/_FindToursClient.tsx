'use client';

import { useState, useEffect } from 'react';
import {
  Search, Calendar, Users, MapPin, Clock, Phone,
  RefreshCw, ChevronRight, Banknote,
} from 'lucide-react';
import { useSearchParams } from 'next/navigation';

interface TourSlot {
  tour_id:          number;
  title:            string;
  description:      string | null;
  activity_type:    string | null;
  duration_hours:   number | null;
  max_participants: number;
  difficulty:       string | null;
  operator_id:      number;
  operator_name:    string;
  operator_phone:   string | null;
  available_date:   string;
  available_spots:  number;
  price:            string;
  agent_commission: string;
}

const ACTIVITY_OPTIONS = [
  { value: '',            label: 'Все активности'  },
  { value: 'trekking',    label: 'Треккинг'        },
  { value: 'rafting',     label: 'Сплав'           },
  { value: 'boat_trip',   label: 'Морской тур'     },
  { value: 'fishing',     label: 'Рыбалка'         },
  { value: 'helicopter',  label: 'Вертолёт'        },
  { value: 'thermal',     label: 'Термальный'      },
  { value: 'snowmobile',  label: 'Снегоход'        },
  { value: 'bears',       label: 'Медведи'         },
];

function fmtPrice(p: string) {
  return new Intl.NumberFormat('ru-RU').format(parseFloat(p)) + ' ₽';
}
function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', weekday: 'short' });
}

export default function FindToursClient() {
  const sp = useSearchParams();

  const [dateFrom,      setDateFrom]      = useState(sp.get('date_from') ?? '');
  const [dateTo,        setDateTo]        = useState(sp.get('date_to')   ?? '');
  const [activityType,  setActivityType]  = useState(sp.get('activity_type') ?? '');
  const [groupSize,     setGroupSize]     = useState(1);
  const [results,       setResults]       = useState<TourSlot[]>([]);
  const [loading,       setLoading]       = useState(false);
  const [searched,      setSearched]      = useState(false);

  // Автозапуск если пришли с параметрами (из лидов)
  useEffect(() => {
    if (sp.get('date_from') || sp.get('date_to')) {
      void search();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function search() {
    setLoading(true);
    setSearched(true);
    try {
      const params = new URLSearchParams();
      if (dateFrom)     params.set('date_from',     dateFrom);
      if (dateTo)       params.set('date_to',       dateTo);
      if (activityType) params.set('activity_type', activityType);
      params.set('group_size', String(groupSize));

      const res  = await fetch(`/api/agent/find-tours?${params}`);
      const json = await res.json() as { success: boolean; data: TourSlot[] };
      if (json.success) setResults(json.data);
    } finally {
      setLoading(false);
    }
  }

  // Группируем по дате
  const byDate = results.reduce<Record<string, TourSlot[]>>((acc, t) => {
    acc[t.available_date] = [...(acc[t.available_date] ?? []), t];
    return acc;
  }, {});

  return (
    <div className="p-5 lg:p-6 space-y-6">
      {/* Заголовок */}
      <div>
        <h1 className="ds-h1 flex items-center gap-2">
          <Search size={24} className="text-[var(--accent)]" />
          Найти тур
        </h1>
        <p className="text-sm text-[var(--text-secondary)] mt-1">
          Свободные места у всех операторов на выбранные даты
        </p>
      </div>

      {/* Форма поиска */}
      <div className="ds-card p-4 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="space-y-1">
            <label className="ds-label">Дата с</label>
            <input
              type="date"
              value={dateFrom}
              onChange={e => setDateFrom(e.target.value)}
              className="ds-input w-full"
            />
          </div>
          <div className="space-y-1">
            <label className="ds-label">Дата по</label>
            <input
              type="date"
              value={dateTo}
              min={dateFrom}
              onChange={e => setDateTo(e.target.value)}
              className="ds-input w-full"
            />
          </div>
          <div className="space-y-1">
            <label className="ds-label">Активность</label>
            <select
              value={activityType}
              onChange={e => setActivityType(e.target.value)}
              className="ds-input w-full"
            >
              {ACTIVITY_OPTIONS.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <label className="ds-label">Кол-во человек</label>
            <input
              type="number"
              min={1}
              max={100}
              value={groupSize}
              onChange={e => setGroupSize(Number(e.target.value))}
              className="ds-input w-full"
            />
          </div>
        </div>

        <button
          onClick={() => void search()}
          disabled={loading || (!dateFrom && !dateTo)}
          className="ds-btn ds-btn-primary w-full sm:w-auto flex items-center justify-center gap-2"
        >
          {loading
            ? <RefreshCw size={16} className="animate-spin" />
            : <Search size={16} />
          }
          {loading ? 'Поиск...' : 'Найти свободные туры'}
        </button>
      </div>

      {/* Результаты */}
      {searched && !loading && results.length === 0 && (
        <div className="ds-card text-center py-12 text-[var(--text-secondary)]">
          <Search size={32} className="mx-auto mb-3 opacity-40" />
          <p className="font-medium">Свободных туров не найдено</p>
          <p className="text-sm mt-1 text-[var(--text-muted)]">
            Попробуйте другие даты или убрать фильтр активности
          </p>
        </div>
      )}

      {Object.entries(byDate).map(([date, slots]) => (
        <div key={date} className="space-y-3">
          {/* Дата-заголовок */}
          <div className="flex items-center gap-3">
            <Calendar size={16} className="text-[var(--accent)]" />
            <h2 className="font-semibold text-[var(--text-primary)]">{fmtDate(date)}</h2>
            <span className="text-sm text-[var(--text-muted)]">{slots.length} тур.</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {slots.map((t, i) => (
              <div key={`${t.tour_id}-${i}`} className="ds-card p-4 flex flex-col gap-3
                hover:border-[var(--accent)] transition-colors">

                {/* Название + оператор */}
                <div>
                  <p className="font-semibold text-[var(--text-primary)] leading-snug">
                    {t.title}
                  </p>
                  <p className="text-sm text-[var(--ocean)] mt-0.5">{t.operator_name}</p>
                </div>

                {/* Параметры */}
                <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-sm text-[var(--text-secondary)]">
                  {t.duration_hours && (
                    <span className="flex items-center gap-1">
                      <Clock size={13} />
                      {t.duration_hours} ч
                    </span>
                  )}
                  <span className="flex items-center gap-1">
                    <Users size={13} />
                    Мест: <strong className="text-[var(--success)]">{t.available_spots}</strong>
                    /{t.max_participants}
                  </span>
                  {t.activity_type && (
                    <span className="flex items-center gap-1">
                      <MapPin size={13} />
                      {ACTIVITY_OPTIONS.find(a => a.value === t.activity_type)?.label ?? t.activity_type}
                    </span>
                  )}
                </div>

                {/* Теги */}
                {t.difficulty && (
                  <div className="flex flex-wrap gap-1">
                    <span className="text-xs px-2 py-0.5 rounded-full bg-[var(--bg-hover)] text-[var(--text-secondary)]">
                      {{ easy: 'Легко', medium: 'Средне', hard: 'Сложно', expert: 'Эксперт' }[t.difficulty] ?? t.difficulty}
                    </span>
                  </div>
                )}

                {/* Цена + комиссия */}
                <div className="flex items-end justify-between pt-2 border-t border-[var(--border)]">
                  <div>
                    <p className="text-lg font-bold text-[var(--text-primary)]">
                      {fmtPrice(t.price)}
                      <span className="text-sm font-normal text-[var(--text-muted)]"> /чел</span>
                    </p>
                    <p className="text-sm flex items-center gap-1 text-[var(--success)]">
                      <Banknote size={13} />
                      Ваша комиссия: {fmtPrice(t.agent_commission)}
                    </p>
                  </div>
                  {t.operator_phone && (
                    <a
                      href={`tel:${t.operator_phone}`}
                      className="ds-btn ds-btn-secondary flex items-center gap-1.5 text-sm"
                    >
                      <Phone size={14} />
                      Связаться
                    </a>
                  )}
                </div>

                {/* CTA */}
                <a
                  href={`/hub/agent/clients?suggest_tour=${t.tour_id}&date=${date}`}
                  className="ds-btn ds-btn-primary w-full flex items-center justify-center gap-2 text-sm"
                >
                  Предложить клиенту
                  <ChevronRight size={14} />
                </a>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
