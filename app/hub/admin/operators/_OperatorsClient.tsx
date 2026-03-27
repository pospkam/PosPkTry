'use client';

import { useEffect, useState, useCallback } from 'react';
import { Protected } from '@/components/auth/Protected';
import {
  Building2, Search, Loader2, CheckCircle2, XCircle,
  Clock, Phone, Mail, Calendar, ChevronDown, ChevronUp,
  Send, Pencil, Check, Globe, Copy,
} from 'lucide-react';

type ProfileStatus = 'pending' | 'approved' | 'rejected';

interface OperatorRow {
  id: string;
  company_name: string;
  category: string;
  description: string;
  profile_status: ProfileStatus;
  applied_at: string | null;
  is_verified: boolean;
  is_public: boolean;
  profile_review_comment: string | null;
  email: string;
  contact_name: string;
  registered_at: string;
  application_id: string | null;
  contact_phone: string | null;
  contact_email: string | null;
  inn: string | null;
  application_status: string | null;
  reviewed_at: string | null;
  telegram_chat_id: string | null;
  slug: string | null;
  widget_enabled: boolean;
  widget_domains: string[];
}

const TAB_LABELS: Record<string, string> = {
  pending:  'На проверке',
  approved: 'Одобрены',
  rejected: 'Отклонены',
  all:      'Все',
};

const STATUS_CLS: Record<ProfileStatus, string> = {
  pending:  'bg-[var(--warning)]/15 text-[var(--warning)]',
  approved: 'bg-[var(--success)]/15 text-[var(--success)]',
  rejected: 'bg-[var(--danger)]/10  text-[var(--danger)]',
};

function formatDate(d: string | null) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

const CATEGORY_LABELS: Record<string, string> = {
  operator: 'Туроператор',
  guide:    'Гид',
  transfer: 'Трансфер',
  hotel:    'Отель',
  rent:     'Аренда',
  fishing:  'Рыбалка',
};

function RejectModal({
  name,
  onConfirm,
  onCancel,
}: { name: string; onConfirm: (comment: string) => void; onCancel: () => void }) {
  const [comment, setComment] = useState('');
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl w-full max-w-md p-6 shadow-xl">
        <h3 className="font-semibold text-[var(--text-primary)] mb-1">Отклонить заявку</h3>
        <p className="text-sm text-[var(--text-secondary)] mb-4">{name}</p>
        <textarea
          value={comment}
          onChange={e => setComment(e.target.value)}
          placeholder="Причина отказа (будет отправлена на email оператора)"
          rows={3}
          className="w-full px-3 py-2 text-sm bg-[var(--bg-primary)] border border-[var(--border)] rounded-lg text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)] resize-none"
        />
        <div className="flex gap-2 mt-4 justify-end">
          <button onClick={onCancel} className="px-4 py-2 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">
            Отмена
          </button>
          <button
            onClick={() => onConfirm(comment)}
            className="px-4 py-2 text-sm bg-[var(--danger)] text-white rounded-lg hover:bg-[var(--danger)]/90 transition-colors"
          >
            Отклонить
          </button>
        </div>
      </div>
    </div>
  );
}

