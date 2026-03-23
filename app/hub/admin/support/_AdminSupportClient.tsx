'use client';

import { useState, useCallback, useEffect } from 'react';
import { Protected } from '@/components/auth/Protected';
import {
  LifeBuoy, Loader2, AlertCircle, CheckCircle,
  MessageSquare, Send, ArrowUpCircle, Filter,
} from 'lucide-react';

interface SupportMessage {
  role: 'user' | 'agent' | 'system';
  text: string;
  ts: string;
}

interface Ticket {
  id: string;
  userId: string;
  userName: string | null;
  userEmail: string | null;
  channel: string;
  category: string;
  subject: string;
  status: string;
  assignedAgent: string | null;
  messages: SupportMessage[];
  resolution: string | null;
  escalatedAt: string | null;
  resolvedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

const STATUS_CONFIG: Record<string, { label: string; cls: string }> = {
  open:        { label: 'Открыт',     cls: 'text-[var(--ocean)] bg-[var(--ocean)]/10' },
  assigned:    { label: 'Назначен',   cls: 'text-[var(--warning)] bg-[var(--warning)]/10' },
  in_progress: { label: 'В работе',   cls: 'text-[var(--accent)] bg-[var(--accent)]/10' },
  escalated:   { label: 'Эскалирован', cls: 'text-[var(--danger)] bg-[var(--danger)]/10' },
  resolved:    { label: 'Решён',      cls: 'text-[var(--success)] bg-[var(--success)]/10' },
  closed:      { label: 'Закрыт',     cls: 'text-[var(--text-muted)] bg-[var(--bg-hover)]' },
};

const CATEGORY_LABELS: Record<string, string> = {
  billing:  'Оплата',
  booking:  'Бронирование',
  safety:   'Безопасность',
  refund:   'Возврат',
  content:  'Контент',
  technical:'Технический',
  operator: 'Оператор',
  other:    'Другое',
};

const RESIDENT_LABELS: Record<string, string> = {
  Rescue:  'Rescue',
  Planning: 'Planning',
  Quality: 'Quality',
  Content: 'Content',
  Admin:   'Admin',
};

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] ?? { label: status, cls: 'text-[var(--text-muted)] bg-[var(--bg-hover)]' };
  return <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${cfg.cls}`}>{cfg.label}</span>;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('ru-RU', {
    day: 'numeric', month: 'short', year: '2-digit', hour: '2-digit', minute: '2-digit',
  });
}

export default function AdminSupportClient() {
  const [tickets, setTickets]   = useState<Ticket[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);

  const [selected, setSelected] = useState<Ticket | null>(null);

  const [replyText, setReplyText]   = useState('');
  const [replying, setReplying]     = useState(false);
  const [replyError, setReplyError] = useState<string | null>(null);

  const [resolveText, setResolveText] = useState('');
  const [resolving, setResolving]     = useState(false);

  const [filterStatus,   setFilterStatus]   = useState('');
  const [filterCategory, setFilterCategory] = useState('');

  const fetchTickets = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (filterStatus)   params.set('status',   filterStatus);
      if (filterCategory) params.set('category', filterCategory);
      const res  = await fetch(`/api/hub/admin/support/tickets?${params.toString()}`);
      const json = await res.json() as { success: boolean; data?: Ticket[]; error?: string };
      if (json.success && json.data) {
        setTickets(json.data);
      } else {
        setError(json.error ?? 'Ошибка загрузки');
      }
    } catch {
      setError('Не удалось загрузить тикеты');
    } finally {
      setLoading(false);
    }
  }, [filterStatus, filterCategory]);

  useEffect(() => { void fetchTickets(); }, [fetchTickets]);

  const sendReply = useCallback(async () => {
    if (!selected || !replyText.trim()) return;
    setReplying(true);
    setReplyError(null);
    try {
      const res  = await fetch(`/api/hub/admin/support/tickets/${selected.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reply', text: replyText.trim() }),
      });
      const json = await res.json() as { success: boolean; error?: string };
      if (json.success) {
        const newMsg: SupportMessage = { role: 'agent', text: replyText.trim(), ts: new Date().toISOString() };
        const updated = { ...selected, messages: [...selected.messages, newMsg], status: selected.status === 'assigned' ? 'in_progress' : selected.status };
        setSelected(updated);
        setTickets(prev => prev.map(t => t.id === updated.id ? updated : t));
        setReplyText('');
      } else {
        setReplyError(json.error ?? 'Ошибка');
      }
    } catch {
      setReplyError('Не удалось отправить');
    } finally {
      setReplying(false);
    }
  }, [selected, replyText]);

  const resolveTicket = useCallback(async () => {
    if (!selected) return;
    setResolving(true);
    try {
      const res  = await fetch(`/api/hub/admin/support/tickets/${selected.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'resolve', resolution: resolveText.trim() || 'Вопрос решён.' }),
      });
      const json = await res.json() as { success: boolean; error?: string };
      if (json.success) {
        const updated = { ...selected, status: 'resolved', resolution: resolveText.trim() || 'Вопрос решён.' };
        setSelected(updated);
        setTickets(prev => prev.map(t => t.id === updated.id ? updated : t));
        setResolveText('');
      }
    } catch { /* silent */ }
    finally { setResolving(false); }
  }, [selected, resolveText]);

  const escalateTicket = useCallback(async () => {
    if (!selected) return;
    try {
      await fetch(`/api/hub/admin/support/tickets/${selected.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'escalate', reason: 'Ручная эскалация администратором' }),
      });
      const updated = { ...selected, status: 'escalated' };
      setSelected(updated);
      setTickets(prev => prev.map(t => t.id === updated.id ? updated : t));
    } catch { /* silent */ }
  }, [selected]);

  const openCount = tickets.filter(t => !['resolved', 'closed'].includes(t.status)).length;

  return (
    <Protected roles={['admin']}>
      <div className="max-w-7xl mx-auto px-4 py-6 lg:py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="font-playfair text-2xl sm:text-3xl font-bold text-[var(--text-primary)]">
              Служба поддержки
            </h1>
            {!loading && (
              <p className="text-sm text-[var(--text-muted)] mt-0.5">
                {openCount} активных / {tickets.length} всего
              </p>
            )}
          </div>
          <button
            onClick={() => void fetchTickets()}
            className="ds-btn ds-btn-secondary px-4 text-sm"
          >
            Обновить
          </button>
        </div>

        {error && (
          <div className="flex items-center gap-2 p-4 rounded-lg bg-[var(--danger)]/10 border border-[var(--danger)]/30 text-[var(--danger)] text-sm mb-4">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {error}
          </div>
        )}

        <div className="grid lg:grid-cols-5 gap-4">
          {/* Left: filters + list */}
          <div className="lg:col-span-2 space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="ds-input w-full text-sm"
              >
                <option value="">Все статусы</option>
                {Object.entries(STATUS_CONFIG).map(([k, v]) => (
                  <option key={k} value={k}>{v.label}</option>
                ))}
              </select>
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="ds-input w-full text-sm"
              >
                <option value="">Все категории</option>
                {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>

            {loading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-[var(--accent)]" />
              </div>
            ) : tickets.length === 0 ? (
              <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg p-8 text-center">
                <LifeBuoy className="w-8 h-8 mx-auto mb-2 text-[var(--text-muted)]" />
                <p className="text-sm text-[var(--text-secondary)]">Тикетов нет</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[70vh] overflow-y-auto pr-1">
                {tickets.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => { setSelected(t); setReplyText(''); setResolveText(''); setReplyError(null); }}
                    className={`w-full text-left rounded-lg p-3.5 border transition-colors ${
                      selected?.id === t.id
                        ? 'border-[var(--accent)] bg-[var(--accent)]/5'
                        : 'border-[var(--border)] bg-[var(--bg-card)] hover:bg-[var(--bg-hover)]'
                    }`}
                  >
                    <p className="font-medium text-[var(--text-primary)] text-sm truncate mb-1">
                      {t.subject}
                    </p>
                    <p className="text-xs text-[var(--text-muted)] truncate mb-2">
                      {t.userName ?? t.userEmail ?? `ID: ${t.userId.slice(0, 8)}`}
                    </p>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <StatusBadge status={t.status} />
                      <span className="text-xs text-[var(--text-muted)]">
                        {CATEGORY_LABELS[t.category] ?? t.category}
                      </span>
                      {t.assignedAgent && (
                        <span className="text-xs text-[var(--ocean)]">
                          {RESIDENT_LABELS[t.assignedAgent] ?? t.assignedAgent}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-[var(--text-muted)] mt-1">{formatDate(t.createdAt)}</p>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Right: detail */}
          <div className="lg:col-span-3">
            {!selected ? (
              <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg p-10 text-center flex flex-col items-center justify-center min-h-[300px]">
                <Filter className="w-10 h-10 text-[var(--text-muted)] mb-3" />
                <p className="text-[var(--text-secondary)]">Выберите тикет</p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Header */}
                <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg p-5">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex-1 min-w-0">
                      <h2 className="font-semibold text-[var(--text-primary)] text-lg leading-tight">
                        {selected.subject}
                      </h2>
                      <p className="text-sm text-[var(--text-muted)] mt-0.5">
                        {selected.userName && <span className="mr-2">{selected.userName}</span>}
                        {selected.userEmail && (
                          <span className="text-[var(--ocean)]">{selected.userEmail}</span>
                        )}
                      </p>
                    </div>
                    <StatusBadge status={selected.status} />
                  </div>

                  <div className="flex items-center gap-3 text-xs text-[var(--text-muted)] flex-wrap pt-2 border-t border-[var(--border)]">
                    <span>Канал: {selected.channel}</span>
                    <span>Категория: {CATEGORY_LABELS[selected.category] ?? selected.category}</span>
                    {selected.assignedAgent && (
                      <span>Резидент: <span className="text-[var(--ocean)]">{selected.assignedAgent}</span></span>
                    )}
                    <span>Создан: {formatDate(selected.createdAt)}</span>
                  </div>

                  {selected.status === 'resolved' && selected.resolution && (
                    <div className="mt-3 p-3 rounded-lg bg-[var(--success)]/5 border border-[var(--success)]/20 text-sm text-[var(--text-secondary)]">
                      <span className="font-medium text-[var(--success)]">Решение: </span>{selected.resolution}
                    </div>
                  )}

                  {!['resolved', 'closed'].includes(selected.status) && (
                    <div className="flex gap-2 mt-3 pt-3 border-t border-[var(--border)]">
                      <button
                        onClick={() => void escalateTicket()}
                        className="ds-btn ds-btn-secondary flex items-center gap-1.5 text-sm px-3"
                      >
                        <ArrowUpCircle className="w-4 h-4" />
                        Эскалировать
                      </button>
                    </div>
                  )}
                </div>

                {/* Message thread */}
                <div className="space-y-2 max-h-[35vh] overflow-y-auto">
                  {selected.messages.length === 0 ? (
                    <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg p-5 text-center">
                      <MessageSquare className="w-6 h-6 mx-auto mb-1.5 text-[var(--text-muted)]" />
                      <p className="text-sm text-[var(--text-secondary)]">Нет сообщений</p>
                    </div>
                  ) : (
                    selected.messages.map((msg, i) => {
                      const isAgent  = msg.role === 'agent';
                      const isSystem = msg.role === 'system';
                      return (
                        <div
                          key={i}
                          className={`rounded-lg p-3 ${
                            isSystem
                              ? 'bg-[var(--warning)]/5 border border-[var(--warning)]/20'
                              : isAgent
                                ? 'bg-[var(--ocean)]/5 border border-[var(--ocean)]/20'
                                : 'bg-[var(--bg-card)] border border-[var(--border)]'
                          }`}
                        >
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-xs font-medium text-[var(--text-secondary)]">
                              {isSystem ? 'Система' : isAgent ? 'Агент' : (selected.userName ?? 'Пользователь')}
                            </span>
                            <span className="text-xs text-[var(--text-muted)]">{formatDate(msg.ts)}</span>
                          </div>
                          <p className="text-sm text-[var(--text-primary)]">{msg.text}</p>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Reply + resolve */}
                {!['resolved', 'closed'].includes(selected.status) && (
                  <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg p-4 space-y-4">
                    {/* Reply */}
                    <div>
                      <label className="ds-label">Ответ пользователю</label>
                      <textarea
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        placeholder="Напишите ответ — придёт в Telegram..."
                        rows={3}
                        className="ds-input w-full resize-none mt-1"
                      />
                      {replyError && (
                        <p className="text-xs text-[var(--danger)] mt-1">{replyError}</p>
                      )}
                      <button
                        onClick={() => void sendReply()}
                        disabled={replying || !replyText.trim()}
                        className="mt-2 ds-btn ds-btn-primary flex items-center gap-2 disabled:opacity-50"
                      >
                        {replying
                          ? <Loader2 className="w-4 h-4 animate-spin" />
                          : <Send className="w-4 h-4" />
                        }
                        Отправить ответ
                      </button>
                    </div>

                    {/* Resolve */}
                    <div className="pt-3 border-t border-[var(--border)]">
                      <label className="ds-label">Закрыть тикет</label>
                      <textarea
                        value={resolveText}
                        onChange={(e) => setResolveText(e.target.value)}
                        placeholder="Итог решения (опционально)..."
                        rows={2}
                        className="ds-input w-full resize-none mt-1"
                      />
                      <button
                        onClick={() => void resolveTicket()}
                        disabled={resolving}
                        className="mt-2 ds-btn ds-btn-secondary flex items-center gap-2 disabled:opacity-50"
                      >
                        {resolving
                          ? <Loader2 className="w-4 h-4 animate-spin" />
                          : <CheckCircle className="w-4 h-4" />
                        }
                        Закрыть тикет
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </Protected>
  );
}
