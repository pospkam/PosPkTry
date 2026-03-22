'use client';

import { useState, useCallback, useEffect } from 'react';
import { Protected } from '@/components/auth/Protected';
import {
  LifeBuoy, ChevronRight, Loader2, AlertCircle, Clock,
  CheckCircle, X, RotateCcw, Search, Filter, MessageSquare,
} from 'lucide-react';

interface Ticket {
  id: string;
  subject: string;
  description: string;
  status: string;
  priority: string;
  category: string | null;
  customerName: string | null;
  customerEmail: string | null;
  customerId: string | null;
  createdAt: string;
  updatedAt: string;
}

interface Message {
  id: string;
  content: string;
  senderId: string;
  senderType?: string;
  createdAt: string;
}

interface TicketList {
  tickets?: Ticket[];
  total?: number;
}

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  OPEN: { label: 'Открыт', className: 'text-[var(--ocean)] bg-[var(--ocean)]/10' },
  IN_PROGRESS: { label: 'В работе', className: 'text-[var(--warning)] bg-[var(--warning)]/10' },
  WAITING_CUSTOMER: { label: 'Ждёт ответа', className: 'text-[var(--accent)] bg-[var(--accent)]/10' },
  RESOLVED: { label: 'Решён', className: 'text-[var(--success)] bg-[var(--success)]/10' },
  CLOSED: { label: 'Закрыт', className: 'text-[var(--text-muted)] bg-[var(--bg-hover)]' },
  REOPENED: { label: 'Переоткрыт', className: 'text-[var(--danger)] bg-[var(--danger)]/10' },
  ON_HOLD: { label: 'На паузе', className: 'text-[var(--text-muted)] bg-[var(--bg-hover)]' },
};

const PRIORITY_CONFIG: Record<string, { label: string; className: string }> = {
  LOW: { label: 'Низкий', className: 'text-[var(--success)] bg-[var(--success)]/10' },
  MEDIUM: { label: 'Средний', className: 'text-[var(--ocean)] bg-[var(--ocean)]/10' },
  HIGH: { label: 'Высокий', className: 'text-[var(--warning)] bg-[var(--warning)]/10' },
  URGENT: { label: 'Срочно', className: 'text-[var(--danger)] bg-[var(--danger)]/10' },
  CRITICAL: { label: 'Критично', className: 'text-white bg-[var(--danger)]' },
};

const CATEGORY_LABELS: Record<string, string> = {
  BILLING: 'Оплата',
  TECHNICAL: 'Технический',
  BOOKING: 'Бронирование',
  CANCELLATION: 'Отмена',
  REFUND: 'Возврат',
  FEEDBACK: 'Отзыв',
  BUG_REPORT: 'Баг',
  FEATURE_REQUEST: 'Функция',
  OTHER: 'Другое',
};

const ALL_STATUSES = ['OPEN', 'IN_PROGRESS', 'WAITING_CUSTOMER', 'RESOLVED', 'CLOSED', 'REOPENED', 'ON_HOLD'];

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] ?? { label: status, className: 'text-[var(--text-muted)] bg-[var(--bg-hover)]' };
  return <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${cfg.className}`}>{cfg.label}</span>;
}

function PriorityBadge({ priority }: { priority: string }) {
  const cfg = PRIORITY_CONFIG[priority] ?? { label: priority, className: 'text-[var(--text-muted)] bg-[var(--bg-hover)]' };
  return <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${cfg.className}`}>{cfg.label}</span>;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: '2-digit', hour: '2-digit', minute: '2-digit' });
}

