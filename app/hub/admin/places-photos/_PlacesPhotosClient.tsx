'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Image from 'next/image';
import { Search, Upload, CheckCircle, XCircle, Loader2, ImageIcon } from 'lucide-react';

interface Place {
  id: string;
  arkId: string | null;
  name: string;
  locationType: string | null;
  hasPhoto: boolean;
  photoUrl: string | null;
}

const LOCATION_LABELS: Record<string, string> = {
  volcano: 'Вулкан', lake: 'Озеро', hot_spring: 'Источник', mountain: 'Гора',
  river: 'Река', bay: 'Бухта', cape: 'Мыс', island: 'Остров',
  glacier: 'Ледник', forest: 'Лес', beach: 'Пляж', waterfall: 'Водопад',
  rock: 'Скала', viewpoint: 'Смотровая', settlement: 'Поселение',
  museum: 'Музей', historical: 'Историческое',
};

export default function PlacesPhotosClient() {
  const [query, setQuery] = useState('');
  const [places, setPlaces] = useState<Place[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<Record<string, { ok: boolean; msg: string }>>({});
  const [filter, setFilter] = useState<'all' | 'no-photo' | 'with-photo'>('all');
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const fetchPlaces = useCallback(async (q: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/places/search?q=${encodeURIComponent(q)}&limit=200`);
      if (!res.ok) throw new Error('Не удалось загрузить список');
      const data = await res.json() as { items: Place[] };
      setPlaces(data.items);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => fetchPlaces(query), 250);
    return () => clearTimeout(t);
  }, [query, fetchPlaces]);

  const handleUpload = async (placeId: string, file: File) => {
    setUploading(placeId);
    setFeedback((prev) => ({ ...prev, [placeId]: { ok: true, msg: 'Загрузка…' } }));

    try {
      const fd = new FormData();
      fd.append('file', file);

      const res = await fetch(`/api/admin/places/${placeId}/photo`, {
        method: 'POST',
        body: fd,
      });

      const data = await res.json() as { ok?: boolean; error?: string; url?: string; sizeKb?: number };

      if (!res.ok || !data.ok) {
        setFeedback((prev) => ({ ...prev, [placeId]: { ok: false, msg: data.error ?? 'Ошибка загрузки' } }));
        return;
      }

      setFeedback((prev) => ({
        ...prev,
        [placeId]: { ok: true, msg: `Готово · ${data.sizeKb} КБ · 1280×720` },
      }));

      // Update place in list
      setPlaces((prev) =>
        prev.map((p) =>
          p.id === placeId ? { ...p, hasPhoto: true, photoUrl: data.url ?? p.photoUrl } : p,
        ),
      );
    } catch (err) {
      setFeedback((prev) => ({
        ...prev,
        [placeId]: { ok: false, msg: err instanceof Error ? err.message : 'Ошибка сети' },
      }));
    } finally {
      setUploading(null);
    }
  };

  const triggerUpload = (placeId: string) => {
    fileInputRefs.current[placeId]?.click();
  };

  const filtered = places.filter((p) =>
    filter === 'no-photo' ? !p.hasPhoto :
    filter === 'with-photo' ? p.hasPhoto :
    true,
  );

  return (
    <main className="max-w-5xl mx-auto px-4 py-8">
      <header className="mb-6">
        <h1 className="font-playfair text-3xl font-bold text-[var(--text-primary)] mb-2">
          Загрузка фото мест
        </h1>
        <p className="text-sm text-[var(--text-secondary)]">
          Загрузи фото — оно будет автоматически обрезано до 1280×720 (16:9) и сохранено для карточки места.
        </p>
      </header>

      {/* Search + filter */}
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Поиск по названию места…"
            className="w-full pl-10 pr-4 py-2.5 rounded-lg border bg-[var(--bg-card)] text-[var(--text-primary)]"
            style={{ borderColor: 'var(--border)' }}
          />
        </div>
        <div className="flex gap-2">
          {([
            { v: 'all', label: 'Все' },
            { v: 'no-photo', label: 'Без фото' },
            { v: 'with-photo', label: 'С фото' },
          ] as const).map(({ v, label }) => (
            <button
              key={v}
              onClick={() => setFilter(v)}
              className="px-3 py-2 rounded-lg text-sm font-medium transition-colors"
              style={{
                background: filter === v ? 'var(--accent)' : 'var(--bg-card)',
                color: filter === v ? 'white' : 'var(--text-primary)',
                border: `1px solid ${filter === v ? 'var(--accent)' : 'var(--border)'}`,
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <p className="text-xs text-[var(--text-muted)] mb-3">
        {loading ? 'Загрузка…' : `Показано: ${filtered.length}`}
      </p>

      {/* Places grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((place) => {
          const fb = feedback[place.id];
          const isUploading = uploading === place.id;

          return (
            <div
              key={place.id}
              className="rounded-xl border overflow-hidden bg-[var(--bg-card)]"
              style={{ borderColor: 'var(--border)' }}
            >
              {/* Preview */}
              <div className="aspect-video bg-[var(--bg-hover)] relative overflow-hidden">
                {place.photoUrl ? (
                  <Image
                    src={place.photoUrl}
                    alt={place.name}
                    fill
                    sizes="(max-width: 640px) 100vw, 33vw"
                    className="object-cover"
                    unoptimized
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center text-[var(--text-muted)]">
                    <ImageIcon className="w-8 h-8" />
                  </div>
                )}
                {place.hasPhoto && (
                  <span className="absolute top-2 right-2 text-[10px] font-bold uppercase px-2 py-1 rounded-full bg-[var(--success)] text-white">
                    Есть фото
                  </span>
                )}
              </div>

              {/* Info */}
              <div className="p-3">
                <p className="font-semibold text-sm text-[var(--text-primary)] line-clamp-2 mb-1">
                  {place.name}
                </p>
                <p className="text-[11px] text-[var(--text-muted)] mb-3">
                  {place.locationType ? LOCATION_LABELS[place.locationType] ?? place.locationType : '—'}
                </p>

                {/* Upload button */}
                <input
                  ref={(el) => { fileInputRefs.current[place.id] = el; }}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/heic"
                  className="hidden"
                  disabled={isUploading || !place.arkId}
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleUpload(place.id, f);
                    e.target.value = '';
                  }}
                />
                <button
                  onClick={() => triggerUpload(place.id)}
                  disabled={isUploading || !place.arkId}
                  className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{
                    background: 'var(--bg-hover)',
                    color: 'var(--text-primary)',
                    border: '1px solid var(--border)',
                  }}
                >
                  {isUploading ? (
                    <><Loader2 className="w-3.5 h-3.5 animate-spin" />Загрузка…</>
                  ) : (
                    <><Upload className="w-3.5 h-3.5" />{place.hasPhoto ? 'Заменить' : 'Загрузить'}</>
                  )}
                </button>

                {!place.arkId && (
                  <p className="text-[10px] text-[var(--danger)] mt-2 leading-tight">
                    У места нет ark_id — загрузка невозможна
                  </p>
                )}

                {fb && (
                  <div
                    className="flex items-start gap-1.5 mt-2 text-[11px] leading-tight"
                    style={{ color: fb.ok ? 'var(--success)' : 'var(--danger)' }}
                  >
                    {fb.ok ? <CheckCircle className="w-3 h-3 mt-0.5 flex-shrink-0" /> : <XCircle className="w-3 h-3 mt-0.5 flex-shrink-0" />}
                    <span>{fb.msg}</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {!loading && filtered.length === 0 && (
        <p className="text-center text-[var(--text-muted)] py-12">Ничего не найдено</p>
      )}
    </main>
  );
}
