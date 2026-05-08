'use client';

import { useState, useCallback } from 'react';
import useSWR from 'swr';
import {
  Brain, Zap, FileText, CheckCircle, Clock,
  AlertCircle, User, Phone, MessageSquare, Download,
  ChevronRight, BarChart2, Filter, RefreshCw,
} from 'lucide-react';

// ── Типы ──────────────────────────────────────────────────────────────────────

interface Lead {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  comment: string | null;
  route_title: string | null;
  status: string;
  ai_score: number | null;
  ai_summary: string | null;
  group_size: number | null;
  budget_rub: number | null;
  desired_dates: string | null;
  proposal_id: string | null;
  created_at: string;
  updated_at: string;
}

interface LeadsResponse {
  leads: Lead[];
  total: number;
}

// ── Хелперы ───────────────────────────────────────────────────────────────────

const fetcher = (url: string) => fetch(url).then(r => r.json());

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  new:              { label: 'Новый',           color: 'text-[var(--ocean)] bg-[var(--ocean)]/10' },
  ai_processing:    { label: 'AI обрабатывает', color: 'text-[var(--warning)] bg-[var(--warning)]/10' },
  ai_qualified:     { label: 'AI квалифицирован',color: 'text-[var(--success)] bg-[var(--success)]/10' },
  proposal_sent:    { label: 'Предложение отправлено', color: 'text-[var(--accent)] bg-[var(--accent)]/10' },
  awaiting_confirm: { label: 'Ждёт подтверждения', color: 'text-[var(--warning)] bg-[var(--warning)]/10' },
  contacted:        { label: 'Контакт установлен', color: 'text-[var(--ocean)] bg-[var(--ocean)]/10' },
  qualified:        { label: 'Квалифицирован',   color: 'text-[var(--success)] bg-[var(--success)]/10' },
  converted:        { label: 'Конвертирован',    color: 'text-[var(--success)] bg-[var(--success)]/10' },
  lost:             { label: 'Потерян',          color: 'text-[var(--text-muted)] bg-[var(--bg-hover)]' },
};

const FILTER_OPTIONS = [
  { value: 'all',           label: 'Все' },
  { value: 'new',           label: 'Новые' },
  { value: 'ai_qualified',  label: 'AI готово' },
  { value: 'proposal_sent', label: 'Отправлено' },
  { value: 'converted',     label: 'Конвертированы' },
];

function ScoreBadge({ score }: { score: number | null }) {
  if (score === null) return null;
  const color = score >= 80
    ? 'text-[var(--success)] bg-[var(--success)]/10'
    : score >= 50
    ? 'text-[var(--warning)] bg-[var(--warning)]/10'
    : 'text-[var(--text-muted)] bg-[var(--bg-hover)]';
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${color}`}>
      <Brain className="w-3 h-3" />
      {score}
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] ?? { label: status, color: 'text-[var(--text-muted)] bg-[var(--bg-hover)]' };
  return (
    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${cfg.color}`}>
      {cfg.label}
    </span>
  );
}

// ── Строка лида ───────────────────────────────────────────────────────────────

interface LeadRowProps {
  lead: Lead;
  onProcess: (id: string) => void;
  processing: boolean;
}

