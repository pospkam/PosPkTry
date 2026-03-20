'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Protected } from '@/components/auth/Protected';
import {
  MapPin, Calendar, Trash2, Plus, Loader, AlertTriangle, Route,
} from 'lucide-react';

interface TripListItem {
  id: string;
  title: string;
  arrival_date: string | null;
  departure_date: string | null;
  places: string[];
  activities: string[];
  days_count: string;
  created_at: string;
  updated_at: string;
}

function fmt(d: string | null): string {
  if (!d) return '';
  return new Date(d).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' });
}

function TripCard({ trip, onDelete }: { trip: TripListItem; onDelete: (id: string) => void }) {
  const [deleting, setDeleting] = useState(false);
  const days = Number(trip.days_count);

  async function handleDelete(e: React.MouseEvent) {
    e.preventDefault();
    if (!confirm('Удалить маршрут?')) return;
    setDeleting(true);
    await fetch(`/api/trips/${trip.id}`, { method: 'DELETE' });
    onDelete(trip.id);
  }

  return (
    <Link href={`/hub/tourist/trips/${trip.id}`}
      className="group ds-card p-4 flex flex-col gap-3 hover:border-[var(--accent)] transition-all">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-[var(--text-primary)] truncate group-hover:text-[var(--accent)] transition-colors">
            {trip.title}
          </p>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">
            Обновлён {fmt(trip.updated_at)}
          </p>
        </div>
        <button onClick={handleDelete} disabled={deleting}
          className="w-7 h-7 flex items-center justify-center rounded text-[var(--text-muted)] hover:text-[var(--danger)] hover:bg-[var(--danger)]/10 transition-colors shrink-0">
          {deleting ? <Loader className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
        </button>
      </div>

      <div className="flex flex-wrap gap-2 text-xs text-[var(--text-secondary)]">
        {trip.arrival_date && (
          <span className="flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5" />
            {fmt(trip.arrival_date)}{trip.departure_date ? ` — ${fmt(trip.departure_date)}` : ''}
          </span>
        )}
        {days > 0 && (
          <span className="flex items-center gap-1">
            <MapPin className="w-3.5 h-3.5" />
            {days} {days === 1 ? 'день' : days < 5 ? 'дня' : 'дней'}
          </span>
        )}
      </div>

      {(trip.places.length > 0 || trip.activities.length > 0) && (
        <div className="flex flex-wrap gap-1">
          {[...trip.places, ...trip.activities].slice(0, 5).map(tag => (
            <span key={tag}
              className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--bg-hover)] border border-[var(--border)] text-[var(--text-muted)]">
              {tag}
            </span>
          ))}
        </div>
      )}
    </Link>
  );
}

export function TripsClient() {
  const [trips, setTrips] = useState<TripListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/trips')
      .then(r => r.json())
      .then(d => {
        if (d.success) setTrips(d.data);
        else setError(d.error ?? 'Ошибка');
      })
      .catch(() => setError('Нет соединения'))
      .finally(() => setLoading(false));
  }, []);

  function handleDelete(id: string) {
    setTrips(prev => prev.filter(t => t.id !== id));
  }

  return (
    <Protected roles={['tourist', 'admin']}>
      <div className="ds-page max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="ds-h1">Мои маршруты</h1>
            <p className="text-sm text-[var(--text-secondary)] mt-1">
              Сохранённые планы из конструктора
            </p>
          </div>
          <Link href="/planner"
            className="ds-btn ds-btn-primary flex items-center gap-2 px-4 py-2.5 text-sm font-medium">
            <Plus className="w-4 h-4" />
            Новый маршрут
          </Link>
        </div>

        {loading && (
          <div className="flex items-center justify-center py-16 gap-2 text-[var(--text-muted)]">
            <Loader className="w-5 h-5 animate-spin" />
            <span className="text-sm">Загружаем маршруты...</span>
          </div>
        )}

        {!loading && error && (
          <div className="flex items-center gap-2 p-4 bg-[var(--danger)]/10 border border-[var(--danger)]/30 rounded-lg">
            <AlertTriangle className="w-4 h-4 text-[var(--danger)] shrink-0" />
            <p className="text-sm text-[var(--danger)]">{error}</p>
          </div>
        )}

        {!loading && !error && trips.length === 0 && (
          <div className="text-center py-20">
            <div className="w-16 h-16 rounded-full bg-[var(--bg-hover)] flex items-center justify-center mx-auto mb-4">
              <Route className="w-7 h-7 text-[var(--text-muted)]" />
            </div>
            <p className="text-[var(--text-secondary)] mb-4">Пока нет сохранённых маршрутов</p>
            <Link href="/planner" className="ds-btn ds-btn-primary px-5 py-2.5 text-sm font-medium">
              Построить первый маршрут
            </Link>
          </div>
        )}

        {!loading && trips.length > 0 && (
          <div className="grid gap-3 sm:grid-cols-2">
            {trips.map(t => (
              <TripCard key={t.id} trip={t} onDelete={handleDelete} />
            ))}
          </div>
        )}
      </div>
    </Protected>
  );
}
