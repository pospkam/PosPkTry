'use client';

import React, { useRef, useState } from 'react';
import { Upload, CheckCircle, XCircle, Loader2, Film, Trash2 } from 'lucide-react';

const CATEGORIES: { slug: string; label: string; img: string }[] = [
  { slug: 'vulkani',              label: 'Вулканы',       img: '/images/activities/volcanoes.jpg'  },
  { slug: 'geyzery',              label: 'Гейзеры',       img: '/images/bento/mutnovsky.jpg'       },
  { slug: 'rybalka',              label: 'Рыбалка',       img: '/images/activities/fishing.jpg'    },
  { slug: 'termalnye_istochniki', label: 'Термальные',    img: '/images/activities/hotsprings.jpg' },
  { slug: 'medvedi',              label: 'Медведи',       img: '/images/gallery/road-winter.jpg'   },
  { slug: 'morskie_progulki',     label: 'Морские',       img: '/images/activities/sea.jpg'        },
  { slug: 'vertoletnye_tury',     label: 'Вертолёты',     img: '/images/activities/helicopter.jpg' },
  { slug: 'trekking',             label: 'Треккинг',      img: '/images/gallery/camp-sunset.jpg'   },
  { slug: 'snegohod',             label: 'Снегоходы',     img: '/images/activities/snowmobile.jpg' },
  { slug: 'dzhip',                label: 'Джипы',         img: '/images/activities/jeep.jpg'       },
  { slug: 'lakes',                label: 'Озёра',         img: '/images/gallery/bay-sunset.jpg'    },
  { slug: 'mountains',            label: 'Горы',          img: '/images/gallery/stela.jpg'         },
  { slug: 'rivers',               label: 'Реки',          img: '/images/bento/khalaktyr.jpg'       },
  { slug: 'eco',                  label: 'Эко-туры',      img: '/images/gallery/aurora.jpg'        },
];

type Status = 'idle' | 'uploading' | 'done' | 'error';

interface SlotState {
  status: Status;
  previewUrl: string | null;
  servePath: string | null;
  sizeKb: number | null;
  format: string | null;
  error: string | null;
}

const INIT: SlotState = { status: 'idle', previewUrl: null, servePath: null, sizeKb: null, format: null, error: null };

