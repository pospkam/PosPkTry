'use client';

import { useState, useCallback } from 'react';
import useSWR from 'swr';
import {
  Brain, Zap, FileText, CheckCircle, Clock, AlertCircle,
  Phone, MessageSquare, Download, ArrowLeft, User,
  TrendingUp, TrendingDown, Target, RefreshCw, Send,
  MapPin, Calendar, Users, Wallet, ExternalLink,
} from 'lucide-react';

// ── Типы ──────────────────────────────────────────────────────────────────────

interface Lead {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  comment: string | null;
  route_id: string | null;
  route_title: string | null;
  source_url: string | null;
  source_data: Record<string, unknown> | null;
  status: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

interface MatchedTour {
  id: string;
  title: string;
  price: number;
  duration_days: number;
  activity_type: string;
  description: string;
  match_reason: string;
}

interface AdversarialVerdict {
  bullSignals: string[];
  bearRisks: string[];
  conversionProb: number;
  recommendedAction: 'call_immediately' | 'send_proposal' | 'nurture' | 'skip';
  callStrategy: string;
  urgency: 'hot' | 'warm' | 'cold';
}

interface LeadIntent {
  activity_types: string[];
  group_size: number;
  budget_rub: number | null;
  desired_dates: string | null;
  duration_days: number | null;
  interests: string[];
  urgency: 'low' | 'medium' | 'high';
  qualification_notes: string;
}

interface Proposal {
  lead_id: string;
  proposal_id: string;
  headline: string;
  summary: string;
  highlights: string[];
  price_from: number | null;
  price_to: number | null;
  duration_days: number | null;
  primary_tour: MatchedTour | null;
  alt_tours: MatchedTour[];
  ai_score: number;
  intent: LeadIntent;
  generation_ms: number;
  adversarial?: AdversarialVerdict;
}

// ── Хелперы ───────────────────────────────────────────────────────────────────

const fetcher = (url: string) => fetch(url).then(r => {
  if (!r.ok) throw new Error(String(r.status));
  return r.json();
});

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  new:              { label: 'Новый',                color: 'text-[var(--ocean)] bg-[var(--ocean)]/10' },
  ai_processing:    { label: 'AI обрабатывает',      color: 'text-[var(--warning)] bg-[var(--warning)]/10' },
  ai_qualified:     { label: 'AI квалифицирован',    color: 'text-[var(--success)] bg-[var(--success)]/10' },
  proposal_sent:    { label: 'Предложение отправлено',color: 'text-[var(--accent)] bg-[var(--accent)]/10' },
  awaiting_confirm: { label: 'Ждёт подтверждения',   color: 'text-[var(--warning)] bg-[var(--warning)]/10' },
  contacted:        { label: 'Контакт установлен',   color: 'text-[var(--ocean)] bg-[var(--ocean)]/10' },
  qualified:        { label: 'Квалифицирован',        color: 'text-[var(--success)] bg-[var(--success)]/10' },
  converted:        { label: 'Конвертирован',         color: 'text-[var(--success)] bg-[var(--success)]/10' },
  lost:             { label: 'Потерян',               color: 'text-[var(--text-muted)] bg-[var(--bg-hover)]' },
};

const URGENCY_CONFIG = {
  hot:  { label: 'Горячий', color: 'text-[var(--danger)] bg-[var(--danger)]/10' },
  warm: { label: 'Тёплый',  color: 'text-[var(--warning)] bg-[var(--warning)]/10' },
  cold: { label: 'Холодный',color: 'text-[var(--text-muted)] bg-[var(--bg-hover)]' },
};

const ACTION_CONFIG = {
  call_immediately: { label: 'Позвонить немедленно', color: 'text-[var(--danger)]' },
  send_proposal:    { label: 'Отправить предложение', color: 'text-[var(--success)]' },
  nurture:          { label: 'Прогревать',            color: 'text-[var(--warning)]' },
  skip:             { label: 'Пропустить',            color: 'text-[var(--text-muted)]' },
};

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] ?? { label: status, color: 'text-[var(--text-muted)] bg-[var(--bg-hover)]' };
  return (
    <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${cfg.color}`}>
      {cfg.label}
    </span>
  );
}

function ScoreMeter({ score }: { score: number }) {
  const color = score >= 80 ? 'bg-[var(--success)]' : score >= 50 ? 'bg-[var(--warning)]' : 'bg-[var(--danger)]';
  const textColor = score >= 80 ? 'text-[var(--success)]' : score >= 50 ? 'text-[var(--warning)]' : 'text-[var(--danger)]';
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-2 rounded-full bg-[var(--bg-hover)] overflow-hidden">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${score}%` }} />
      </div>
      <span className={`text-2xl font-bold tabular-nums ${textColor}`}>{score}<span className="text-sm font-normal text-[var(--text-muted)]">/100</span></span>
    </div>
  );
}