function OperatorCard({
  op,
  onApprove,
  onReject,
  acting,
}: {
  op: OperatorRow;
  onApprove: (id: string) => void;
  onReject: (id: string, name: string) => void;
  acting: string | null;
}) {
  const [expanded, setExpanded] = useState(op.profile_status === 'pending');
  const [tgEdit, setTgEdit] = useState(false);
  const [tgValue, setTgValue] = useState(op.telegram_chat_id ?? '');
  const [tgSaving, setTgSaving] = useState(false);

  const [widgetEnabled, setWidgetEnabled] = useState(op.widget_enabled ?? false);
  const [widgetDomains, setWidgetDomains] = useState((op.widget_domains ?? []).join('\n'));
  const [widgetEditing, setWidgetEditing] = useState(false);
  const [widgetSaving, setWidgetSaving] = useState(false);
  const [widgetCopied, setWidgetCopied] = useState(false);

  async function saveTelegram() {
    setTgSaving(true);
    try {
      await fetch(`/api/admin/operators/${op.id}/contacts`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ telegram_chat_id: tgValue.trim() || null }),
      });
      setTgEdit(false);
    } finally {
      setTgSaving(false);
    }
  }

  async function toggleWidget() {
    const next = !widgetEnabled;
    setWidgetEnabled(next);
    await fetch(`/api/admin/operators/${op.id}/widget`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ widget_enabled: next }),
    });
  }

  async function saveWidgetDomains() {
    setWidgetSaving(true);
    try {
      const domains = widgetDomains.split('\n').map(d => d.trim()).filter(Boolean);
      await fetch(`/api/admin/operators/${op.id}/widget`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ widget_domains: domains }),
      });
      setWidgetEditing(false);
    } finally {
      setWidgetSaving(false);
    }
  }

  function copyEmbed() {
    if (!op.slug) return;
    const code = `<script src="https://tourhab.ru/api/widget/lead.js?partner=${op.slug}" defer></script>`;
    navigator.clipboard.writeText(code).catch(() => {});
    setWidgetCopied(true);
    setTimeout(() => setWidgetCopied(false), 2000);
  }

  return (
    <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg overflow-hidden">
      {/* Header row */}
      <div
        className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-[var(--bg-hover)] transition-colors"
        onClick={() => setExpanded(e => !e)}
      >
        <div className="flex items-center gap-3 min-w-0">
          <Building2 className="w-4 h-4 text-[var(--text-muted)] shrink-0" />
          <div className="min-w-0">
            <p className="font-medium text-[var(--text-primary)] truncate">{op.company_name}</p>
            <p className="text-xs text-[var(--text-muted)]">
              {CATEGORY_LABELS[op.category] ?? op.category} · {op.contact_name}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${STATUS_CLS[op.profile_status]}`}>
            {TAB_LABELS[op.profile_status]}
          </span>
          {expanded ? <ChevronUp className="w-4 h-4 text-[var(--text-muted)]" /> : <ChevronDown className="w-4 h-4 text-[var(--text-muted)]" />}
        </div>
      </div>

      {/* Expanded details */}
      {expanded && (
        <div className="px-4 pb-4 border-t border-[var(--border)]">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3 text-sm">
            <div className="flex items-center gap-2 text-[var(--text-secondary)]">
              <Mail className="w-3.5 h-3.5 text-[var(--text-muted)]" />
              <a href={`mailto:${op.email}`} className="hover:text-[var(--accent)] transition-colors truncate">{op.email}</a>
            </div>
            {op.contact_phone && (
              <div className="flex items-center gap-2 text-[var(--text-secondary)]">
                <Phone className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                <a href={`tel:${op.contact_phone}`} className="hover:text-[var(--accent)] transition-colors">{op.contact_phone}</a>
              </div>
            )}
            {op.inn && (
              <div className="flex items-center gap-2 text-[var(--text-secondary)]">
                <span className="text-[var(--text-muted)] text-xs">ИНН:</span>
                <span>{op.inn}</span>
              </div>
            )}
            <div className="flex items-center gap-2 text-[var(--text-secondary)]">
              <Calendar className="w-3.5 h-3.5 text-[var(--text-muted)]" />
              <span>Подано: {formatDate(op.applied_at ?? op.registered_at)}</span>
            </div>
          </div>

          {op.description && (
            <p className="mt-3 text-sm text-[var(--text-secondary)] line-clamp-3">{op.description}</p>
          )}

          {op.profile_review_comment && (
            <div className="mt-3 px-3 py-2 bg-[var(--danger)]/5 border border-[var(--danger)]/15 rounded-lg">
              <p className="text-xs text-[var(--danger)]"><b>Причина отказа:</b> {op.profile_review_comment}</p>
            </div>
          )}

          {/* Telegram Chat ID */}
          <div className="mt-3 flex items-center gap-2 text-sm">
            <Send className="w-3.5 h-3.5 text-[var(--text-muted)] shrink-0" />
            {tgEdit ? (
              <div className="flex items-center gap-1.5 flex-1">
                <input
                  autoFocus
                  value={tgValue}
                  onChange={e => setTgValue(e.target.value)}
                  placeholder="telegram_chat_id (число)"
                  className="flex-1 px-2 py-1 text-xs bg-[var(--bg-primary)] border border-[var(--accent)] rounded text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none"
                />
                <button
                  onClick={saveTelegram}
                  disabled={tgSaving}
                  className="p-1 text-[var(--success)] hover:bg-[var(--success)]/10 rounded transition-colors"
                >
                  {tgSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                </button>
                <button
                  onClick={() => { setTgEdit(false); setTgValue(op.telegram_chat_id ?? ''); }}
                  className="p-1 text-[var(--text-muted)] hover:text-[var(--text-secondary)] rounded transition-colors"
                >
                  <XCircle className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 flex-1">
                <span className={`text-xs ${tgValue ? 'text-[var(--text-secondary)]' : 'text-[var(--text-muted)] italic'}`}>
                  {tgValue || 'telegram_chat_id не указан'}
                </span>
                <button
                  onClick={() => setTgEdit(true)}
                  className="p-1 text-[var(--text-muted)] hover:text-[var(--accent)] rounded transition-colors"
                >
                  <Pencil className="w-3 h-3" />
                </button>
              </div>
            )}
          </div>

          {/* Widget management */}
          {op.slug && (
            <div className="mt-3 border-t border-[var(--border)] pt-3">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5 text-sm font-medium text-[var(--text-secondary)]">
                  <Globe className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                  Виджет для партнёрского сайта
                </div>
                <button
                  onClick={toggleWidget}
                  className={`px-3 py-1 text-xs rounded-full font-medium transition-colors ${
                    widgetEnabled
                      ? 'bg-[var(--success)]/15 text-[var(--success)]'
                      : 'bg-[var(--bg-primary)] text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
                  }`}
                >
                  {widgetEnabled ? 'Включён' : 'Выключен'}
                </button>
              </div>

              {widgetEnabled && (
                <>
                  {/* Embed code */}
                  <div className="flex items-center gap-1.5 mb-2">
                    <code className="flex-1 text-[10px] bg-[var(--bg-primary)] border border-[var(--border)] rounded px-2 py-1 text-[var(--text-secondary)] truncate select-all">
                      {`<script src="https://tourhab.ru/api/widget/lead.js?partner=${op.slug}" defer></script>`}
                    </code>
                    <button
                      onClick={copyEmbed}
                      className="p-1.5 text-[var(--text-muted)] hover:text-[var(--accent)] rounded transition-colors shrink-0"
                      title="Скопировать код"
                    >
                      {widgetCopied ? <Check className="w-3.5 h-3.5 text-[var(--success)]" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>

                  {/* Allowed domains */}
                  <div className="text-xs text-[var(--text-muted)] mb-1 flex items-center justify-between">
                    <span>Разрешённые домены:</span>
                    {!widgetEditing && (
                      <button
                        onClick={() => setWidgetEditing(true)}
                        className="text-[var(--accent)] hover:opacity-75 transition-opacity"
                      >
                        Изменить
                      </button>
                    )}
                  </div>
                  {widgetEditing ? (
                    <div>
                      <textarea
                        value={widgetDomains}
                        onChange={e => setWidgetDomains(e.target.value)}
                        placeholder="example.com&#10;www.partner.ru"
                        rows={3}
                        className="w-full text-xs px-2 py-1.5 bg-[var(--bg-primary)] border border-[var(--accent)] rounded text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none resize-none"
                      />
                      <div className="flex gap-1.5 mt-1">
                        <button
                          onClick={saveWidgetDomains}
                          disabled={widgetSaving}
                          className="flex items-center gap-1 px-2 py-1 text-xs bg-[var(--accent)] text-white rounded hover:opacity-90 transition-opacity disabled:opacity-50"
                        >
                          {widgetSaving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                          Сохранить
                        </button>
                        <button
                          onClick={() => setWidgetEditing(false)}
                          className="px-2 py-1 text-xs text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors"
                        >
                          Отмена
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="text-xs text-[var(--text-secondary)]">
                      {widgetDomains.trim()
                        ? widgetDomains.split('\n').filter(Boolean).map((d, i) => (
                            <span key={i} className="inline-block bg-[var(--bg-primary)] border border-[var(--border)] rounded px-1.5 py-0.5 mr-1 mb-1">{d.trim()}</span>
                          ))
                        : <span className="text-[var(--text-muted)] italic">Домены не указаны — виджет не будет работать</span>
                      }
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* Actions */}
          {op.profile_status === 'pending' && (
            <div className="flex gap-2 mt-4">
              <button
                onClick={() => onApprove(op.id)}
                disabled={acting === op.id}
                className="flex items-center gap-1.5 px-4 py-2 bg-[var(--success)] hover:bg-[var(--success)]/90 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
              >
                {acting === op.id
                  ? <Loader2 className="w-4 h-4 animate-spin" />
                  : <CheckCircle2 className="w-4 h-4" />
                }
                Одобрить
              </button>
              <button
                onClick={() => onReject(op.id, op.company_name)}
                disabled={acting === op.id}
                className="flex items-center gap-1.5 px-4 py-2 border border-[var(--danger)]/30 text-[var(--danger)] hover:bg-[var(--danger)]/5 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
              >
                <XCircle className="w-4 h-4" />
                Отклонить
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function OperatorsClient() {
  const [tab, setTab]             = useState<'pending' | 'approved' | 'rejected' | 'all'>('pending');
  const [operators, setOperators] = useState<OperatorRow[]>([]);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState('');
  const [acting, setActing]       = useState<string | null>(null);
  const [rejectTarget, setRejectTarget] = useState<{ id: string; name: string } | null>(null);
  const [counts, setCounts]       = useState<Record<string, number>>({});

  const load = useCallback(async (status: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/operators?status=${status}&limit=100`);
      const j: unknown = await res.json();
      if (typeof j === 'object' && j !== null && 'data' in j) {
        setOperators((j as { data: OperatorRow[] }).data);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  // Load counts for badge display
  const loadCounts = useCallback(async () => {
    const statuses: Array<'pending' | 'approved' | 'rejected'> = ['pending', 'approved', 'rejected'];
    const results = await Promise.all(
      statuses.map(s =>
        fetch(`/api/admin/operators?status=${s}&limit=1`)
          .then(r => r.json())
          .then((j: unknown) => {
            const total = typeof j === 'object' && j !== null && 'meta' in j
              ? (j as { meta: { total: number } }).meta.total
              : 0;
            return [s, total] as [string, number];
          })
          .catch(() => [s, 0] as [string, number])
      )
    );
    setCounts(Object.fromEntries(results));
  }, []);

  useEffect(() => { load(tab); }, [load, tab]);
  useEffect(() => { loadCounts(); }, [loadCounts]);

  async function approve(id: string) {
    setActing(id);
    try {
      const res = await fetch(`/api/admin/operators/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'approve' }),
      });
      const j: unknown = await res.json();
      if (typeof j === 'object' && j !== null && 'success' in j && (j as { success: boolean }).success) {
        setOperators(prev => prev.filter(o => o.id !== id));
        setCounts(prev => ({ ...prev, pending: (prev.pending ?? 1) - 1, approved: (prev.approved ?? 0) + 1 }));
      }
    } finally {
      setActing(null);
    }
  }

  async function reject(id: string, comment: string) {
    setRejectTarget(null);
    setActing(id);
    try {
      const res = await fetch(`/api/admin/operators/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reject', comment }),
      });
      const j: unknown = await res.json();
      if (typeof j === 'object' && j !== null && 'success' in j && (j as { success: boolean }).success) {
        setOperators(prev => prev.filter(o => o.id !== id));
        setCounts(prev => ({ ...prev, pending: (prev.pending ?? 1) - 1, rejected: (prev.rejected ?? 0) + 1 }));
      }
    } finally {
      setActing(null);
    }
  }

  const filtered = operators.filter(o =>
    o.company_name.toLowerCase().includes(search.toLowerCase()) ||
    o.contact_name.toLowerCase().includes(search.toLowerCase()) ||
    o.email.toLowerCase().includes(search.toLowerCase())
  );

  const TABS = ['pending', 'approved', 'rejected', 'all'] as const;

  return (
    <Protected roles={['admin']}>
      {rejectTarget && (
        <RejectModal
          name={rejectTarget.name}
          onConfirm={comment => reject(rejectTarget.id, comment)}
          onCancel={() => setRejectTarget(null)}
        />
      )}

      <div className="max-w-4xl mx-auto p-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Building2 className="w-6 h-6 text-[var(--accent)]" />
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Операторы</h1>
          {counts.pending > 0 && (
            <span className="px-2 py-0.5 text-xs bg-[var(--warning)]/20 text-[var(--warning)] rounded-full font-medium">
              {counts.pending} ожидают
            </span>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-4 bg-[var(--bg-primary)] rounded-lg p-1 w-fit">
          {TABS.map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors relative ${
                tab === t
                  ? 'bg-[var(--bg-card)] text-[var(--text-primary)] shadow-sm'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
              }`}
            >
              {TAB_LABELS[t]}
              {counts[t] !== undefined && counts[t] > 0 && t !== 'all' && (
                <span className="ml-1.5 text-[10px] text-[var(--text-muted)]">({counts[t]})</span>
              )}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Поиск по названию, контакту, email..."
            className="w-full pl-10 pr-4 py-2.5 bg-[var(--bg-card)] border border-[var(--border)] rounded-lg text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)]"
          />
        </div>

        {/* List */}
        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-[var(--text-muted)]" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <Clock className="w-10 h-10 text-[var(--text-muted)] mx-auto mb-3" />
            <p className="text-[var(--text-secondary)]">
              {tab === 'pending' ? 'Нет заявок на проверке' : 'Ничего не найдено'}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map(op => (
              <OperatorCard
                key={op.id}
                op={op}
                onApprove={approve}
                onReject={(id, name) => setRejectTarget({ id, name })}
                acting={acting}
              />
            ))}
          </div>
        )}
      </div>
    </Protected>
  );
}
