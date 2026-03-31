'use client';

import { useState } from 'react';
import { FileText, BarChart3, Users, Download, Loader2 } from 'lucide-react';

const REPORTS = [
  {
    type:    'bookings',
    icon:    FileText,
    label:   'Отчёт по бронированиям',
    desc:    'Все бронирования с клиентами, датами и суммами',
    color:   'var(--ocean)',
  },
  {
    type:    'finance',
    icon:    BarChart3,
    label:   'Финансовый отчёт',
    desc:    'Выручка по месяцам, комиссии, чистый доход',
    color:   'var(--success)',
  },
  {
    type:    'clients',
    icon:    Users,
    label:   'Отчёт по клиентам',
    desc:    'База клиентов с контактами и историей бронирований',
    color:   'var(--accent)',
  },
];

export default function ReportsPageClient() {
  const [loading, setLoading] = useState<string | null>(null);

  async function download(type: string) {
    setLoading(type);
    try {
      const res = await fetch(`/api/hub/operator/reports?type=${type}&format=csv`);
      if (!res.ok) throw new Error('Ошибка генерации');
      const blob = await res.blob();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href     = url;
      a.download = `${type}-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      alert('Не удалось сформировать отчёт');
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="p-6 max-w-2xl">
      <h1 className="text-2xl font-bold text-[var(--text-primary)] mb-1" style={{ fontFamily: 'var(--font-playfair)' }}>
        Отчёты
      </h1>
      <p className="text-sm text-[var(--text-muted)] mb-8">
        Выгрузка данных в CSV — открывается в Excel и Google Таблицах
      </p>

      <div className="space-y-3">
        {REPORTS.map(({ type, icon: Icon, label, desc, color }) => (
          <div
            key={type}
            className="flex items-center gap-4 px-4 py-4 bg-[var(--bg-card)] border border-[var(--border)] rounded-lg"
          >
            <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
              style={{ background: `color-mix(in srgb, ${color} 12%, transparent)` }}>
              <Icon className="w-4 h-4" style={{ color }} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-[var(--text-primary)]">{label}</p>
              <p className="text-xs text-[var(--text-muted)] mt-0.5">{desc}</p>
            </div>
            <button
              onClick={() => download(type)}
              disabled={loading === type}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium border border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--accent)] hover:text-[var(--accent)] transition-colors disabled:opacity-50"
            >
              {loading === type
                ? <Loader2 className="w-4 h-4 animate-spin" />
                : <Download className="w-4 h-4" />}
              CSV
            </button>
          </div>
        ))}
      </div>

      <p className="text-xs text-[var(--text-muted)] mt-6">
        Файлы содержат данные за всё время работы. Кодировка UTF-8 с BOM для корректного открытия в Excel.
      </p>
    </div>
  );
}
