'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Inbox, Phone, MapPin, Calendar, Users, RefreshCw,
  ChevronDown, Search, CheckCircle, Clock, XCircle, User,
} from 'lucide-react';

interface LeadSourceData {
  interests?:   string[];
  date_from?:   string;
  date_to?:     string;
  trip_days?:   number;
  source?:      string;
  utm_source?:  string;
}

interface Lead {
  id:          string;
  name:        string;
  phone:       string;
  comment:     string | null;
  route_title: string | null;
  source_url:  string | null;
  source_data: LeadSourceData | null;
  status:      'new' | 'contacted' | 'qualified' | 'converted' | 'lost';
  notes:       string | null;
  created_at:  string;
  updated_at:  string;
}

type TabKey = 'all' | 'new' | 'contacted' | 'qualified';

const TABS: { key: TabKey; label: string }[] = [
  { key: 'all',       label: 'Все'         },
  { key: 'new',       label: 'Новые'       },
  { key: 'contacted', label: 'В работе'    },
  { key: 'qualified', label: 'Квалиф.'     },
];

const STATUS_CFG = {
  new:       { label: 'Новая',           color: 'text-[var(--ocean)]   bg-[var(--ocean)]/10'   },
  contacted: { label: 'В работе',        color: 'text-[var(--warning)] bg-[var(--warning)]/10' },
  qualified: { label: 'Квалифицирована', color: 'text-[var(--accent)]  bg-[var(--accent)]/10'  },
  converted: { label: 'Сделка',          color: 'text-[var(--success)] bg-[var(--success)]/10' },
  lost:      { label: 'Отказ',           color: 'text-[var(--danger)]  bg-[var(--danger)]/10'  },
};

const INTEREST_LABELS: Record<string, string> = {
  volcano:     'Вулкан',    trekking:    'Треккинг',  fishing:     'Рыбалка',
  thermal:     'Термальный', helicopter:  'Вертолёт', boat_trip:   'Сплав',
  snowmobile:  'Снегоход',  bears:       'Медведи',
};

const SOURCE_LABELS: Record<string, string> = {
  telegram_bot: 'Telegram-бот',
  trip_planner: 'TripPlanner',
  website:      'Сайт',
};

function fmt(d: string) {
  return new Date(d).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
}

