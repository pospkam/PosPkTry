'use client';

import React, { useCallback, useRef, useState } from 'react';
import Image from 'next/image';
import { Upload, CheckCircle, XCircle, Loader2, ImageIcon, Copy } from 'lucide-react';

// ── Client-side resize ────────────────────────────────────────────────────────

type ResizeDims = { width: number; height?: number };

const CANVAS_PROFILES: Record<string, ResizeDims> = {
  hero:     { width: 1920 },
  activity: { width: 800,  height: 600 },
  bento:    { width: 1200, height: 800 },
  gallery:  { width: 1200, height: 900 },
  auto:     { width: 1200 },          // pre-resize before AI decides profile
};

async function resizeForProfile(file: File, profile: string): Promise<Blob> {
  const { width: targetW, height: targetH } = CANVAS_PROFILES[profile] ?? CANVAS_PROFILES.auto;

  const bitmap = await createImageBitmap(file);
  const srcW = bitmap.width;
  const srcH = bitmap.height;

  let canvasW: number;
  let canvasH: number;
  let drawX = 0;
  let drawY = 0;
  let drawW: number;
  let drawH: number;

  if (targetH) {
    // cover: fill exact box, crop centre
    const scale = Math.max(targetW / srcW, targetH / srcH);
    drawW = Math.round(srcW * scale);
    drawH = Math.round(srcH * scale);
    canvasW = targetW;
    canvasH = targetH;
    drawX = Math.round((targetW - drawW) / 2);
    drawY = Math.round((targetH - drawH) / 2);
  } else {
    // width-only: maintain ratio, never enlarge
    const scale = srcW > targetW ? targetW / srcW : 1;
    drawW = Math.round(srcW * scale);
    drawH = Math.round(srcH * scale);
    canvasW = drawW;
    canvasH = drawH;
  }

  const canvas = document.createElement('canvas');
  canvas.width  = canvasW;
  canvas.height = canvasH;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas недоступен');
  ctx.drawImage(bitmap, drawX, drawY, drawW, drawH);
  bitmap.close();

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(b => (b ? resolve(b) : reject(new Error('toBlob вернул null'))), 'image/jpeg', 0.86);
  });
}

// ── Типы ─────────────────────────────────────────────────────────────────────

type Profile = 'hero' | 'activity' | 'bento' | 'gallery';

interface AnalysisResult {
  subject: string;
  category: string;
  profile: Profile;
  filename: string;
  quality: 'excellent' | 'good' | 'skip';
}

interface UploadResult {
  ok: true;
  filename: string;
  savedPath: string;
  profile: Profile;
  dir: string;
  sizeKb: number;
  analysis: AnalysisResult | null;
}

type UploadStatus = 'pending' | 'uploading' | 'done' | 'error';

interface PhotoItem {
  id: string;
  file: File;
  previewUrl: string;
  status: UploadStatus;
  selectedProfile: Profile | 'auto';
  result?: UploadResult;
  error?: string;
}

const PROFILE_LABELS: Record<Profile | 'auto', string> = {
  auto:     'AI выберет',
  hero:     'Hero (1920px)',
  activity: 'Activity (800×600)',
  bento:    'Bento (1200×800)',
  gallery:  'Gallery (1200×900)',
};

const PROFILE_COLORS: Record<Profile, string> = {
  hero:     'bg-[var(--accent)] text-white',
  activity: 'bg-[var(--ocean)] text-white',
  bento:    'bg-[var(--success)] text-white',
  gallery:  'bg-[var(--warning)] text-white',
};

// ── Компонент ─────────────────────────────────────────────────────────────────