// ── Главный компонент ──────────────────────────────────────────────────────────

interface Props {
  leadId: string;
}

export default function LeadDetailClient({ leadId }: Props) {
  const [processingAI, setProcessingAI] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [sendingProposal, setSendingProposal] = useState(false);
  const [notes, setNotes] = useState('');
  const [notesEditing, setNotesEditing] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const { data: leadData, error: leadError, isLoading: leadLoading, mutate: mutateLead } =
    useSWR<{ lead: Lead }>(`/api/leads/${leadId}`, fetcher);

  const { data: proposalData, error: proposalError, mutate: mutateProposal } =
    useSWR<{ proposal: Proposal }>(`/api/leads/${leadId}/proposal`, fetcher, {
      onSuccess: (d) => { if (!notesEditing) setNotes(d.proposal ? '' : ''); },
    });

  const lead = leadData?.lead;
  const proposal = proposalData?.proposal;

  const canProcess = lead ? ['new', 'contacted', 'qualified'].includes(lead.status) : false;

  const showNotification = (type: 'success' | 'error', text: string) => {
    setNotification({ type, text });
    setTimeout(() => setNotification(null), 5000);
  };

  const handleProcess = useCallback(async () => {
    setProcessingAI(true);
    try {
      const res = await fetch('/api/leads/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lead_id: leadId }),
      });
      const json = await res.json() as { success?: boolean; error?: string; headline?: string; ai_score?: number; generation_ms?: number };
      if (!res.ok) throw new Error(json.error ?? 'Ошибка обработки');
      showNotification('success', `Готово за ${((json.generation_ms ?? 0) / 1000).toFixed(1)} сек — "${json.headline}" (скор ${json.ai_score}/100)`);
      mutateLead();
      mutateProposal();
    } catch (err) {
      showNotification('error', err instanceof Error ? err.message : 'Ошибка');
    } finally {
      setProcessingAI(false);
    }
  }, [leadId, mutateLead, mutateProposal]);

  const handleStatusChange = useCallback(async (status: string) => {
    setUpdatingStatus(true);
    try {
      const res = await fetch(`/api/leads/${leadId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      const json = await res.json() as { success?: boolean; error?: string };
      if (!res.ok) throw new Error(json.error ?? 'Ошибка');
      showNotification('success', `Статус изменён`);
      mutateLead();
    } catch (err) {
      showNotification('error', err instanceof Error ? err.message : 'Ошибка');
    } finally {
      setUpdatingStatus(false);
    }
  }, [leadId, mutateLead]);

  const handleSendProposal = useCallback(async () => {
    setSendingProposal(true);
    try {
      const res = await fetch(`/api/leads/${leadId}/proposal/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channel: 'both' }),
      });
      const json = await res.json() as { success?: boolean; error?: string; message?: string };
      if (!res.ok) throw new Error(json.error ?? 'Ошибка отправки');
      showNotification('success', json.message ?? 'Предложение отправлено клиенту');
      mutateLead();
    } catch (err) {
      showNotification('error', err instanceof Error ? err.message : 'Ошибка');
    } finally {
      setSendingProposal(false);
    }
  }, [leadId, mutateLead]);

  const handleSaveNotes = useCallback(async () => {
    try {
      const res = await fetch(`/api/leads/${leadId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes }),
      });
      if (!res.ok) throw new Error('Ошибка сохранения');
      showNotification('success', 'Заметки сохранены');
      setNotesEditing(false);
      mutateLead();
    } catch (err) {
      showNotification('error', err instanceof Error ? err.message : 'Ошибка');
    }
  }, [leadId, notes, mutateLead]);

  if (leadLoading) {
    return (
      <div className="ds-page">
        <div className="ds-section space-y-4">
          {[1, 2, 3].map(i => <div key={i} className="ds-skeleton h-24 rounded-lg" />)}
        </div>
      </div>
    );
  }

  if (leadError || !lead) {
    return (
      <div className="ds-page">
        <div className="ds-section">
          <div className="ds-card p-12 text-center flex flex-col items-center gap-3">
            <AlertCircle className="w-10 h-10 text-[var(--danger)]" />
            <p className="text-[var(--text-muted)]">Лид не найден или недоступен</p>
            <a href="/hub/operator/leads" className="ds-btn gap-1.5 text-sm mt-2">
              <ArrowLeft className="w-4 h-4" />
              Назад к списку
            </a>
          </div>
        </div>
      </div>
    );
  }

  const createdDate = new Date(lead.created_at).toLocaleString('ru-RU', {
    day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit',
  });

  return (
    <div className="ds-page">
      <div className="ds-section max-w-3xl mx-auto space-y-5">

        {/* Хлебные крошки */}
        <a href="/hub/operator/leads" className="inline-flex items-center gap-1.5 text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors">
          <ArrowLeft className="w-4 h-4" />
          AI Lead Processor
        </a>

        {/* Заголовок */}
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="ds-h1 flex items-center gap-2">
              <User className="w-6 h-6 text-[var(--accent)]" />
              {lead.name}
            </h1>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <StatusBadge status={lead.status} />
              <span className="text-xs text-[var(--text-muted)] flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {createdDate}
              </span>
            </div>
          </div>

          {/* Кнопка AI-обработки */}
          {canProcess && (
            <button
              onClick={handleProcess}
              disabled={processingAI}
              className="ds-btn-primary gap-2"
              aria-label="Запустить AI-обработку"
            >
              {processingAI ? (
                <><RefreshCw className="w-4 h-4 animate-spin" />Обрабатываю...</>
              ) : (
                <><Zap className="w-4 h-4" />AI-обработать</>
              )}
            </button>
          )}
        </div>

        {/* Уведомление */}
        {notification && (
          <div className={`flex items-start gap-2 p-3 rounded-lg text-sm ${
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

        {/* Контактная информация */}
        <div className="ds-card p-5 space-y-3">
          <h2 className="ds-h2 text-base">Контакт</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <a
              href={`tel:${lead.phone}`}
              className="flex items-center gap-2 text-[var(--ocean)] hover:underline font-medium"
            >
              <Phone className="w-4 h-4 shrink-0" />
              {lead.phone}
            </a>
            {lead.email && (
              <a
                href={`mailto:${lead.email}`}
                className="flex items-center gap-2 text-[var(--ocean)] hover:underline"
              >
                <Send className="w-4 h-4 shrink-0" />
                {lead.email}
              </a>
            )}
          </div>
          {lead.route_title && (
            <div className="flex items-start gap-2 text-sm text-[var(--text-secondary)]">
              <MapPin className="w-4 h-4 shrink-0 mt-0.5 text-[var(--accent)]" />
              <span>Интерес: <strong>{lead.route_title}</strong></span>
            </div>
          )}
          {lead.comment && (
            <div className="flex items-start gap-2 text-sm text-[var(--text-secondary)]">
              <MessageSquare className="w-4 h-4 shrink-0 mt-0.5" />
              <p className="leading-relaxed">{lead.comment}</p>
            </div>
          )}
          {lead.source_url && (
            <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
              <ExternalLink className="w-3 h-3" />
              <span>Источник: {lead.source_url}</span>
            </div>
          )}
        </div>

        {/* AI Предложение */}
        {proposal ? (
          <div className="ds-card p-5 space-y-5">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <h2 className="ds-h2 text-base flex items-center gap-2">
                <Brain className="w-5 h-5 text-[var(--accent)]" />
                AI-предложение
              </h2>
              <div className="flex items-center gap-2">
                {lead?.status !== 'proposal_sent' && lead?.status !== 'converted' && (
                  <button
                    onClick={handleSendProposal}
                    disabled={sendingProposal}
                    className="ds-btn-primary text-xs gap-1.5"
                    aria-label="Отправить клиенту"
                  >
                    {sendingProposal ? (
                      <><RefreshCw className="w-3.5 h-3.5 animate-spin" />Отправляю...</>
                    ) : (
                      <><Send className="w-3.5 h-3.5" />Отправить клиенту</>
                    )}
                  </button>
                )}
                <a
                  href={`/api/leads/${leadId}/proposal/pdf`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ds-btn text-xs gap-1.5"
                  aria-label="Скачать PDF"
                >
                  <Download className="w-3.5 h-3.5" />
                  PDF
                </a>
              </div>
            </div>

            {/* Заголовок и скор */}
            <div className="space-y-2">
              <p className="font-semibold text-lg text-[var(--text-primary)]" style={{ fontFamily: 'var(--font-playfair)' }}>
                {proposal.headline}
              </p>
              <ScoreMeter score={proposal.ai_score} />
            </div>

            {/* Параметры */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {proposal.intent.group_size > 0 && (
                <div className="flex flex-col gap-0.5">
                  <span className="text-xs text-[var(--text-muted)] flex items-center gap-1">
                    <Users className="w-3 h-3" />Группа
                  </span>
                  <span className="font-semibold text-[var(--text-primary)]">{proposal.intent.group_size} чел.</span>
                </div>
              )}
              {proposal.price_from && (
                <div className="flex flex-col gap-0.5">
                  <span className="text-xs text-[var(--text-muted)] flex items-center gap-1">
                    <Wallet className="w-3 h-3" />Бюджет
                  </span>
                  <span className="font-semibold text-[var(--text-primary)]">
                    от {proposal.price_from.toLocaleString('ru-RU')} ₽
                  </span>
                </div>
              )}
              {proposal.duration_days && (
                <div className="flex flex-col gap-0.5">
                  <span className="text-xs text-[var(--text-muted)] flex items-center gap-1">
                    <Calendar className="w-3 h-3" />Дней
                  </span>
                  <span className="font-semibold text-[var(--text-primary)]">{proposal.duration_days}</span>
                </div>
              )}
              {proposal.intent.desired_dates && (
                <div className="flex flex-col gap-0.5">
                  <span className="text-xs text-[var(--text-muted)]">Даты</span>
                  <span className="font-medium text-[var(--text-primary)] text-sm">{proposal.intent.desired_dates}</span>
                </div>
              )}
            </div>

            {/* Резюме */}
            <p className="text-sm text-[var(--text-secondary)] leading-relaxed">{proposal.summary}</p>

            {/* Ключевые аргументы */}
            {proposal.highlights.length > 0 && (
              <ul className="space-y-1.5">
                {proposal.highlights.map((h, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-[var(--text-secondary)]">
                    <CheckCircle className="w-3.5 h-3.5 text-[var(--success)] shrink-0 mt-0.5" />
                    {h}
                  </li>
                ))}
              </ul>
            )}

            {/* Туры */}
            {(proposal.primary_tour || proposal.alt_tours.length > 0) && (
              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-[var(--text-primary)]">Подобранные туры</h3>
                {[proposal.primary_tour, ...proposal.alt_tours].filter(Boolean).map((tour, i) => (
                  <div key={tour!.id} className={`p-3 rounded-lg border ${i === 0 ? 'border-[var(--accent)]/30 bg-[var(--accent)]/5' : 'border-[var(--border)]'}`}>
                    <div className="flex items-start justify-between gap-2 flex-wrap">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          {i === 0 && <span className="text-xs font-semibold text-[var(--accent)] uppercase tracking-wide">Основной</span>}
                          <span className="font-medium text-[var(--text-primary)] text-sm">{tour!.title}</span>
                        </div>
                        <p className="text-xs text-[var(--text-muted)] mt-0.5">{tour!.match_reason}</p>
                      </div>
                      <span className="font-bold text-[var(--text-primary)] whitespace-nowrap">
                        {tour!.price.toLocaleString('ru-RU')} ₽/чел
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Интересы */}
            {proposal.intent.interests.length > 0 && (
              <div>
                <span className="text-xs text-[var(--text-muted)] block mb-1.5">Интересы клиента</span>
                <div className="flex flex-wrap gap-1.5">
                  {proposal.intent.interests.map(interest => (
                    <span key={interest} className="px-2 py-0.5 rounded-full text-xs bg-[var(--ocean)]/10 text-[var(--ocean)]">
                      {interest}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Adversarial анализ */}
            {proposal.adversarial && (
              <div className="border-t border-[var(--border)] pt-4 space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <h3 className="text-sm font-semibold text-[var(--text-primary)] flex items-center gap-1.5">
                    <Target className="w-4 h-4 text-[var(--accent)]" />
                    Adversarial-анализ
                  </h3>
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${URGENCY_CONFIG[proposal.adversarial.urgency]?.color ?? ''}`}>
                      {URGENCY_CONFIG[proposal.adversarial.urgency]?.label}
                    </span>
                    <span className="text-sm font-bold text-[var(--text-primary)]">
                      {Math.round(proposal.adversarial.conversionProb * 100)}% конверсия
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <span className="text-xs font-medium text-[var(--success)] flex items-center gap-1">
                      <TrendingUp className="w-3 h-3" />Факторы «за»
                    </span>
                    {proposal.adversarial.bullSignals.map((s, i) => (
                      <p key={i} className="text-xs text-[var(--text-secondary)]">• {s}</p>
                    ))}
                  </div>
                  <div className="space-y-1">
                    <span className="text-xs font-medium text-[var(--danger)] flex items-center gap-1">
                      <TrendingDown className="w-3 h-3" />Риски
                    </span>
                    {proposal.adversarial.bearRisks.map((r, i) => (
                      <p key={i} className="text-xs text-[var(--text-secondary)]">• {r}</p>
                    ))}
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-[var(--bg-hover)] text-sm text-[var(--text-secondary)] leading-relaxed">
                  <span className={`font-semibold ${ACTION_CONFIG[proposal.adversarial.recommendedAction]?.color ?? ''}`}>
                    {ACTION_CONFIG[proposal.adversarial.recommendedAction]?.label}:
                  </span>{' '}
                  {proposal.adversarial.callStrategy}
                </div>
              </div>
            )}

            <p className="text-xs text-[var(--text-muted)] text-right">
              Сгенерировано за {(proposal.generation_ms / 1000).toFixed(1)} сек
            </p>
          </div>
        ) : !proposalError ? (
          canProcess ? (
            <div className="ds-card p-8 text-center flex flex-col items-center gap-3">
              <Brain className="w-10 h-10 text-[var(--text-muted)] opacity-30" />
              <p className="text-[var(--text-muted)] text-sm">
                AI-предложение не сформировано.<br />Нажмите «AI-обработать» выше.
              </p>
            </div>
          ) : null
        ) : null}

        {/* Смена статуса */}
        <div className="ds-card p-5 space-y-3">
          <h2 className="ds-h2 text-base">Статус и действия</h2>
          <div className="flex flex-wrap gap-2">
            {['contacted', 'qualified', 'proposal_sent', 'converted', 'lost'].map(s => (
              <button
                key={s}
                onClick={() => handleStatusChange(s)}
                disabled={updatingStatus || lead.status === s}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors border ${
                  lead.status === s
                    ? 'border-[var(--accent)] text-[var(--accent)] bg-[var(--accent)]/10 cursor-default'
                    : 'border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--accent)] hover:text-[var(--accent)] bg-[var(--bg-card)]'
                }`}
              >
                {STATUS_CONFIG[s]?.label ?? s}
              </button>
            ))}
          </div>
        </div>

        {/* Заметки оператора */}
        <div className="ds-card p-5 space-y-3">
          <h2 className="ds-h2 text-base flex items-center gap-2">
            <FileText className="w-4 h-4" />
            Заметки
          </h2>
          {notesEditing ? (
            <div className="space-y-2">
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                rows={4}
                className="ds-input w-full resize-none"
                placeholder="Заметки оператора..."
                autoFocus
              />
              <div className="flex gap-2">
                <button onClick={handleSaveNotes} className="ds-btn-primary text-sm gap-1.5">
                  <CheckCircle className="w-4 h-4" />
                  Сохранить
                </button>
                <button onClick={() => { setNotesEditing(false); setNotes(lead.notes ?? ''); }} className="ds-btn text-sm">
                  Отмена
                </button>
              </div>
            </div>
          ) : (
            <div
              onClick={() => { setNotes(lead.notes ?? ''); setNotesEditing(true); }}
              className="min-h-[60px] p-3 rounded-lg border border-[var(--border)] cursor-text hover:border-[var(--accent)]/50 transition-colors text-sm text-[var(--text-secondary)]"
            >
              {lead.notes || <span className="text-[var(--text-muted)] italic">Нажмите для добавления заметок...</span>}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
