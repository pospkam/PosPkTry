'use client';

import { useState, useEffect, useCallback } from 'react';
import { Phone, MessageSquare, Clock, ChevronDown, ChevronUp, Copy, Check, RefreshCw } from 'lucide-react';

type LeadStatus = 'new' | 'contacted' | 'qualified' | 'converted' | 'lost';

interface Lead {
  id: string;
  name: string;
  phone: string;
  comment: string | null;
  route_title: string | null;
  source_url: string | null;
  status: LeadStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

const STATUS_META: Record<LeadStatus, { label: string; color: string }> = {
  new:        { label: 'Новый',          color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300' },
  contacted:  { label: 'Позвонили',      color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300' },
  qualified:  { label: 'Квалифицирован', color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300' },
  converted:  { label: 'Сделка',         color: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300' },
  lost:       { label: 'Отказ',          color: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300' },
};

const TABS: Array<{ key: LeadStatus | 'all'; label: string }> = [
  { key: 'all',       label: 'Все' },
  { key: 'new',       label: 'Новые' },
  { key: 'contacted', label: 'Звонок' },
  { key: 'qualified', label: 'Квалифицирован' },
  { key: 'converted', label: 'Сделка' },
  { key: 'lost',      label: 'Отказ' },
];

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('ru-RU', {
    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
  });
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

function LeadCard({ lead, onUpdate }: { lead: Lead; onUpdate: (id: string, patch: Partial<Lead>) => void }) {
  const [open, setOpen] = useState(false);
  const [notes, setNotes] = useState(lead.notes ?? '');
  const [saving, setSaving] = useState(false);
  const [localStatus, setLocalStatus] = useState<LeadStatus>(lead.status);

  const save = useCallback(async (newStatus?: LeadStatus) => {
    setSaving(true);
    const body: Record<string, unknown> = { notes };
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
    save(s);
  };

  const sm = STATUS_META[localStatus];

  return (
    <div className="ds-card rounded-lg overflow-hidden">
      {/* Header row */}
      <div className="flex items-start gap-3 p-4 cursor-pointer select-none" onClick={() => setOpen(o => !o)}>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-[var(--text-primary)]">{lead.name}</span>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${sm.color}`}>{sm.label}</span>
          </div>
          <div className="flex items-center gap-1 mt-1 text-sm text-[var(--text-secondary)]">
            <Phone size={13} />
            <a href={`tel:${lead.phone}`} className="hover:text-[var(--accent)] transition-colors" onClick={e => e.stopPropagation()}>
              {lead.phone}
            </a>
            <CopyButton text={lead.phone} />
          </div>
          {lead.comment && (
            <p className="mt-1 text-xs text-[var(--text-muted)] line-clamp-1">{lead.comment}</p>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs text-[var(--text-muted)]">{formatDate(lead.created_at)}</span>
          {open ? <ChevronUp size={16} className="text-[var(--text-muted)]" /> : <ChevronDown size={16} className="text-[var(--text-muted)]" />}
        </div>
      </div>

      {/* Expanded */}
      {open && (
        <div className="border-t border-[var(--border)] p-4 space-y-4">
          {/* Meta */}
          {(lead.route_title || lead.source_url) && (
            <div className="text-xs text-[var(--text-muted)] space-y-0.5">
              {lead.route_title && <div>Маршрут: {lead.route_title}</div>}
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
  const [tab, setTab] = useState<LeadStatus | 'all'>('all');
  const [leads, setLeads] = useState<Lead[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [counts, setCounts] = useState<Record<string, number>>({});

  const load = useCallback(async (status: LeadStatus | 'all') => {
    setLoading(true);
    try {
      const res = await fetch(`/api/leads?status=${status}&limit=50`);
      if (res.ok) {
        const data = await res.json() as { leads: Lead[]; total: number };
        setLeads(data.leads);
        setTotal(data.total);
      }
    } finally {
      setLoading(false);
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
        <button onClick={() => { load(tab); loadCounts(); }} className="ds-btn ds-btn-secondary flex items-center gap-1 text-sm">
          <RefreshCw size={14} /> Обновить
        </button>
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
                  ? 'bg-[var(--accent)] text-white font-medium'
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
          {[1,2,3].map(i => <div key={i} className="ds-skeleton h-20 rounded-lg" />)}
        </div>
      ) : leads.length === 0 ? (
        <div className="text-center py-16 text-[var(--text-muted)]">
          <Clock size={32} className="mx-auto mb-3 opacity-40" />
          <p>Лидов нет</p>
        </div>
      ) : (
        <div className="space-y-3">
          {leads.map(lead => (
            <LeadCard key={lead.id} lead={lead} onUpdate={handleUpdate} />
          ))}
          {total > leads.length && (
            <p className="text-center text-sm text-[var(--text-muted)] py-2">
              Показано {leads.length} из {total}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
