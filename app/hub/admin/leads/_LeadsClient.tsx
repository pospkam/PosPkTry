'use client';

import { useState, useEffect, useCallback } from 'react';
import { Phone, MessageSquare, Clock, ChevronDown, ChevronUp, Copy, Check, RefreshCw, Search, MapPin, Calendar } from 'lucide-react';

type LeadStatus = 'new' | 'contacted' | 'qualified' | 'converted' | 'lost';

interface LeadSourceData {
  source?: string;
  interests?: string[];
  date_from?: string;
  date_to?: string;
  arrival?: string;
  departure?: string;
  trip_days?: number;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  referrer?: string;
  followup_count?: number;
  notified_operators?: string[];
  escalated_to_admin?: boolean;
}

interface Lead {
  id: string;
  name: string;
  phone: string;
  comment: string | null;
  route_title: string | null;
  source_url: string | null;
  source_data: LeadSourceData | null;
  status: LeadStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

const STATUS_META: Record<LeadStatus, { label: string; color: string }> = {
  new:        { label: 'Новый',          color: 'bg-[var(--ocean)]/10 text-[var(--ocean)]' },
  contacted:  { label: 'Позвонили',      color: 'bg-[var(--warning)]/10 text-[var(--warning)]' },
  qualified:  { label: 'Квалифицирован', color: 'bg-[var(--accent)]/10 text-[var(--accent)]' },
  converted:  { label: 'Сделка',         color: 'bg-[var(--success)]/10 text-[var(--success)]' },
  lost:       { label: 'Отказ',          color: 'bg-[var(--danger)]/10 text-[var(--danger)]' },
};

const SOURCE_LABELS: Record<string, string> = {
  telegram_bot:  'Телеграм-бот',
  trip_planner:  'TripPlanner',
  website:       'Сайт',
};

const INTEREST_LABELS: Record<string, string> = {
  volcano:      'Вулкан',
  trekking:     'Треккинг',
  fishing:      'Рыбалка',
  thermal:      'Термальный',
  helicopter:   'Вертолёт',
  boat_trip:    'Море',
  snowmobile:   'Снегоходы',
  skiing:       'Лыжи',
  diving:       'Дайвинг',
  kayak:        'Байдарки',
  photography:  'Фото',
  birdwatching: 'Орнитология',
  horseback:    'Конный',
  other:        'Другое',
};

const TABS: Array<{ key: LeadStatus | 'all'; label: string }> = [
  { key: 'all',       label: 'Все' },
  { key: 'new',       label: 'Новые' },
  { key: 'contacted', label: 'Звонок' },
  { key: 'qualified', label: 'Квалифицирован' },
  { key: 'converted', label: 'Сделка' },
  { key: 'lost',      label: 'Отказ' },
];

const PAGE_SIZE = 50;

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('ru-RU', {
    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
  });
}

function formatShortDate(iso: string) {
  return new Date(iso).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };
  return (
    <button onClick={copy} className="ml-1 text-[var(--text-muted)] hover:text-[var(--accent)] transition-colors">
      {copied ? <Check size={14} /> : <Copy size={14} />}
    </button>
  );
}

function SourceDataBlock({ sd }: { sd: LeadSourceData }) {
  const interests = sd.interests ?? [];
  const dateFrom  = sd.date_from ?? sd.arrival;
  const dateTo    = sd.date_to   ?? sd.departure;
  const hasUtm    = sd.utm_source || sd.utm_medium || sd.utm_campaign;

  return (
    <div className="space-y-2 text-sm">
      {/* Badges: source / followup / escalation */}
      <div className="flex flex-wrap gap-1.5">
        {sd.source && (
          <span className="text-xs px-2 py-0.5 rounded-full bg-[var(--bg-hover)] text-[var(--text-secondary)]">
            {SOURCE_LABELS[sd.source] ?? sd.source}
          </span>
        )}
        {(sd.followup_count ?? 0) > 0 && (
          <span className="text-xs px-2 py-0.5 rounded-full bg-[var(--warning)]/10 text-[var(--warning)]">
            {sd.followup_count} уведомл.
          </span>
        )}
        {sd.escalated_to_admin && (
          <span className="text-xs px-2 py-0.5 rounded-full bg-[var(--danger)]/10 text-[var(--danger)]">
            Эскалирован
          </span>
        )}
      </div>

      {/* Interests */}
      {interests.length > 0 && (
        <div className="flex flex-wrap gap-1.5 items-center">
          <MapPin size={12} className="text-[var(--text-muted)] shrink-0" />
          {interests.map(i => (
            <span key={i} className="text-xs px-2 py-0.5 rounded-full bg-[var(--accent)]/10 text-[var(--accent)]">
              {INTEREST_LABELS[i] ?? i}
            </span>
          ))}
        </div>
      )}

      {/* Dates */}
      {(dateFrom || dateTo) && (
        <div className="flex items-center gap-1.5 text-xs text-[var(--text-secondary)]">
          <Calendar size={12} className="text-[var(--text-muted)] shrink-0" />
          {dateFrom ? formatShortDate(dateFrom) : '?'}
          {' — '}
          {dateTo ? formatShortDate(dateTo) : '?'}
          {sd.trip_days ? ` (${sd.trip_days} дн.)` : ''}
        </div>
      )}

      {/* UTM */}
      {hasUtm && (
        <div className="text-xs text-[var(--text-muted)]">
          UTM: {[sd.utm_source, sd.utm_medium, sd.utm_campaign].filter(Boolean).join(' / ')}
          {sd.referrer ? ` · ref: ${sd.referrer}` : ''}
        </div>
      )}
    </div>
  );
}