export function PhotosPageClient() {
  const [items, setItems] = useState<PhotoItem[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // ── Добавление файлов ──────────────────────────────────────────────────────

  const addFiles = useCallback((files: File[]) => {
    const images = files.filter(f => f.type.startsWith('image/'));
    if (!images.length) return;

    const newItems: PhotoItem[] = images.map(file => ({
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      file,
      previewUrl: URL.createObjectURL(file),
      status: 'pending',
      selectedProfile: 'auto',
    }));

    setItems(prev => [...prev, ...newItems]);
  }, []);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    addFiles(Array.from(e.dataTransfer.files));
  }, [addFiles]);

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) addFiles(Array.from(e.target.files));
    e.target.value = '';
  };

  // ── Загрузка одного файла ──────────────────────────────────────────────────

  const uploadItem = async (item: PhotoItem): Promise<void> => {
    setItems(prev => prev.map(p => p.id === item.id ? { ...p, status: 'uploading' } : p));

    let uploadBlob: Blob;
    try {
      uploadBlob = await resizeForProfile(item.file, item.selectedProfile);
    } catch {
      uploadBlob = item.file;   // fallback: send original if Canvas unavailable
    }

    const resizedFile = new File([uploadBlob], item.file.name, { type: 'image/jpeg' });
    const fd = new FormData();
    fd.append('file', resizedFile);
    if (item.selectedProfile !== 'auto') {
      fd.append('profile', item.selectedProfile);
    }

    try {
      const res = await fetch('/api/admin/photos/upload', { method: 'POST', body: fd });
      const data = await res.json() as UploadResult | { error: string };

      if (!res.ok || !('ok' in data)) {
        setItems(prev => prev.map(p => p.id === item.id
          ? { ...p, status: 'error', error: ('error' in data ? data.error : 'Ошибка загрузки') }
          : p));
        return;
      }

      setItems(prev => prev.map(p => p.id === item.id
        ? { ...p, status: 'done', result: data }
        : p));
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Ошибка сети';
      setItems(prev => prev.map(p => p.id === item.id
        ? { ...p, status: 'error', error: msg }
        : p));
    }
  };

  // ── Загрузить все pending ──────────────────────────────────────────────────

  const uploadAll = async () => {
    setIsUploading(true);
    const pending = items.filter(i => i.status === 'pending');
    for (const item of pending) {
      await uploadItem(item);
    }
    setIsUploading(false);
  };

  const pendingCount = items.filter(i => i.status === 'pending').length;
  const doneCount = items.filter(i => i.status === 'done').length;

  const removeItem = (id: string) => {
    setItems(prev => {
      const item = prev.find(p => p.id === id);
      if (item) URL.revokeObjectURL(item.previewUrl);
      return prev.filter(p => p.id !== id);
    });
  };

  const setProfile = (id: string, profile: Profile | 'auto') => {
    setItems(prev => prev.map(p => p.id === id ? { ...p, selectedProfile: profile } : p));
  };

  // ── Копировать путь ────────────────────────────────────────────────────────

  const copyPath = (path: string) => navigator.clipboard.writeText(path);

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="ds-h1 mb-1">Фотографии</h1>
        <p className="text-[var(--text-secondary)] text-sm">
          Загружай фото — AI определит куда положить и оптимизирует размер.
        </p>
      </div>

      {/* Зона загрузки */}
      <div
        className={`ds-card mb-6 border-2 border-dashed transition-colors cursor-pointer ${
          isDragging
            ? 'border-[var(--accent)] bg-[var(--bg-hover)]'
            : 'border-[var(--border)] hover:border-[var(--accent)]'
        }`}
        onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
      >
        <div className="py-10 flex flex-col items-center gap-3 text-center">
          <Upload className="w-10 h-10 text-[var(--text-muted)]" />
          <div>
            <p className="font-semibold text-[var(--text-primary)]">
              Перетащи фото или нажми для выбора
            </p>
            <p className="text-sm text-[var(--text-secondary)] mt-1">
              JPG, PNG, WEBP, HEIC — до 60 МБ каждый
            </p>
          </div>
        </div>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={onInputChange}
        />
      </div>

      {/* Кнопки действий */}
      {items.length > 0 && (
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={uploadAll}
            disabled={isUploading || pendingCount === 0}
            className="ds-btn ds-btn-primary flex items-center gap-2"
          >
            {isUploading && <Loader2 className="w-4 h-4 animate-spin" />}
            Загрузить {pendingCount > 0 ? `(${pendingCount})` : 'все'}
          </button>
          {doneCount > 0 && (
            <span className="text-sm text-[var(--success)]">
              Готово: {doneCount} из {items.length}
            </span>
          )}
          <button
            onClick={() => setItems([])}
            className="ds-btn ds-btn-secondary ml-auto"
          >
            Очистить всё
          </button>
        </div>
      )}

      {/* Очередь фото */}
      {items.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2">
          {items.map(item => (
            <PhotoCard
              key={item.id}
              item={item}
              onRemove={() => removeItem(item.id)}
              onUpload={() => uploadItem(item)}
              onProfileChange={p => setProfile(item.id, p)}
              onCopyPath={copyPath}
            />
          ))}
        </div>
      )}

      {/* Итог если всё загружено */}
      {items.length > 0 && doneCount === items.length && (
        <div className="ds-card mt-6 border border-[var(--success)]">
          <h2 className="ds-h2 mb-3">Все загружены</h2>
          <p className="text-sm text-[var(--text-secondary)] mb-3">
            Сохранённые пути. Закоммить изменения чтобы они появились на сайте:
          </p>
          <div className="space-y-1">
            {items.map(item => item.result && (
              <div key={item.id} className="flex items-center gap-2 font-mono text-sm">
                <span className="text-[var(--text-primary)]">{item.result.savedPath}</span>
                <button onClick={() => copyPath(item.result!.savedPath)}>
                  <Copy className="w-3.5 h-3.5 text-[var(--text-muted)] hover:text-[var(--accent)]" />
                </button>
                <span className="text-[var(--text-muted)]">{item.result.sizeKb} KB</span>
              </div>
            ))}
          </div>
          <p className="mt-4 text-xs text-[var(--text-muted)]">
            git add public/images/ &amp;&amp; git commit -m &quot;photos: update&quot; &amp;&amp; git push
          </p>
        </div>
      )}
    </div>
  );
}

