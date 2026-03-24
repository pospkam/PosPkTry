'use client';

import React, { useState, useEffect } from 'react';
import {
  CheckCircle2, AlertCircle, RefreshCw, TrendingUp, Zap, AlertTriangle, ChevronDown,
  X, Zap as ZapIcon,
} from 'lucide-react';
import { LoadingSpinner, EmptyState } from '@/components/admin/shared';
import Link from 'next/link';
import toast from 'react-hot-toast';

interface TourCompletion {
  tour_id: string;
  tour_title: string;
  is_published: boolean;
  required_score: number;
  recommended_score: number;
  total_score: number;
  missing_required: string[];
  missing_recommended: string[];
}

interface CompletenessData {
  stats: {
    totalTours: number;
    avgTotalScore: number;
    fullyComplete: number;
    criticallyIncomplete: number;
    publishedTours: number;
  };
  tours: TourCompletion[];
}

const FIELD_LABELS: Record<string, string> = {
  title: 'Название тура',
  description: 'Полное описание',
  base_price: 'Базовая цена',
  activity_type: 'Тип активности',
  tour_image: 'Главное фото',
  short_description: 'Краткое описание',
  season_dates: 'Сезон (дата начала/конца)',
  difficulty: 'Уровень сложности',
  included: 'Что включено',
  not_included: 'Что не включено',
  what_to_bring: 'Что взять с собой',
  location_name: 'Название места',
  latitude: 'Широта на карте',
  longitude: 'Долгота на карте',
  coordinates: 'Координаты на карте',
  duration_hours: 'Длительность (часы)',
  duration_type: 'Тип длительности',
  price_unit: 'Единица цены',
  notes: 'Интересные факты',
  transportation: 'Способы транспорта',
};

const FIELD_PRIORITY: Record<string, 'critical' | 'high' | 'medium'> = {
  title: 'critical',
  description: 'critical',
  base_price: 'critical',
  activity_type: 'critical',
  tour_image: 'critical',
  short_description: 'high',
  season_dates: 'high',
  difficulty: 'high',
  included: 'medium',
  not_included: 'medium',
  what_to_bring: 'medium',
  location_name: 'high',
  coordinates: 'high',
  duration_hours: 'high',
  price_unit: 'medium',
  transportation: 'medium',
};

const PRIORITY_COLOR = {
  critical: 'bg-[var(--danger)]/10 text-[var(--danger)]',
  high: 'bg-[var(--warning)]/10 text-[var(--warning)]',
  medium: 'bg-[var(--ocean)]/10 text-[var(--ocean)]',
};

const PRIORITY_LABEL = {
  critical: 'Критично',
  high: 'Важно',
  medium: 'Желательно',
};

const ScoreBar = ({ score, size = 'md' }: { score: number; size?: 'sm' | 'md' | 'lg' }) => {
  const color = score === 100 ? 'var(--success)' : score >= 80 ? 'var(--warning)' : 'var(--danger)';
  const sizeClass = size === 'sm' ? 'h-1.5' : size === 'lg' ? 'h-3' : 'h-2';
  return (
    <div className={`w-full ${sizeClass} bg-[var(--bg-hover)] rounded-full overflow-hidden`}>
      <div className={sizeClass} style={{ width: `${score}%`, backgroundColor: color, transition: 'width 0.3s' }} />
    </div>
  );
};

interface QuickFillModal {
  open: boolean;
  tourId?: string;
  tourTitle?: string;
  field?: string;
  value: string;
  saving?: boolean;
}

