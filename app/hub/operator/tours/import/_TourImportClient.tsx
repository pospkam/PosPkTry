'use client';

import { useState, useRef } from 'react';
import Link from 'next/link';
import {
  Upload, Download, CheckCircle, XCircle,
  AlertTriangle, FileText, ArrowLeft, ChevronRight,
} from 'lucide-react';

// ─────────────────────────────────────────────────────────────────────────────
// CSV template
// ─────────────────────────────────────────────────────────────────────────────

const TEMPLATE_HEADERS = [
  'title', 'activity_type', 'location_type', 'location_name',
  'latitude', 'longitude', 'base_price', 'max_participants',
  'description', 'short_description', 'duration_hours',
  'difficulty', 'price_unit', 'min_participants',
  'season_start', 'season_end', 'tags',
];

const TEMPLATE_EXAMPLE = [
  'Рыбалка на реке Быстрой', 'fishing', 'river', 'Река Быстрая',
  '52.8', '157.5', '12000', '8',
  'Однодневный рыболовный тур на лучшей реке Камчатки', 'Рыбалка на реке Быстрой',
  '8', 'easy', 'per_person', '2',
  '2026-06-01', '2026-09-30', 'рыбалка;река;форель',
];

function downloadTemplate() {
  const rows = [TEMPLATE_HEADERS.join(','), TEMPLATE_EXAMPLE.join(',')];
  const blob = new Blob([rows.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'tours_template.csv';
  a.click();
  URL.revokeObjectURL(url);
}

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface RowResult {
  row: number;
  status: 'created' | 'error';
  title: string;
  id?: unknown;
  reason?: string;
}

interface ImportResult {
  summary: { total: number; created: number; failed: number };
  results: RowResult[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export default function TourImportClient() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);

  function handleFile(f: File) {
    if (!f.name.endsWith('.csv')) {
      setError('Только .csv файлы');
      return;
    }
    setFile(f);
    setError(null);
    setResult(null);
  }

  async function handleUpload() {
    if (!file) return;
    setUploading(true);
    setError(null);
    setResult(null);

    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/hub/operator/tours/import', { method: 'POST', body: fd });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Ошибка загрузки');
        return;
      }
      setResult(data as ImportResult);
      setFile(null);
      if (fileRef.current) fileRef.current.value = '';
    } catch {
      setError('Ошибка сети');
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="p-5 lg:p-6 max-w-3xl space-y-5">
      {/* Back */}
      <Link
        href="/hub/operator/tours"
        className="inline-flex items-center gap-1.5 text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        Туры
      </Link>

      {/* Header */}
      <div>
        <h1 className="text-lg font-bold text-[var(--text-primary)] mb-1" style={{ fontFamily: 'var(--font-playfair)' }}>
          Импорт туров из CSV
        </h1>
        <p className="text-sm text-[var(--text-secondary)]">
          Загрузите до 200 туров за раз. Скачайте шаблон, заполните и загрузите обратно.
        </p>
      </div>

      {/* Template download */}
      <div className="flex items-center justify-between rounded-lg border border-[var(--border)] bg-[var(--bg-card)] px-4 py-3">
        <div className="flex items-center gap-3">
          <FileText className="w-4 h-4 text-[var(--text-muted)] shrink-0" />
          <div>
            <p className="text-sm font-medium text-[var(--text-primary)]">Шаблон CSV</p>
            <p className="text-xs text-[var(--text-secondary)]">
              Обязательные колонки: title, activity_type, location_type, location_name, latitude, longitude, base_price, max_participants
            </p>
          </div>
        </div>
        <button
          onClick={downloadTemplate}
          className="shrink-0 inline-flex items-center gap-1.5 text-xs font-medium text-[var(--ocean)] hover:opacity-80 transition-opacity"
        >
          <Download className="w-3.5 h-3.5" />
          Скачать
        </button>
      </div>

      {/* Допустимые значения */}
      <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-card)] px-4 py-3 text-xs text-[var(--text-secondary)] space-y-1">
        <p className="font-medium text-[var(--text-primary)] mb-2">Допустимые значения</p>
        <p><span className="text-[var(--text-primary)]">activity_type:</span> trekking · thermal · boat_trip · rafting · fishing · helicopter · jeep · other</p>
        <p><span className="text-[var(--text-primary)]">location_type:</span> volcano · hot_spring · bay · lake · mountain · river · geyser · other</p>
        <p><span className="text-[var(--text-primary)]">difficulty:</span> easy · medium · hard · expert</p>
        <p><span className="text-[var(--text-primary)]">price_unit:</span> per_tour · per_person · per_day_per_person</p>
        <p><span className="text-[var(--text-primary)]">tags:</span> значения через точку с запятой, пример: <code>рыбалка;река;форель</code></p>
        <p><span className="text-[var(--text-primary)]">season_start / season_end:</span> формат YYYY-MM-DD</p>
      </div>

      {/* Drop zone */}
      <div
        onDragOver={e => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={e => {
          e.preventDefault();
          setDragging(false);
          const f = e.dataTransfer.files[0];
          if (f) handleFile(f);
        }}
        onClick={() => fileRef.current?.click()}
        className={`
          cursor-pointer rounded-lg border-2 border-dashed px-6 py-10 text-center transition-colors
          ${dragging
            ? 'border-[var(--accent)] bg-[var(--accent)]/5'
            : 'border-[var(--border)] hover:border-[var(--text-muted)]'
          }
        `}
      >
        <Upload className="w-8 h-8 text-[var(--text-muted)] mx-auto mb-3" />
        {file ? (
          <p className="text-sm font-medium text-[var(--text-primary)]">{file.name}</p>
        ) : (
          <>
            <p className="text-sm font-medium text-[var(--text-primary)]">Перетащите CSV или нажмите</p>
            <p className="text-xs text-[var(--text-muted)] mt-1">Только .csv, до 200 строк</p>
          </>
        )}
        <input
          ref={fileRef}
          type="file"
          accept=".csv"
          className="hidden"
          onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
        />
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-[var(--danger)]/30 bg-[var(--danger)]/5 px-4 py-3">
          <AlertTriangle className="w-4 h-4 text-[var(--danger)] shrink-0" />
          <p className="text-sm text-[var(--danger)]">{error}</p>
        </div>
      )}

      {/* Upload button */}
      {file && (
        <button
          onClick={handleUpload}
          disabled={uploading}
          className="ds-btn ds-btn-primary w-full flex items-center justify-center gap-2"
        >
          {uploading ? (
            <span className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
          ) : (
            <Upload className="w-4 h-4" />
          )}
          {uploading ? 'Загрузка...' : 'Импортировать'}
        </button>
      )}

      {/* Results */}
      {result && (
        <div className="space-y-3">
          {/* Summary */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Всего', value: result.summary.total, color: 'text-[var(--text-primary)]' },
              { label: 'Создано', value: result.summary.created, color: 'text-[var(--success)]' },
              { label: 'Ошибок', value: result.summary.failed, color: result.summary.failed > 0 ? 'text-[var(--danger)]' : 'text-[var(--text-muted)]' },
            ].map(({ label, value, color }) => (
              <div key={label} className="rounded-lg border border-[var(--border)] bg-[var(--bg-card)] px-4 py-3 text-center">
                <p className={`text-2xl font-bold ${color}`}>{value}</p>
                <p className="text-xs text-[var(--text-muted)] mt-0.5">{label}</p>
              </div>
            ))}
          </div>

          {/* Row results */}
          <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-card)] divide-y divide-[var(--border)]">
            {result.results.map(r => (
              <div key={r.row} className="flex items-start gap-3 px-4 py-2.5">
                {r.status === 'created' ? (
                  <CheckCircle className="w-4 h-4 text-[var(--success)] shrink-0 mt-0.5" />
                ) : (
                  <XCircle className="w-4 h-4 text-[var(--danger)] shrink-0 mt-0.5" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-[var(--text-primary)] truncate">{r.title}</p>
                  {r.status === 'error' && (
                    <p className="text-xs text-[var(--danger)] mt-0.5">{r.reason}</p>
                  )}
                </div>
                <span className="text-xs text-[var(--text-muted)] shrink-0">стр. {r.row}</span>
              </div>
            ))}
          </div>

          {result.summary.created > 0 && (
            <Link
              href="/hub/operator/tours"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--accent)] hover:opacity-80 transition-opacity"
            >
              Перейти к турам
              <ChevronRight className="w-4 h-4" />
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