function LeadRow({ lead, onProcess, processing }: LeadRowProps) {
  const date = new Date(lead.created_at).toLocaleDateString('ru-RU', {
    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
  });

  const canProcess = ['new', 'contacted', 'qualified'].includes(lead.status);
  const hasProposal = !!lead.proposal_id;

  return (
    <a href={`/hub/operator/leads/${lead.id}`} className="ds-card p-4 flex flex-col sm:flex-row sm:items-center gap-3 hover:bg-[var(--bg-hover)] transition-colors block">
      {/* Основные данные */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap mb-1">
          <span className="font-medium text-[var(--text-primary)]">{lead.name}</span>
          <StatusBadge status={lead.status} />
          {lead.ai_score !== null && <ScoreBadge score={lead.ai_score} />}
        </div>

        <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-[var(--text-muted)]">
          <span className="flex items-center gap-1">
            <Phone className="w-3 h-3" />
            {lead.phone}
          </span>
          {lead.route_title && (
            <span className="flex items-center gap-1">
              <ChevronRight className="w-3 h-3" />
              {lead.route_title}
            </span>
          )}
          {lead.group_size && lead.group_size > 1 && (
            <span>{lead.group_size} чел.</span>
          )}
          {lead.budget_rub && (
            <span>до {lead.budget_rub.toLocaleString('ru-RU')} ₽</span>
          )}
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {date}
          </span>
        </div>

        {lead.ai_summary && (
          <p className="mt-1 text-xs text-[var(--text-muted)] line-clamp-1">{lead.ai_summary}</p>
        )}
        {!lead.ai_summary && lead.comment && (
          <p className="mt-1 text-xs text-[var(--text-muted)] line-clamp-1 italic">{lead.comment}</p>
        )}
      </div>

      {/* Действия */}
      <div className="flex items-center gap-2 shrink-0" onClick={e => e.preventDefault()}>
        {hasProposal && (
          <a
            href={`/api/leads/${lead.id}/proposal/pdf`}
            target="_blank"
            rel="noopener noreferrer"
            className="ds-btn text-xs gap-1 border border-[var(--border)] "
            aria-label="Скачать PDF предложения"
          >
            <Download className="w-3.5 h-3.5" />
            PDF
          </a>
        )}

        {canProcess ? (
          <button
            onClick={() => onProcess(lead.id)}
            disabled={processing}
            className="ds-btn-primary text-xs gap-1.5 min-w-[140px] justify-center"
            aria-label="Запустить AI-обработку лида"
          >
            {processing ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                Обрабатываю...
              </>
            ) : (
              <>
                <Zap className="w-3.5 h-3.5" />
                AI-обработать
              </>
            )}
          </button>
        ) : hasProposal ? (
          <span className="flex items-center gap-1 text-xs text-[var(--success)]">
            <CheckCircle className="w-3.5 h-3.5" />
            Предложение готово
          </span>
        ) : null}
      </div>
    </a>
  );
}

// ── Главный компонент ──────────────────────────────────────────────────────────

