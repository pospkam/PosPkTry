'use client';

import { useState } from 'react';
import { LoadingSpinner } from '@/components/admin/shared';
import { Calendar, Clock, MapPin, Users } from 'lucide-react';
import { useApiFetch } from '@/hooks/use-api-fetch';

interface ScheduleItem {
  id: string;
  tourName: string;
  date: string;
  time: string;
  location: string;
  participants: number;
  status: 'upcoming' | 'in_progress' | 'completed';
}

function getStatusStyle(status: string): { color: string; borderColor: string; backgroundColor: string } {
  switch (status) {
    case 'upcoming':
      return {
        color: 'var(--accent)',
        borderColor: 'var(--accent)',
        backgroundColor: 'color-mix(in srgb, var(--accent) 10%, transparent)',
      };
    case 'in_progress':
      return {
        color: 'var(--success)',
        borderColor: 'var(--success)',
        backgroundColor: 'color-mix(in srgb, var(--success) 10%, transparent)',
      };
    case 'completed':
    default:
      return {
        color: 'var(--text-muted)',
        borderColor: 'var(--border)',
        backgroundColor: 'var(--bg-hover)',
      };
  }
}

function getStatusLabel(status: string) {
  switch (status) {
    case 'upcoming':    return 'Предстоит';
    case 'in_progress': return 'В процессе';
    case 'completed':   return 'Завершен';
    default:            return status;
  }
}

const INPUT_DATE = 'px-3.5 py-2.5 text-sm bg-[var(--bg-primary)] border border-[var(--border)] rounded-md text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)] transition-colors';

export default function GuideSchedulePageClient() {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  const { data: schedule, loading } = useApiFetch<ScheduleItem[], ScheduleItem[]>(
    `/api/guide/schedule?date=${selectedDate}`,
    (d) => d ?? [],
  );

  const items = schedule ?? [];

  return (
    <div className="p-5 lg:p-6 space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-[var(--text-primary)]">Расписание</h1>
        <p className="text-sm text-[var(--text-muted)] mt-0.5">Ваши предстоящие туры</p>
      </div>

      {/* Date Selector */}
      <div>
        <input
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          className={INPUT_DATE}
        />
      </div>

      {loading ? (
        <LoadingSpinner message="Загрузка расписания..." />
      ) : items.length === 0 ? (
        <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg p-12 text-center">
          <Calendar className="w-14 h-14 mx-auto mb-4 text-[var(--text-muted)]" />
          <h2 className="text-sm font-semibold text-[var(--text-primary)] mb-2">
            Нет запланированных туров
          </h2>
          <p className="text-sm text-[var(--text-muted)]">
            На выбранную дату туры не назначены
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <div
              key={item.id}
              className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg px-5 py-4 hover:bg-[var(--bg-hover)] transition-colors"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-2">
                    {item.tourName}
                  </h3>
                  <div className="flex flex-wrap gap-4 text-xs text-[var(--text-muted)]">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      {item.time}
                    </span>
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5" />
                      {item.location}
                    </span>
                    <span className="flex items-center gap-1">
                      <Users className="w-3.5 h-3.5" />
                      {item.participants} чел.
                    </span>
                  </div>
                </div>
                <span
                  className="shrink-0 px-2.5 py-1 rounded-full text-xs border"
                  style={getStatusStyle(item.status)}
                >
                  {getStatusLabel(item.status)}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