export default function LeadsClient() {
  const [leads,  setLeads]  = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab,    setTab]    = useState<TabKey>('all');
  const [q,      setQ]      = useState('');
  const [updating, setUpdating] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ status: tab });
    if (q) params.set('q', q);
    try {
      const res  = await fetch(`/api/agent/leads?${params}`);
      const json = await res.json() as { success: boolean; data: Lead[] };
      if (json.success) setLeads(json.data);
    } finally {
      setLoading(false);
    }
  }, [tab, q]);

  useEffect(() => { void load(); }, [load]);

  async function updateStatus(id: string, status: Lead['status'], notes?: string) {
    setUpdating(id);
    try {
      await fetch(`/api/agent/leads/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, notes }),
      });
      await load();
    } finally {
      setUpdating(null);
    }
  }

  const newCount = leads.filter(l => l.status === 'new').length;

  return (
    <div className="p-5 lg:p-6 space-y-5">
      {/* Заголовок */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="ds-h1 flex items-center gap-2">
            <Inbox size={24} className="text-[var(--accent)]" />
            Входящие заявки
          </h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            Заявки туристов с платформы — возьмите в работу и подберите тур
          </p>
        </div>
        <button onClick={() => void load()} className="ds-btn ds-btn-secondary flex items-center gap-2">
          <RefreshCw size={16} />
          Обновить
        </button>
      </div>

      {/* Поиск + табы */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
          <input
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder="Поиск по имени или телефону..."
            className="ds-input pl-9 w-full"
          />
        </div>
        <div className="flex gap-1 flex-wrap">
          {TABS.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                tab === t.key
                  ? 'bg-[var(--accent)] text-white'
                  : 'bg-[var(--bg-hover)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              {t.label}
              {t.key === 'new' && newCount > 0 && (
                <span className="ml-1.5 inline-flex items-center justify-center w-4 h-4 rounded-full bg-[rgba(255,255,255,0.2)] text-xs">
                  {newCount}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Список */}
      {loading ? (
        <div className="flex justify-center py-12 text-[var(--text-muted)]">
          <RefreshCw size={20} className="animate-spin" />
        </div>
      ) : leads.length === 0 ? (
        <div className="ds-card text-center py-12 text-[var(--text-secondary)]">
          <Inbox size={32} className="mx-auto mb-3 opacity-40" />
          <p>Заявок нет</p>
        </div>
      ) : (
        <div className="space-y-3">
          {leads.map(lead => {
            const sd = lead.source_data ?? {};
            const interests = sd.interests ?? [];
            const cfg = STATUS_CFG[lead.status];

            return (
              <div key={lead.id} className="ds-card p-4 space-y-3">
                {/* Строка 1: имя + статус + дата */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <User size={16} className="text-[var(--text-muted)] shrink-0" />
                    <span className="font-semibold text-[var(--text-primary)]">{lead.name}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${cfg.color}`}>
                      {cfg.label}
                    </span>
                  </div>
                  <span className="text-xs text-[var(--text-muted)] shrink-0">{fmt(lead.created_at)}</span>
                </div>

                {/* Строка 2: телефон + интересы */}
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm">
                  <a href={`tel:${lead.phone}`}
                     className="flex items-center gap-1.5 text-[var(--ocean)] hover:underline">
                    <Phone size={14} />
                    {lead.phone}
                  </a>
                  {interests.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {interests.map(i => (
                        <span key={i} className="text-xs px-2 py-0.5 rounded-full
                          bg-[var(--bg-hover)] text-[var(--text-secondary)]">
                          {INTEREST_LABELS[i] ?? i}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Строка 3: даты + размер группы + источник */}
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-[var(--text-secondary)]">
                  {(sd.date_from || sd.date_to) && (
                    <span className="flex items-center gap-1">
                      <Calendar size={13} />
                      {sd.date_from && fmt(sd.date_from)}
                      {sd.date_to && sd.date_from !== sd.date_to && ` — ${fmt(sd.date_to)}`}
                      {sd.trip_days && ` · ${sd.trip_days} дн.`}
                    </span>
                  )}
                  {lead.route_title && (
                    <span className="flex items-center gap-1">
                      <MapPin size={13} />
                      {lead.route_title}
                    </span>
                  )}
                  {sd.source && (
                    <span className="text-xs text-[var(--text-muted)]">
                      {SOURCE_LABELS[sd.source] ?? sd.source}
                    </span>
                  )}
                </div>

                {/* Комментарий */}
                {lead.comment && (
                  <p className="text-sm text-[var(--text-secondary)] italic border-l-2
                    border-[var(--border)] pl-3">
                    {lead.comment}
                  </p>
                )}

                {/* Кнопки действий */}
                <div className="flex flex-wrap gap-2 pt-1 border-t border-[var(--border)]">
                  {lead.status === 'new' && (
                    <button
                      onClick={() => updateStatus(lead.id, 'contacted')}
                      disabled={updating === lead.id}
                      className="ds-btn ds-btn-primary flex items-center gap-1.5 text-sm"
                    >
                      <Clock size={14} />
                      {updating === lead.id ? 'Обновление...' : 'Взять в работу'}
                    </button>
                  )}
                  {lead.status === 'contacted' && (
                    <>
                      <button
                        onClick={() => updateStatus(lead.id, 'qualified')}
                        disabled={updating === lead.id}
                        className="ds-btn ds-btn-primary flex items-center gap-1.5 text-sm"
                      >
                        <CheckCircle size={14} />
                        Квалифицировать
                      </button>
                      <a
                        href={`/hub/agent/find?interests=${(sd.interests ?? []).join(',')}&date_from=${sd.date_from ?? ''}&date_to=${sd.date_to ?? ''}`}
                        className="ds-btn ds-btn-secondary flex items-center gap-1.5 text-sm"
                      >
                        <Users size={14} />
                        Найти тур
                      </a>
                    </>
                  )}
                  {lead.status === 'qualified' && (
                    <>
                      <button
                        onClick={() => updateStatus(lead.id, 'converted')}
                        disabled={updating === lead.id}
                        className="ds-btn ds-btn-primary flex items-center gap-1.5 text-sm"
                      >
                        <CheckCircle size={14} />
                        Сделка
                      </button>
                      <button
                        onClick={() => updateStatus(lead.id, 'lost')}
                        disabled={updating === lead.id}
                        className="ds-btn flex items-center gap-1.5 text-sm
                          text-[var(--danger)] bg-[var(--danger)]/10 hover:bg-[var(--danger)]/20"
                      >
                        <XCircle size={14} />
                        Отказ
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Подсказка */}
      {!loading && leads.length > 0 && (
        <p className="text-xs text-center text-[var(--text-muted)]">
          Показано {leads.length} заявок
          <span className="mx-2">·</span>
          <button onClick={() => void load()} className="underline hover:no-underline">
            Обновить список
          </button>
        </p>
      )}
    </div>
  );
}