export default function LeadsClient() {
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const { data, error, isLoading, mutate } = useSWR<LeadsResponse>(
    `/api/leads?status=${statusFilter}&limit=50`,
    fetcher,
    { refreshInterval: 30000 }
  );

  const handleProcess = useCallback(async (leadId: string) => {
    setProcessingId(leadId);
    setNotification(null);
    try {
      const res = await fetch('/api/leads/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lead_id: leadId }),
      });
      const json = await res.json() as { success?: boolean; error?: string; headline?: string; ai_score?: number; generation_ms?: number };
      if (!res.ok) throw new Error(json.error ?? 'Ошибка обработки');

      setNotification({
        type: 'success',
        text: `Готово за ${((json.generation_ms ?? 0) / 1000).toFixed(1)} сек — "${json.headline}" (скор ${json.ai_score}/100)`,
      });
      mutate();
    } catch (err) {
      setNotification({
        type: 'error',
        text: err instanceof Error ? err.message : 'Ошибка',
      });
    } finally {
      setProcessingId(null);
    }
  }, [mutate]);

  const leads = data?.leads ?? [];
  const total  = data?.total ?? 0;

  // Статистика
  const stats = {
    new:       leads.filter(l => l.status === 'new').length,
    qualified: leads.filter(l => ['ai_qualified', 'qualified'].includes(l.status)).length,
    converted: leads.filter(l => l.status === 'converted').length,
    withScore: leads.filter(l => l.ai_score !== null).length,
  };

  return (
    <div className="ds-page">
      <div className="ds-section">
        <div className="flex items-start justify-between gap-4 flex-wrap mb-6">
          <div>
            <h1 className="ds-h1 flex items-center gap-2">
              <Brain className="w-7 h-7 text-[var(--accent)]" />
              AI Lead Processor
            </h1>
            <p className="text-[var(--text-muted)] text-sm mt-1">
              Входящие заявки → AI-квалификация → персональное предложение за 15 сек
            </p>
          </div>
          <button
            onClick={() => mutate()}
            className="ds-btn gap-1.5 text-sm"
            aria-label="Обновить список"
          >
            <RefreshCw className="w-4 h-4" />
            Обновить
          </button>
        </div>

        {/* Статы */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          {[
            { label: 'Новых',          value: stats.new,       icon: MessageSquare, color: 'text-[var(--ocean)]' },
            { label: 'Квалифицировано',value: stats.qualified, icon: Brain,         color: 'text-[var(--success)]' },
            { label: 'Конвертировано', value: stats.converted, icon: CheckCircle,   color: 'text-[var(--accent)]' },
            { label: 'AI обработано',  value: stats.withScore, icon: BarChart2,     color: 'text-[var(--warning)]' },
          ].map(s => (
            <div key={s.label} className="ds-card p-3 flex items-center gap-3">
              <s.icon className={`w-5 h-5 ${s.color} shrink-0`} />
              <div>
                <div className="text-xl font-bold text-[var(--text-primary)]">{s.value}</div>
                <div className="text-xs text-[var(--text-muted)]">{s.label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Уведомление */}
        {notification && (
          <div className={`flex items-start gap-2 p-3 rounded-lg mb-4 text-sm ${
            notification.type === 'success'
              ? 'bg-[var(--success)]/10 text-[var(--success)]'
              : 'bg-[var(--danger)]/10 text-[var(--danger)]'
          }`}>
            {notification.type === 'success'
              ? <CheckCircle className="w-4 h-4 shrink-0 mt-0.5" />
              : <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />}
            {notification.text}
          </div>
        )}

        {/* Фильтр */}
        <div className="flex items-center gap-2 mb-4 flex-wrap">
          <Filter className="w-4 h-4 text-[var(--text-muted)]" />
          {FILTER_OPTIONS.map(opt => (
            <button
              key={opt.value}
              onClick={() => setStatusFilter(opt.value)}
              className={`px-3 py-1 rounded-full text-sm transition-colors ${
                statusFilter === opt.value
                  ? 'bg-[var(--accent)] text-white'
                  : 'ds-btn text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              {opt.label}
            </button>
          ))}
          <span className="ml-auto text-xs text-[var(--text-muted)]">{total} лидов</span>
        </div>

        {/* Список */}
        {isLoading && (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="ds-skeleton h-20 rounded-lg" />
            ))}
          </div>
        )}

        {error && (
          <div className="ds-card p-6 text-center text-[var(--danger)] flex flex-col items-center gap-2">
            <AlertCircle className="w-8 h-8" />
            <span>Не удалось загрузить лиды</span>
          </div>
        )}

        {!isLoading && !error && leads.length === 0 && (
          <div className="ds-card p-12 text-center text-[var(--text-muted)] flex flex-col items-center gap-3">
            <User className="w-10 h-10 opacity-30" />
            <span>Нет лидов{statusFilter !== 'all' ? ' с таким фильтром' : ''}</span>
          </div>
        )}

        {!isLoading && leads.length > 0 && (
          <div className="space-y-2">
            {leads.map(lead => (
              <LeadRow
                key={lead.id}
                lead={lead}
                onProcess={handleProcess}
                processing={processingId === lead.id}
              />
            ))}
          </div>
        )}

        {/* Подсказка */}
        {!isLoading && leads.some(l => l.status === 'new') && (
          <div className="mt-4 flex items-start gap-2 p-3 rounded-lg bg-[var(--ocean)]/5 border border-[var(--ocean)]/20 text-sm">
            <FileText className="w-4 h-4 text-[var(--ocean)] shrink-0 mt-0.5" />
            <span className="text-[var(--text-secondary)]">
              Нажмите <strong>AI-обработать</strong> — система за ~15 сек квалифицирует заявку,
              подберёт туры и сформирует PDF-предложение. Telegram-уведомление отправится автоматически.
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