function LeadCard({ lead, onUpdate }: { lead: Lead; onUpdate: (id: string, patch: Partial<Lead>) => void }) {
  const [open, setOpen]           = useState(false);
  const [notes, setNotes]         = useState(lead.notes ?? '');
  const [saving, setSaving]       = useState(false);
  const [localStatus, setLocalStatus] = useState<LeadStatus>(lead.status);

  const save = useCallback(async (newStatus?: LeadStatus, skipNotes = false) => {
    setSaving(true);
    const body: Record<string, unknown> = {};
    if (!skipNotes) body.notes = notes;
    if (newStatus) body.status = newStatus;
    try {
      const res = await fetch(`/api/leads/${lead.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        const data = await res.json() as { lead: { status: LeadStatus; notes: string | null } };
        setLocalStatus(data.lead.status);
        setNotes(data.lead.notes ?? '');
        onUpdate(lead.id, { status: data.lead.status, notes: data.lead.notes });
      }
    } finally {
      setSaving(false);
    }
  }, [lead.id, notes, onUpdate]);

  const handleStatusClick = (s: LeadStatus) => {
    setLocalStatus(s);
    save(s, true);
  };

  const sm        = STATUS_META[localStatus];
  const interests = lead.source_data?.interests ?? [];
  const sourceLabel = lead.source_data?.source
    ? (SOURCE_LABELS[lead.source_data.source] ?? lead.source_data.source)
    : null;

  return (
    <div className="ds-card rounded-lg overflow-hidden">
      {/* Header */}
      <div className="flex items-start gap-3 p-4 cursor-pointer select-none" onClick={() => setOpen(o => !o)}>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-[var(--text-primary)]">{lead.name}</span>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${sm.color}`}>{sm.label}</span>
            {sourceLabel && (
              <span className="text-xs text-[var(--text-muted)]">{sourceLabel}</span>
            )}
          </div>

          <div className="flex items-center gap-1 mt-1 text-sm text-[var(--text-secondary)]">
            <Phone size={13} />
            <a
              href={`tel:${lead.phone}`}
              className="hover:text-[var(--accent)] transition-colors"
              onClick={e => e.stopPropagation()}
            >
              {lead.phone}
            </a>
            <CopyButton text={lead.phone} />
          </div>

          {/* Interests preview in header */}
          {interests.length > 0 ? (
            <div className="flex gap-1 mt-1 flex-wrap">
              {interests.slice(0, 4).map(i => (
                <span key={i} className="text-xs px-1.5 py-0.5 rounded bg-[var(--accent)]/10 text-[var(--accent)]">
                  {INTEREST_LABELS[i] ?? i}
                </span>
              ))}
            </div>
          ) : lead.comment ? (
            <p className="mt-1 text-xs text-[var(--text-muted)] line-clamp-1">{lead.comment}</p>
          ) : null}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs text-[var(--text-muted)]">{formatDate(lead.created_at)}</span>
          {open ? <ChevronUp size={16} className="text-[var(--text-muted)]" /> : <ChevronDown size={16} className="text-[var(--text-muted)]" />}
        </div>
      </div>

      {/* Expanded */}
      {open && (
        <div className="border-t border-[var(--border)] p-4 space-y-4">
          {/* Source data */}
          {lead.source_data && <SourceDataBlock sd={lead.source_data} />}

          {/* Meta */}
          {(lead.route_title || lead.comment || lead.source_url) && (
            <div className="text-xs text-[var(--text-muted)] space-y-0.5">
              {lead.route_title && <div>Маршрут: {lead.route_title}</div>}
              {lead.comment    && <div>Комментарий: {lead.comment}</div>}
              {lead.source_url && <div>Страница: {lead.source_url}</div>}
            </div>
          )}

          {/* ID */}
          <div className="flex items-center gap-1 text-xs text-[var(--text-muted)] font-mono">
            ID: {lead.id} <CopyButton text={lead.id} />
          </div>

          {/* Status buttons */}
          <div>
            <p className="text-xs text-[var(--text-muted)] mb-2">Статус</p>
            <div className="flex flex-wrap gap-2">
              {(Object.keys(STATUS_META) as LeadStatus[]).map(s => (
                <button
                  key={s}
                  onClick={() => handleStatusClick(s)}
                  disabled={saving}
                  className={`text-xs px-3 py-1 rounded-full border transition-all ${
                    localStatus === s
                      ? STATUS_META[s].color + ' border-transparent font-semibold'
                      : 'border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--accent)] hover:text-[var(--accent)]'
                  }`}
                >
                  {STATUS_META[s].label}
                </button>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="text-xs text-[var(--text-muted)] flex items-center gap-1 mb-1">
              <MessageSquare size={12} /> Заметки
            </label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={3}
              className="ds-input w-full text-sm resize-none"
              placeholder="Договорились созвониться 20 марта..."
            />
          </div>

          <button
            onClick={() => save()}
            disabled={saving}
            className="ds-btn ds-btn-primary text-sm"
          >
            {saving ? 'Сохранение…' : 'Сохранить заметку'}
          </button>
        </div>
      )}
    </div>
  );
}

export function LeadsClient() {
  const [tab, setTab]               = useState<LeadStatus | 'all'>('all');
  const [leads, setLeads]           = useState<Lead[]>([]);
  const [total, setTotal]           = useState(0);
  const [loading, setLoading]       = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [counts, setCounts]         = useState<Record<string, number>>({});
  const [search, setSearch]         = useState('');

  const load = useCallback(async (status: LeadStatus | 'all') => {
    setLoading(true);
    try {
      const res = await fetch(`/api/leads?status=${status}&limit=${PAGE_SIZE}&offset=0`);
      if (res.ok) {
        const data = await res.json() as { leads: Lead[]; total: number };
        setLeads(data.leads);
        setTotal(data.total);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const loadMore = useCallback(async (status: LeadStatus | 'all', currentCount: number) => {
    setLoadingMore(true);
    try {
      const res = await fetch(`/api/leads?status=${status}&limit=${PAGE_SIZE}&offset=${currentCount}`);
      if (res.ok) {
        const data = await res.json() as { leads: Lead[]; total: number };
        setLeads(prev => [...prev, ...data.leads]);
        setTotal(data.total);
      }
    } finally {
      setLoadingMore(false);
    }
  }, []);

  const loadCounts = useCallback(async () => {
    const statuses: LeadStatus[] = ['new', 'contacted', 'qualified', 'converted', 'lost'];
    const results = await Promise.all(
      statuses.map(s => fetch(`/api/leads?status=${s}&limit=1`).then(r => r.json() as Promise<{ total: number }>))
    );
    const c: Record<string, number> = {};
    statuses.forEach((s, i) => { c[s] = results[i].total; });
    setCounts(c);
  }, []);

  useEffect(() => { load(tab); }, [tab, load]);
  useEffect(() => { loadCounts(); }, [loadCounts]);

  const handleUpdate = useCallback((id: string, patch: Partial<Lead>) => {
    setLeads(ls => ls.map(l => l.id === id ? { ...l, ...patch } : l));
    loadCounts();
  }, [loadCounts]);

  // Client-side search
  const filtered = search.trim()
    ? leads.filter(l =>
        l.name.toLowerCase().includes(search.toLowerCase()) ||
        l.phone.includes(search)
      )
    : leads;

  const newCount = counts['new'] ?? 0;

  return (
    <div className="p-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="ds-h1">CRM — Лиды</h1>
          {newCount > 0 && (
            <p className="text-sm text-[var(--accent)] font-medium mt-1">{newCount} новых заявок</p>
          )}
        </div>
        <button
          onClick={() => { load(tab); loadCounts(); }}
          className="ds-btn ds-btn-secondary flex items-center gap-1 text-sm"
        >
          <RefreshCw size={14} /> Обновить
        </button>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Поиск по имени или телефону..."
          className="ds-input w-full pl-9 text-sm"
        />
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-1 mb-4">
        {TABS.map(t => {
          const cnt = t.key !== 'all' ? (counts[t.key] ?? 0) : total;
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`text-sm px-3 py-1.5 rounded-lg transition-all ${
                tab === t.key
                  ? 'bg-[var(--accent)] text-[var(--bg-card)] font-medium'
                  : 'text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]'
              }`}
            >
              {t.label}
              {cnt > 0 && (
                <span className={`ml-1.5 text-xs ${tab === t.key ? 'opacity-80' : 'text-[var(--text-muted)]'}`}>
                  {cnt}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* List */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => <div key={i} className="ds-skeleton h-20 rounded-lg" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-[var(--text-muted)]">
          <Clock size={32} className="mx-auto mb-3 opacity-40" />
          <p>{search.trim() ? 'Ничего не найдено' : 'Лидов нет'}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(lead => (
            <LeadCard key={lead.id} lead={lead} onUpdate={handleUpdate} />
          ))}

          {/* Load more — only when not searching */}
          {!search.trim() && leads.length < total && (
            <button
              onClick={() => loadMore(tab, leads.length)}
              disabled={loadingMore}
              className="w-full ds-btn ds-btn-secondary text-sm"
            >
              {loadingMore ? 'Загрузка…' : `Загрузить ещё (${total - leads.length})`}
            </button>
          )}
          {!search.trim() && leads.length >= total && total > PAGE_SIZE && (
            <p className="text-center text-xs text-[var(--text-muted)] py-2">
              Все {total} лидов загружены
            </p>
          )}
        </div>
      )}
    </div>
  );
}