export default function AdminVideosPage() {
  const [slots, setSlots] = useState<Record<string, SlotState>>(
    Object.fromEntries(CATEGORIES.map(c => [c.slug, { ...INIT }]))
  );
  const [dragging, setDragging] = useState<string | null>(null);
  const inputs = useRef<Record<string, HTMLInputElement | null>>({});

  const setSlot = (slug: string, patch: Partial<SlotState>) =>
    setSlots(prev => ({ ...prev, [slug]: { ...prev[slug], ...patch } }));

  const upload = async (slug: string, file: File) => {
    if (!file.type.startsWith('video/')) {
      setSlot(slug, { status: 'error', error: 'Нужен видеофайл (MP4 или WebM)' });
      return;
    }

    const previewUrl = URL.createObjectURL(file);
    setSlot(slug, { status: 'uploading', previewUrl, error: null });

    const fd = new FormData();
    fd.append('file', file);
    fd.append('category', slug);

    try {
      const res = await fetch('/api/admin/videos/upload', { method: 'POST', body: fd });
      const json = await res.json() as { ok?: true; servePath?: string; sizeKb?: number; format?: string; error?: string };

      if (!res.ok || !json.ok) {
        setSlot(slug, { status: 'error', error: json.error ?? 'Ошибка загрузки' });
        return;
      }

      setSlot(slug, {
        status: 'done',
        servePath: json.servePath ?? null,
        sizeKb: json.sizeKb ?? null,
        format: json.format ?? null,
      });
    } catch {
      setSlot(slug, { status: 'error', error: 'Ошибка сети' });
    }
  };

  const handleFiles = (slug: string, files: FileList | null) => {
    const file = files?.[0];
    if (file) void upload(slug, file);
  };

  const reset = (slug: string) => {
    const prev = slots[slug];
    if (prev.previewUrl) URL.revokeObjectURL(prev.previewUrl);
    setSlot(slug, { ...INIT });
    if (inputs.current[slug]) inputs.current[slug]!.value = '';
  };

  const doneCount = Object.values(slots).filter(s => s.status === 'done').length;

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="ds-h1 mb-1 flex items-center gap-2">
            <Film className="w-6 h-6 text-[var(--accent)]" />
            Видео для карточек
          </h1>
          <p className="text-[var(--text-secondary)] text-sm">
            Hover-видео на главной странице. MP4 или WebM, до 50 МБ.
          </p>
        </div>
        {doneCount > 0 && (
          <span className="text-sm text-[var(--success)] font-medium">
            Загружено: {doneCount} / {CATEGORIES.length}
          </span>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {CATEGORIES.map(cat => {
          const slot = slots[cat.slug];
          const isDragging = dragging === cat.slug;

          return (
            <div key={cat.slug} className="ds-card flex flex-col gap-3">
              {/* Превью */}
              <div
                className={`relative w-full aspect-video rounded overflow-hidden bg-[var(--bg-hover)] cursor-pointer transition-colors ${
                  isDragging ? 'ring-2 ring-[var(--accent)]' : ''
                }`}
                onDragOver={e => { e.preventDefault(); setDragging(cat.slug); }}
                onDragLeave={() => setDragging(null)}
                onDrop={e => { e.preventDefault(); setDragging(null); handleFiles(cat.slug, e.dataTransfer.files); }}
                onClick={() => inputs.current[cat.slug]?.click()}
                style={{
                  backgroundImage: `url(${cat.img})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                }}
              >
                {/* Видео превью если загружено */}
                {slot.previewUrl && (
                  <video
                    src={slot.previewUrl}
                    muted
                    loop
                    autoPlay
                    playsInline
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                )}

                {/* Оверлей */}
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                  {slot.status === 'idle' && (
                    <div className="text-center">
                      <Upload className="w-6 h-6 text-white mx-auto mb-1" />
                      <span className="text-white text-xs">Перетащи или нажми</span>
                    </div>
                  )}
                  {slot.status === 'uploading' && (
                    <Loader2 className="w-6 h-6 text-white animate-spin" />
                  )}
                  {slot.status === 'done' && (
                    <CheckCircle className="w-7 h-7 text-[var(--success)] drop-shadow" />
                  )}
                  {slot.status === 'error' && (
                    <XCircle className="w-7 h-7 text-[var(--danger)] drop-shadow" />
                  )}
                </div>

                <input
                  ref={el => { inputs.current[cat.slug] = el; }}
                  type="file"
                  accept="video/webm,video/mp4"
                  className="hidden"
                  onChange={e => handleFiles(cat.slug, e.target.files)}
                />
              </div>

              {/* Инфо */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-[var(--text-primary)]">{cat.label}</p>
                  {slot.status === 'done' && slot.sizeKb && (
                    <p className="text-xs text-[var(--text-muted)]">
                      {slot.format?.toUpperCase()} · {slot.sizeKb} KB
                    </p>
                  )}
                  {slot.status === 'error' && (
                    <p className="text-xs text-[var(--danger)]">{slot.error}</p>
                  )}
                </div>

                {slot.status !== 'idle' && (
                  <button
                    type="button"
                    onClick={() => reset(cat.slug)}
                    className="p-1.5 rounded hover:bg-[var(--bg-hover)] text-[var(--text-muted)] hover:text-[var(--danger)] transition-colors"
                    aria-label="Сбросить"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Повторить при ошибке */}
              {slot.status === 'error' && (
                <button
                  type="button"
                  onClick={() => inputs.current[cat.slug]?.click()}
                  className="ds-btn ds-btn-primary text-sm py-1.5"
                >
                  Выбрать файл
                </button>
              )}
            </div>
          );
        })}
      </div>

      {doneCount === CATEGORIES.length && (
        <div className="ds-card mt-6 border border-[var(--success)]">
          <p className="text-sm font-medium text-[var(--success)]">
            Все 14 видео загружены. Они сразу работают на главной странице при наведении.
          </p>
        </div>
      )}
    </div>
  );
}