export default function AdminSupportClient() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [submittingReply, setSubmittingReply] = useState(false);
  const [newStatus, setNewStatus] = useState('');
  const [updatingStatus, setUpdatingStatus] = useState(false);

  // Filters
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterPriority, setFilterPriority] = useState('');

  const buildQuery = useCallback(() => {
    const params = new URLSearchParams({ limit: '50', sortBy: 'createdAt', sortOrder: 'DESC' });
    if (search) params.set('search', search);
    if (filterStatus) params.set('status', filterStatus);
    if (filterPriority) params.set('priority', filterPriority);
    return params.toString();
  }, [search, filterStatus, filterPriority]);

  const fetchTickets = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/support/tickets?${buildQuery()}`);
      const json = await res.json();
      if (json.success !== false) {
        const raw = json.data ?? json;
        const list: Ticket[] = Array.isArray(raw) ? raw : ((raw as TicketList).tickets ?? []);
        setTickets(list);
        setTotal(Array.isArray(raw) ? list.length : ((raw as TicketList).total ?? list.length));
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [buildQuery]);

  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  const openDetail = useCallback(async (ticket: Ticket) => {
    setSelectedTicket(ticket);
    setNewStatus(ticket.status);
    setLoadingMessages(true);
    try {
      const res = await fetch(`/api/support/tickets/${ticket.id}/messages`);
      const json = await res.json();
      if (json.success !== false) {
        const raw = json.data ?? json;
        setMessages(Array.isArray(raw) ? raw : ((raw as { messages?: Message[] }).messages ?? []));
      }
    } catch {
      setMessages([]);
    } finally {
      setLoadingMessages(false);
    }
  }, []);

  const sendReply = useCallback(async () => {
    if (!replyText.trim() || !selectedTicket) return;
    setSubmittingReply(true);
    try {
      const res = await fetch(`/api/support/tickets/${selectedTicket.id}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: replyText }),
      });
      const json = await res.json();
      if (json.success && json.data) {
        setMessages((m) => [...m, json.data as Message]);
        setReplyText('');
      }
    } catch {
      // silent
    } finally {
      setSubmittingReply(false);
    }
  }, [replyText, selectedTicket]);

  const updateStatus = useCallback(async () => {
    if (!selectedTicket || newStatus === selectedTicket.status) return;
    setUpdatingStatus(true);
    try {
      const res = await fetch(`/api/support/tickets/${selectedTicket.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      const json = await res.json();
      if (json.success) {
        const updated = { ...selectedTicket, status: newStatus };
        setSelectedTicket(updated);
        setTickets((prev) => prev.map((t) => t.id === updated.id ? updated : t));
      }
    } catch {
      // silent
    } finally {
      setUpdatingStatus(false);
    }
  }, [selectedTicket, newStatus]);

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
                {total} заявок
              </p>
            )}
          </div>
        </div>

        <div className="grid lg:grid-cols-5 gap-4">
          {/* Left: ticket list */}
          <div className="lg:col-span-2 space-y-3">
            {/* Filters */}
            <div className="space-y-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Поиск по теме..."
                  className="ds-input w-full pl-9"
                />
              </div>
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
                  value={filterPriority}
                  onChange={(e) => setFilterPriority(e.target.value)}
                  className="ds-input w-full text-sm"
                >
                  <option value="">Все приоритеты</option>
                  {Object.entries(PRIORITY_CONFIG).map(([k, v]) => (
                    <option key={k} value={k}>{v.label}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* List */}
            {loading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-[var(--accent)]" />
              </div>
            ) : tickets.length === 0 ? (
              <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg p-8 text-center">
                <LifeBuoy className="w-8 h-8 mx-auto mb-2 text-[var(--text-muted)]" />
                <p className="text-sm text-[var(--text-secondary)]">Заявок нет</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[70vh] overflow-y-auto pr-1">
                {tickets.map((ticket) => (
                  <button
                    key={ticket.id}
                    onClick={() => openDetail(ticket)}
                    className={`w-full text-left rounded-lg p-3.5 border transition-colors ${
                      selectedTicket?.id === ticket.id
                        ? 'border-[var(--accent)] bg-[var(--accent)]/5'
                        : 'border-[var(--border)] bg-[var(--bg-card)] hover:bg-[var(--bg-hover)]'
                    }`}
                  >
                    <p className="font-medium text-[var(--text-primary)] text-sm truncate mb-1.5">
                      {ticket.subject}
                    </p>
                    <p className="text-xs text-[var(--text-muted)] truncate mb-2">
                      {ticket.customerName ?? ticket.customerEmail ?? `ID: ${ticket.id.slice(0, 8)}`}
                    </p>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <StatusBadge status={ticket.status} />
                      <PriorityBadge priority={ticket.priority} />
                      {ticket.category && (
                        <span className="text-xs text-[var(--text-muted)]">
                          {CATEGORY_LABELS[ticket.category] ?? ticket.category}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-[var(--text-muted)] mt-1.5">{formatDate(ticket.createdAt)}</p>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Right: detail */}
          <div className="lg:col-span-3">
            {!selectedTicket ? (
              <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg p-10 text-center flex flex-col items-center justify-center min-h-[300px]">
                <Filter className="w-10 h-10 text-[var(--text-muted)] mb-3" />
                <p className="text-[var(--text-secondary)]">Выберите заявку для просмотра</p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Ticket info */}
                <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg p-5">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex-1 min-w-0">
                      <h2 className="font-semibold text-[var(--text-primary)] text-lg leading-tight">
                        {selectedTicket.subject}
                      </h2>
                      <p className="text-sm text-[var(--text-muted)] mt-0.5">
                        {selectedTicket.customerName && <span className="mr-2">{selectedTicket.customerName}</span>}
                        {selectedTicket.customerEmail && (
                          <span className="text-[var(--ocean)]">{selectedTicket.customerEmail}</span>
                        )}
                      </p>
                    </div>
                    <div className="flex-shrink-0 flex items-center gap-2">
                      <PriorityBadge priority={selectedTicket.priority} />
                    </div>
                  </div>
                  <p className="text-sm text-[var(--text-secondary)] bg-[var(--bg-primary)] rounded-lg p-3 leading-relaxed">
                    {selectedTicket.description}
                  </p>
                  <div className="flex items-center gap-3 mt-3 flex-wrap">
                    <span className="text-xs text-[var(--text-muted)]">Создан {formatDate(selectedTicket.createdAt)}</span>
                    {selectedTicket.category && (
                      <span className="text-xs text-[var(--text-muted)]">
                        {CATEGORY_LABELS[selectedTicket.category] ?? selectedTicket.category}
                      </span>
                    )}
                  </div>

                  {/* Status update */}
                  <div className="flex items-center gap-2 mt-4 pt-4 border-t border-[var(--border)]">
                    <select
                      value={newStatus}
                      onChange={(e) => setNewStatus(e.target.value)}
                      className="ds-input flex-1 text-sm"
                    >
                      {ALL_STATUSES.map((s) => (
                        <option key={s} value={s}>{STATUS_CONFIG[s]?.label ?? s}</option>
                      ))}
                    </select>
                    <button
                      onClick={updateStatus}
                      disabled={updatingStatus || newStatus === selectedTicket.status}
                      className="ds-btn ds-btn-primary px-4 flex items-center gap-1.5 disabled:opacity-50"
                    >
                      {updatingStatus ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                      Сохранить
                    </button>
                  </div>
                </div>

                {/* Messages */}
                <div className="space-y-2 max-h-[35vh] overflow-y-auto">
                  {loadingMessages ? (
                    <div className="flex justify-center py-6">
                      <Loader2 className="w-5 h-5 animate-spin text-[var(--accent)]" />
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg p-5 text-center">
                      <MessageSquare className="w-6 h-6 mx-auto mb-1.5 text-[var(--text-muted)]" />
                      <p className="text-sm text-[var(--text-secondary)]">Нет сообщений</p>
                    </div>
                  ) : (
                    messages.map((msg) => {
                      const isAgent = msg.senderType === 'AGENT' || msg.senderType === 'SYSTEM';
                      return (
                        <div
                          key={msg.id}
                          className={`rounded-lg p-3 ${isAgent
                            ? 'bg-[var(--accent)]/5 border border-[var(--accent)]/20'
                            : 'bg-[var(--bg-card)] border border-[var(--border)]'
                          }`}
                        >
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-xs font-medium text-[var(--text-secondary)]">
                              {isAgent ? 'Агент поддержки' : 'Клиент'}
                            </span>
                            <span className="text-xs text-[var(--text-muted)]">{formatDate(msg.createdAt)}</span>
                          </div>
                          <p className="text-sm text-[var(--text-primary)]">{msg.content}</p>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Reply */}
                <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg p-4">
                  <label className="ds-label">Ответ клиенту</label>
                  <textarea
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder="Напишите ответ..."
                    rows={3}
                    className="ds-input w-full resize-none mt-1"
                  />
                  <button
                    onClick={sendReply}
                    disabled={submittingReply || !replyText.trim()}
                    className="mt-2 ds-btn ds-btn-primary flex items-center gap-2 disabled:opacity-50"
                  >
                    {submittingReply ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                    Отправить ответ
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </Protected>
  );
}