// ── Карточка фото ─────────────────────────────────────────────────────────────

interface PhotoCardProps {
  item: PhotoItem;
  onRemove: () => void;
  onUpload: () => void;
  onProfileChange: (p: Profile | 'auto') => void;
  onCopyPath: (path: string) => void;
}

function PhotoCard({ item, onRemove, onUpload, onProfileChange, onCopyPath }: PhotoCardProps) {
  const { status, result, error } = item;

  return (
    <div className="ds-card flex flex-col gap-3">
      {/* Превью */}
      <div className="relative w-full aspect-video rounded overflow-hidden bg-[var(--bg-hover)]">
        {item.previewUrl ? (
          <Image src={item.previewUrl} alt={item.file.name} fill className="object-cover" />
        ) : (
          <div className="flex items-center justify-center h-full">
            <ImageIcon className="w-8 h-8 text-[var(--text-muted)]" />
          </div>
        )}

        {/* Статус бейдж */}
        <div className="absolute top-2 right-2">
          {status === 'uploading' && (
            <span className="bg-[var(--bg-card)] text-[var(--text-secondary)] text-xs px-2 py-1 rounded flex items-center gap-1 shadow-sm">
              <Loader2 className="w-3 h-3 animate-spin text-[var(--accent)]" /> Обработка...
            </span>
          )}
          {status === 'done' && (
            <CheckCircle className="w-6 h-6 text-[var(--success)] drop-shadow" />
          )}
          {status === 'error' && (
            <XCircle className="w-6 h-6 text-[var(--danger)] drop-shadow" />
          )}
        </div>

        {/* Profile бейдж после загрузки */}
        {result && (
          <div className="absolute bottom-2 left-2">
            <span className={`text-xs px-2 py-0.5 rounded font-medium ${PROFILE_COLORS[result.profile]}`}>
              {result.profile}
            </span>
          </div>
        )}
      </div>

      {/* Инфо */}
      <div className="flex-1">
        <p className="text-sm font-medium text-[var(--text-primary)] truncate" title={item.file.name}>
          {item.file.name}
        </p>
        <p className="text-xs text-[var(--text-muted)]">
          {(item.file.size / 1024).toFixed(0)} KB
        </p>

        {/* AI результат */}
        {result?.analysis && (
          <p className="text-xs text-[var(--text-secondary)] mt-1 line-clamp-2">
            {result.analysis.subject}
          </p>
        )}

        {/* Ошибка */}
        {error && (
          <p className="text-xs text-[var(--danger)] mt-1">{error}</p>
        )}

        {/* Сохранённый путь */}
        {result && (
          <button
            onClick={() => onCopyPath(result.savedPath)}
            className="mt-1 flex items-center gap-1 text-xs text-[var(--ocean)] hover:underline font-mono"
          >
            <Copy className="w-3 h-3" />
            {result.savedPath}
          </button>
        )}
      </div>

      {/* Профиль (только для pending) */}
      {status === 'pending' && (
        <select
          value={item.selectedProfile}
          onChange={e => onProfileChange(e.target.value as Profile | 'auto')}
          className="ds-input text-sm py-1.5"
        >
          {(Object.keys(PROFILE_LABELS) as Array<Profile | 'auto'>).map(p => (
            <option key={p} value={p}>{PROFILE_LABELS[p]}</option>
          ))}
        </select>
      )}

      {/* Кнопки */}
      <div className="flex gap-2">
        {status === 'pending' && (
          <button onClick={onUpload} className="ds-btn ds-btn-primary flex-1 text-sm py-1.5">
            Загрузить
          </button>
        )}
        {status === 'error' && (
          <button onClick={onUpload} className="ds-btn ds-btn-primary flex-1 text-sm py-1.5">
            Повторить
          </button>
        )}
        <button onClick={onRemove} className="ds-btn ds-btn-secondary text-sm py-1.5 px-3">
          ×
        </button>
      </div>
    </div>
  );
}