export default function CompletenessClient() {
  const [data, setData] = useState<CompletenessData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedTour, setExpandedTour] = useState<string | null>(null);
  const [quickFill, setQuickFill] = useState<QuickFillModal>({ open: false, value: '' });

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch('/api/operator/completeness');
      const result = await res.json();
      if (!result.success) throw new Error(result.error);
      setData(result.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickFill = (tourId: string, tourTitle: string, field: string) => {
    setQuickFill({ open: true, tourId, tourTitle, field, value: '' });
  };

  const handleSaveQuickFill = async () => {
    if (!quickFill.tourId || !quickFill.field || !quickFill.value.trim()) {
      toast.error('Заполните значение');
      return;
    }

    try {
      setQuickFill(prev => ({ ...prev, saving: true }));
      const res = await fetch('/api/operator/tours/quick-fill', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tourId: quickFill.tourId,
          field: quickFill.field,
          value: quickFill.value,
        }),
      });

      const result = await res.json();
      if (!result.success) throw new Error(result.error);

      toast.success(`${FIELD_LABELS[quickFill.field]} обновлено!`);
      setQuickFill({ open: false, value: '' });
      await fetchData();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Ошибка при сохранении');
    } finally {
      setQuickFill(prev => ({ ...prev, saving: false }));
    }
  };

  const handleAutoFillAI = async (tourId: string, tourTitle: string) => {
    try {
      const loadingToast = toast.loading(`🤖 AI заполняет ${tourTitle}...`);
      const res = await fetch('/api/operator/tours/auto-fill-ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tourId }),
      });

      const result = await res.json();
      if (!result.success) throw new Error(result.error);

      const filled = result.data.filled;
      toast.dismiss(loadingToast);

      if (filled > 0) {
        toast.success(`✨ AI заполнил ${filled} полей!`);
        await fetchData();
      } else {
        toast.error('Нечего заполнять');
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Ошибка AI');
    }
  };

  useEffect(() => {
    void fetchData();
  }, []);

  if (loading) {
    return <div className="p-6"><LoadingSpinner message="Анализ полноты туров..." /></div>;
  }

  if (error) {
    return (
      <div className="p-6">
        <EmptyState
          icon={<AlertTriangle className="w-10 h-10 text-[var(--warning)]" />}
          title="Ошибка"
          description={error}
          action={{ label: 'Повторить', onClick: fetchData }}
        />
      </div>
    );
  }

  if (!data) return null;

  const { stats, tours } = data;

  return (
    <div className="p-5 lg:p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <Zap className="w-4 h-4 text-[var(--text-muted)]" />
          <h1 className="text-sm font-semibold text-[var(--text-primary)] tracking-tight">
            Полнота туров
          </h1>
        </div>
        <button
          onClick={fetchData}
          className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-[var(--text-secondary)] bg-[var(--bg-card)] border border-[var(--border)] rounded-md hover:bg-[var(--bg-hover)] transition-colors"
        >
          <RefreshCw className="w-3 h-3" />
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Average score */}
        <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg p-4">
          <p className="text-[10px] uppercase tracking-widest text-[var(--text-muted)] mb-2">
            Общая полнота
          </p>
          <p className="text-3xl font-bold text-[var(--text-primary)]">{stats.avgTotalScore}%</p>
          <ScoreBar score={stats.avgTotalScore} size="sm" />
        </div>

        {/* Complete tours */}
        <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg p-4">
          <p className="text-[10px] uppercase tracking-widest text-[var(--text-muted)] mb-2">
            100% готовых
          </p>
          <p className="text-3xl font-bold text-[var(--success)]">{stats.fullyComplete}</p>
          <p className="text-xs text-[var(--text-muted)] mt-1">из {stats.totalTours} туров</p>
        </div>

        {/* Critical incomplete */}
        <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg p-4">
          <p className="text-[10px] uppercase tracking-widest text-[var(--text-muted)] mb-2">
            Критично неполные
          </p>
          <p className="text-3xl font-bold text-[var(--danger)]">{stats.criticallyIncomplete}</p>
          <p className="text-xs text-[var(--text-muted)] mt-1">нужна срочная правка</p>
        </div>

        {/* Published */}
        <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg p-4">
          <p className="text-[10px] uppercase tracking-widest text-[var(--text-muted)] mb-2">
            Опубликовано
          </p>
          <p className="text-3xl font-bold text-[var(--ocean)]">{stats.publishedTours}</p>
          <p className="text-xs text-[var(--text-muted)] mt-1">видны туристам</p>
        </div>
      </div>

      {/* Recommendations */}
      {stats.criticallyIncomplete > 0 && (
        <div className="bg-[var(--danger)]/5 border border-[var(--danger)]/20 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-[var(--danger)] flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-[var(--text-primary)] text-sm mb-1">
                {stats.criticallyIncomplete} туров требуют срочного заполнения критических полей
              </p>
              <p className="text-xs text-[var(--text-muted)]">
                Туры без обязательных полей не будут видны туристам и не смогут быть опубликованы
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Tours list */}
      <div className="space-y-2">
        <p className="text-[10px] uppercase tracking-widest text-[var(--text-muted)]">
          Все туры ({tours.length})
        </p>

        {tours.length === 0 ? (
          <EmptyState
            icon={<CheckCircle2 className="w-10 h-10 text-[var(--success)]" />}
            title="Нет туров"
            description="Создайте свой первый тур в разделе Туры"
          />
        ) : (
          <div className="space-y-2">
            {tours.map(tour => (
              <div
                key={tour.tour_id}
                className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg overflow-hidden"
              >
                {/* Summary row */}
                <button
                  onClick={() =>
                    setExpandedTour(expandedTour === tour.tour_id ? null : tour.tour_id)
                  }
                  className="w-full px-4 py-3 flex items-center gap-3 hover:bg-[var(--bg-hover)] transition-colors text-left"
                >
                  {/* Status icon */}
                  {tour.total_score === 100 ? (
                    <CheckCircle2 className="w-5 h-5 text-[var(--success)] flex-shrink-0" />
                  ) : tour.required_score < 100 ? (
                    <AlertCircle className="w-5 h-5 text-[var(--danger)] flex-shrink-0" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-[var(--warning)] flex-shrink-0" />
                  )}

                  {/* Title and meta */}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-[var(--text-primary)] truncate">
                      {tour.tour_title}
                    </p>
                    <p className="text-xs text-[var(--text-muted)] mt-0.5">
                      {tour.is_published ? '✓ Опубликован' : '○ Черновик'}
                    </p>
                  </div>

                  {/* Required score */}
                  <div className="w-24 text-right">
                    <div className="text-sm font-semibold text-[var(--text-primary)]">
                      {tour.total_score}%
                    </div>
                    <ScoreBar score={tour.total_score} size="sm" />
                  </div>

                  {/* Edit link */}
                  <Link
                    href={`/hub/operator/tours/${tour.tour_id}`}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-[var(--text-secondary)] bg-[var(--bg-hover)] rounded hover:bg-[var(--accent)] hover:text-white transition-colors flex-shrink-0"
                  >
                    Редакт.
                  </Link>

                  {/* Expand indicator */}
                  <ChevronDown
                    className={`w-4 h-4 text-[var(--text-muted)] transition-transform ${
                      expandedTour === tour.tour_id ? 'rotate-180' : ''
                    }`}
                  />
                </button>

                {/* Expanded details */}
                {expandedTour === tour.tour_id && (
                  <div className="border-t border-[var(--border)] px-4 py-3 bg-[var(--bg-hover)]/30 space-y-3">
                    {/* Required fields */}
                    {tour.missing_required.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-[var(--danger)] mb-2 flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 bg-[var(--danger)] rounded-full" />
                          Обязательные поля ({tour.missing_required.length})
                        </p>
                        <div className="space-y-1.5 ml-2.5">
                          {tour.missing_required.map(field => (
                            <button
                              key={field}
                              onClick={() => handleQuickFill(tour.tour_id, tour.tour_title, field)}
                              className="group inline-flex items-center gap-1.5 px-2 py-1 bg-[var(--danger)]/10 text-[var(--danger)] rounded text-xs hover:bg-[var(--danger)]/20 transition-colors"
                            >
                              <span>{FIELD_LABELS[field] || field}</span>
                              <ZapIcon className="w-3 h-3 opacity-0 group-hover:opacity-100" />
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Recommended fields */}
                    {tour.missing_recommended.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-[var(--warning)] mb-2 flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 bg-[var(--warning)] rounded-full" />
                          Рекомендуемые поля ({tour.missing_recommended.length})
                        </p>
                        <div className="space-y-1.5 ml-2.5">
                          {tour.missing_recommended.slice(0, 5).map(field => (
                            <button
                              key={field}
                              onClick={() => handleQuickFill(tour.tour_id, tour.tour_title, field)}
                              className="group inline-flex items-center gap-1.5 px-2 py-1 bg-[var(--warning)]/10 text-[var(--warning)] rounded text-xs hover:bg-[var(--warning)]/20 transition-colors"
                            >
                              <span>{FIELD_LABELS[field] || field}</span>
                              <ZapIcon className="w-3 h-3 opacity-0 group-hover:opacity-100" />
                            </button>
                          ))}
                          {tour.missing_recommended.length > 5 && (
                            <div className="text-xs text-[var(--text-muted)] mt-1">
                              +{tour.missing_recommended.length - 5} ещё
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Completion details */}
                    <div className="grid grid-cols-2 gap-3 text-xs pt-2 border-t border-[var(--border)]">
                      <div>
                        <p className="text-[var(--text-muted)] mb-1">Обязательные</p>
                        <ScoreBar score={tour.required_score} size="sm" />
                        <p className="text-[var(--text-primary)] font-semibold mt-1">{tour.required_score}%</p>
                      </div>
                      <div>
                        <p className="text-[var(--text-muted)] mb-1">Рекомендуемые</p>
                        <ScoreBar score={tour.recommended_score} size="sm" />
                        <p className="text-[var(--text-primary)] font-semibold mt-1">{tour.recommended_score}%</p>
                      </div>
                    </div>

                    {/* AI Auto-fill button */}
                    {(tour.missing_required.length > 0 || tour.missing_recommended.length > 0) && (
                      <button
                        onClick={() => handleAutoFillAI(tour.tour_id, tour.tour_title)}
                        className="w-full mt-3 px-3 py-2 text-xs font-medium text-white bg-gradient-to-r from-[var(--accent)] to-[var(--ocean)] rounded hover:opacity-90 transition-opacity flex items-center justify-center gap-1.5"
                      >
                        <ZapIcon className="w-3.5 h-3.5" />
                        Auto-fill AI (заполнить AI)
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quick Fill Modal */}
      {quickFill.open && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg max-w-md w-full p-5 space-y-4">
            {/* Header */}
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-semibold text-[var(--text-primary)]">
                  Заполнить поле
                </p>
                <p className="text-xs text-[var(--text-muted)] mt-0.5">
                  {quickFill.tourTitle}
                </p>
              </div>
              <button
                onClick={() => setQuickFill({ open: false, value: '' })}
                className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Field info */}
            <div className="bg-[var(--bg-hover)] rounded p-3">
              <p className="text-xs uppercase tracking-widest text-[var(--text-muted)] mb-1">
                Поле
              </p>
              <p className="text-sm font-medium text-[var(--text-primary)]">
                {FIELD_LABELS[quickFill.field!] || quickFill.field}
              </p>
            </div>

            {/* Input */}
            <div>
              <label className="text-xs uppercase tracking-widest text-[var(--text-muted)] block mb-2">
                Значение
              </label>
              {quickFill.field === 'base_price' || quickFill.field === 'price_old' ? (
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={quickFill.value}
                  onChange={e => setQuickFill(prev => ({ ...prev, value: e.target.value }))}
                  placeholder="0.00"
                  className="w-full px-3 py-2 text-sm bg-[var(--bg-primary)] border border-[var(--border)] rounded text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
                  disabled={quickFill.saving}
                />
              ) : quickFill.field === 'duration_hours' ? (
                <input
                  type="number"
                  min="0"
                  step="0.5"
                  value={quickFill.value}
                  onChange={e => setQuickFill(prev => ({ ...prev, value: e.target.value }))}
                  placeholder="1.0"
                  className="w-full px-3 py-2 text-sm bg-[var(--bg-primary)] border border-[var(--border)] rounded text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
                  disabled={quickFill.saving}
                />
              ) : quickFill.field?.includes('date') || quickFill.field === 'season_start' || quickFill.field === 'season_end' ? (
                <input
                  type="date"
                  value={quickFill.value}
                  onChange={e => setQuickFill(prev => ({ ...prev, value: e.target.value }))}
                  className="w-full px-3 py-2 text-sm bg-[var(--bg-primary)] border border-[var(--border)] rounded text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
                  disabled={quickFill.saving}
                />
              ) : (
                <textarea
                  value={quickFill.value}
                  onChange={e => setQuickFill(prev => ({ ...prev, value: e.target.value }))}
                  placeholder="Введите значение..."
                  rows={3}
                  className="w-full px-3 py-2 text-sm bg-[var(--bg-primary)] border border-[var(--border)] rounded text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)] resize-none"
                  disabled={quickFill.saving}
                />
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setQuickFill({ open: false, value: '' })}
                disabled={quickFill.saving}
                className="flex-1 px-3 py-2 text-sm text-[var(--text-secondary)] bg-[var(--bg-hover)] rounded hover:bg-[var(--bg-primary)] transition-colors disabled:opacity-50"
              >
                Отмена
              </button>
              <button
                onClick={handleSaveQuickFill}
                disabled={quickFill.saving}
                className="flex-1 px-3 py-2 text-sm text-white bg-[var(--accent)] rounded hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                {quickFill.saving ? (
                  <>
                    <div className="w-3 h-3 border-2 border-[rgba(255,255,255,0.3)] border-t-white rounded-full animate-spin" />
                    Сохранение...
                  </>
                ) : (
                  'Сохранить'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
