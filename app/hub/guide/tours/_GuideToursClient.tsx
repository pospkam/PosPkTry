'use client';

import { useEffect, useState } from 'react';
import { Protected } from '@/components/auth/Protected';
import {
  Map, Clock, Users, DollarSign, Loader2, AlertCircle,
  CheckCircle, Calendar, Phone,
} from 'lucide-react';

interface GuideTour {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  activityType: string;
  durationHours: number;
  basePrice: number;
  maxParticipants: number;
  isPublished: boolean;
  includesGuide: boolean;
  includesEquipment: boolean;
  operatorId: string;
  operatorName: string;
  operatorPhone: string | null;
  upcomingSlots: number;
  futureSlots: number;
}

const ACTIVITY_LABELS: Record<string, string> = {
  boat_trip:   'Сплав / лодка',
  trekking:    'Треккинг',
  fishing:     'Рыбалка',
  helicopter:  'Вертолёт',
  diving:      'Дайвинг',
  skiing:      'Лыжи / сноуборд',
  horseback:   'Конные туры',
  jeep_safari: 'Джип-сафари',
};

function fmt(price: number) {
  return price.toLocaleString('ru-RU') + ' ₽';
}

export default function GuideToursClient() {
  const [tours, setTours] = useState<GuideTour[]>([]);
  const [operatorLinked, setOperatorLinked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/guide/tours')
      .then(r => r.json())
      .then(json => {
        if (json.success) {
          setTours(json.data.tours);
          setOperatorLinked(json.data.operatorLinked);
        } else {
          setError(json.error || 'Ошибка загрузки');
        }
      })
      .catch(() => setError('Ошибка сети'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <Protected roles={['guide', 'admin']}>
      <div className="max-w-5xl mx-auto p-6 space-y-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="ds-h1 flex items-center gap-2">
              <Map className="w-6 h-6 text-[var(--ocean)]" />
              Мои туры
            </h1>
            <p className="text-[var(--text-secondary)] text-sm mt-1">
              {operatorLinked
                ? 'Туры вашего оператора'
                : 'Все опубликованные туры платформы'}
            </p>
          </div>
          {!operatorLinked && (
            <div className="flex items-center gap-1.5 text-xs text-[var(--warning)] bg-[var(--warning)]/10 px-3 py-1.5 rounded-md">
              <AlertCircle className="w-3.5 h-3.5" />
              Не прикреплены к оператору
            </div>
          )}
        </div>

        {loading && (
          <div className="flex justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-[var(--accent)]" />
          </div>
        )}

        {error && (
          <div className="ds-card p-4 flex items-center gap-2 text-[var(--danger)]">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {error}
          </div>
        )}

        {!loading && !error && tours.length === 0 && (
          <div className="ds-card p-10 text-center text-[var(--text-secondary)]">
            Туры не найдены
          </div>
        )}

        <div className="grid gap-4">
          {tours.map(tour => (
            <div key={tour.id} className="ds-card p-5 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <h2 className="font-semibold text-[var(--text-primary)] leading-snug">
                    {tour.title}
                  </h2>
                  <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                    {tour.operatorName}
                    {tour.operatorPhone && (
                      <a
                        href={`tel:${tour.operatorPhone}`}
                        className="ml-2 inline-flex items-center gap-1 text-[var(--ocean)] hover:underline"
                      >
                        <Phone className="w-3 h-3" />
                        {tour.operatorPhone}
                      </a>
                    )}
                  </p>
                </div>
                <span className="ds-badge shrink-0 text-xs">
                  {ACTIVITY_LABELS[tour.activityType] ?? tour.activityType}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm text-[var(--text-secondary)]">
                <div className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-[var(--ocean)]" />
                  {tour.durationHours} ч
                </div>
                <div className="flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-[var(--ocean)]" />
                  до {tour.maxParticipants} чел
                </div>
                <div className="flex items-center gap-1.5">
                  <DollarSign className="w-3.5 h-3.5 text-[var(--ocean)]" />
                  {fmt(tour.basePrice)} / чел
                </div>
                <div className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-[var(--ocean)]" />
                  {tour.futureSlots > 0
                    ? <span className="text-[var(--success)]">{tour.futureSlots} слота</span>
                    : <span className="text-[var(--text-muted)]">нет слотов</span>}
                </div>
              </div>

              {(tour.includesGuide || tour.includesEquipment) && (
                <div className="flex gap-2 flex-wrap">
                  {tour.includesGuide && (
                    <span className="inline-flex items-center gap-1 text-xs text-[var(--success)] bg-[var(--success)]/10 px-2 py-0.5 rounded">
                      <CheckCircle className="w-3 h-3" /> гид включён
                    </span>
                  )}
                  {tour.includesEquipment && (
                    <span className="inline-flex items-center gap-1 text-xs text-[var(--ocean)] bg-[var(--ocean)]/10 px-2 py-0.5 rounded">
                      <CheckCircle className="w-3 h-3" /> снаряжение включено
                    </span>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </Protected>
  );
}
