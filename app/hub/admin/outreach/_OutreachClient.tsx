'use client';

import { useEffect, useState, useCallback } from 'react';
import { Protected } from '@/components/auth/Protected';
import {
  Loader2, AlertCircle, Globe, Mail, Phone,
  CheckCircle, XCircle, Clock, Send, RefreshCw, ExternalLink,
} from 'lucide-react';

interface OutreachRow {
  id: string;
  company_name: string;
  contact_name: string | null;
  email: string | null;
  phone: string | null;
  website: string | null;
  source: string | null;
  source_url: string | null;
  status: string;
  outreach_text: string | null;
  notes: string | null;
  contacted_at: string | null;
  created_at: string;
  updated_at: string;
}

const STATUS_TABS = [
  { value: 'all',        label: 'Все'          },
  { value: 'found',      label: 'Найдены'      },
  { value: 'contacted',  label: 'Контакт'      },
  { value: 'replied',    label: 'Ответили'     },
  { value: 'registered', label: 'Зарегились'   },
  { value: 'declined',   label: 'Отказали'     },
];

const STATUS_COLORS: Record<string, string> = {
  found:      'bg-[var(--ocean)]/10 text-[var(--ocean)]',
  contacted:  'bg-[var(--warning)]/10 text-[var(--warning)]',
  replied:    'bg-[var(--accent)]/10 text-[var(--accent)]',
  registered: 'bg-[var(--success)]/10 text-[var(--success)]',
  declined:   'bg-[var(--danger)]/10 text-[var(--danger)]',
};

const STATUS_LABELS: Record<string, string> = {
  found:      'Найден',
  contacted:  'Контакт',
  replied:    'Ответил',
  registered: 'Зарегистрирован',
  declined:   'Отказал',
};

const NEXT_STATUSES: Record<string, string[]> = {
  found:      ['contacted', 'declined'],
  contacted:  ['replied', 'declined'],
  replied:    ['registered', 'declined'],
  registered: [],
  declined:   [],
};

function fmt(d: string) {
  return new Date(d).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: '2-digit' });
}

export default function OutreachClient() {
  const [rows, setRows]         = useState<OutreachRow[]>([]);
  const [total, setTotal]       = useState(0);
  const [tab, setTab]           = useState('all');
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [updating, setUpdating] = useState<string | null>(null);

  const load = useCallback((status: string) => {
    setLoading(true);
    setError(null);
    fetch(`/api/admin/outreach?status=${status}&limit=100`)
      .then(r => r.json())
      .then(json => {
        if (json.success) {
          setRows(json.data.rows);
          setTotal(json.data.total);
        } else {
          setError(json.error || 'Ошибка загрузки');
        }
      })
      .catch(() => setError('Ошибка сети'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(tab); }, [tab, load]);

  async function updateStatus(id: string, status: string) {
    setUpdating(id);
    try {
      const r = await fetch('/api/admin/outreach', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status }),
      });
      const json = await r.json();
      if (json.success) {
        setRows(prev => prev.map(row =>
          row.id === id ? { ...row, status } : row
        ));
      }
    } finally {
      setUpdating(null);
    }
  }

  return (
    <Protected roles={['admin']}>
      <div className="max-w-6xl mx-auto p-6 space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="ds-h1 flex items-center gap-2">
              <Send className="w-5 h-5 text-[var(--ocean)]" />
              Аутрич-очередь
            </h1>
            <p className="text-[var(--text-secondary)] text-sm mt-1">
              Операторы, найденные контуром ресерча и аутрича, - {total} записей
            </p>
          </div>
          <button
            onClick={() => load(tab)}
            className="ds-btn ds-btn-secondary flex items-center gap-1.5 text-sm"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Обновить
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 flex-wrap">
          {STATUS_TABS.map(t => (
            <button
              key={t.value}
              onClick={() => setTab(t.value)}
              className={`px-3 py-1.5 rounded-md text-sm transition-colors ${
                tab === t.value
                  ? 'bg-[var(--accent)] text-white'
                  : 'bg-[var(--bg-card)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {loading && (
          <div className="flex justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-[var(--accent)]" />
          </div>
        )}

        {error && (
          <div className="ds-card p-4 flex items-center gap-2 text-[var(--danger)]">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {error}
          </div>
        )}

        {!loading && !error && rows.length === 0 && (
          <div className="ds-card p-10 text-center text-[var(--text-secondary)]">
            Записей нет
          </div>
        )}

        <div className="grid gap-3">
          {rows.map(row => (
            <div key={row.id} className="ds-card p-4 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-[var(--text-primary)]">
                      {row.company_name}
                    </span>
                    {row.contact_name && (
                      <span className="text-sm text-[var(--text-secondary)]">
                        / {row.contact_name}
                      </span>
                    )}
                    <span className={`text-xs px-2 py-0.5 rounded ${STATUS_COLORS[row.status] ?? ''}`}>
                      {STATUS_LABELS[row.status] ?? row.status}
                    </span>
                  </div>

                  <div className="flex gap-4 mt-1.5 flex-wrap text-xs text-[var(--text-secondary)]">
                    {row.email && (
                      <a href={`mailto:${row.email}`} className="flex items-center gap-1 hover:text-[var(--ocean)]">
                        <Mail className="w-3 h-3" />{row.email}
                      </a>
                    )}
                    {row.phone && (
                      <a href={`tel:${row.phone}`} className="flex items-center gap-1 hover:text-[var(--ocean)]">
                        <Phone className="w-3 h-3" />{row.phone}
                      </a>
                    )}
                    {row.website && (
                      <a href={row.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 hover:text-[var(--ocean)]">
                        <Globe className="w-3 h-3" />{row.website.replace(/^https?:\/\//, '')}
                        <ExternalLink className="w-2.5 h-2.5" />
                      </a>
                    )}
                    {row.source && (
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {row.source} · {fmt(row.created_at)}
                      </span>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-1.5 shrink-0">
                  {NEXT_STATUSES[row.status]?.map(next => (
                    <button
                      key={next}
                      onClick={() => updateStatus(row.id, next)}
                      disabled={updating === row.id}
                      className={`text-xs px-2.5 py-1 rounded flex items-center gap-1 transition-colors ${
                        next === 'declined'
                          ? 'bg-[var(--danger)]/10 text-[var(--danger)] hover:bg-[var(--danger)]/20'
                          : 'bg-[var(--success)]/10 text-[var(--success)] hover:bg-[var(--success)]/20'
                      }`}
                    >
                      {updating === row.id
                        ? <Loader2 className="w-3 h-3 animate-spin" />
                        : next === 'declined'
                          ? <XCircle className="w-3 h-3" />
                          : <CheckCircle className="w-3 h-3" />}
                      {STATUS_LABELS[next]}
                    </button>
                  ))}
                  {row.outreach_text && (
                    <button
                      onClick={() => setExpanded(expanded === row.id ? null : row.id)}
                      className="text-xs px-2.5 py-1 rounded bg-[var(--bg-hover)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
                    >
                      {expanded === row.id ? 'Скрыть' : 'Письмо'}
                    </button>
                  )}
                </div>
              </div>

              {expanded === row.id && row.outreach_text && (
                <div className="text-xs text-[var(--text-secondary)] bg-[var(--bg-primary)] rounded p-3 leading-relaxed whitespace-pre-wrap border border-[var(--border)]">
                  {row.outreach_text}
                </div>
              )}

              {row.notes && (
                <div className="text-xs text-[var(--text-muted)] italic">{row.notes}</div>
              )}
            </div>
          ))}
        </div>
      </div>
    </Protected>
  );
}
