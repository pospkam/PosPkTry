'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  MessageSquare, Users, Brain, CreditCard, RefreshCw,
  TrendingUp, Sparkles, BarChart2, Activity, ThumbsUp, ThumbsDown, Globe,
  ChevronDown, ChevronRight, Send, User, Copy, Check,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ChannelStats {
  uniqueChats: number;
  totalMsgs: number;
  userMsgs: number;
  lastMsg: string | null;
}

interface AnalyticsData {
  channels: Record<string, ChannelStats>;
  tgTrend: Array<{ day: string; platform: string; chats: number; msgs: number }>;
  ratings: { thumbsUp: number; thumbsDown: number };
  sessions: {
    total: number;
    authenticated: number;
    guests: number;
    avgMessages: number;
    totalMessages: number;
  };
  webTrend: Array<{ day: string; total: number; auth: number }>;
  memory: {
    totalWithMemory: number;
    withNotes: number;
    avgSessions: number;
  };
  actions: Record<string, number>;
  topActivities: Array<{ activity: string; cnt: number }>;
  utmSources: Array<{ source: string; cnt: number }>;
}

interface TgChat {
  chatId: string;
  platform: string;
  userName: string;
  userMsgs: number;
  totalMsgs: number;
  firstMsg: string;
  lastMsg: string;
}

interface WebChat {
  sessionId: string;
  userId: string | null;
  userMsgs: number;
  authenticated: boolean;
  createdAt: string;
  updatedAt: string;
}

interface ChatMessage {
  role: string;
  content: string;
  created_at: string;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatCard({
  icon: Icon, label, value, sub, color = 'accent',
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string | number;
  sub?: string;
  color?: 'accent' | 'ocean' | 'success' | 'warning';
}) {
  const colorMap = {
    accent:  'text-[var(--accent)] bg-[var(--accent)]/10',
    ocean:   'text-[var(--ocean)] bg-[var(--ocean)]/10',
    success: 'text-[var(--success)] bg-[var(--success)]/10',
    warning: 'text-[var(--warning)] bg-[var(--warning)]/10',
  };
  return (
    <div className="ds-card p-5 flex items-start gap-4">
      <div className={`p-2.5 rounded-lg shrink-0 ${colorMap[color]}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <p className="text-xs text-[var(--text-muted)] mb-0.5">{label}</p>
        <p className="text-2xl font-bold text-[var(--text-primary)]">{value}</p>
        {sub && <p className="text-xs text-[var(--text-secondary)] mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

function MiniBar({ data, keyFn, valueFn, colorFn }: {
  data: unknown[];
  keyFn: (d: unknown) => string;
  valueFn: (d: unknown) => number;
  colorFn?: (d: unknown) => string;
}) {
  if (!data.length) return <p className="text-xs text-[var(--text-muted)]">Нет данных</p>;
  const max = Math.max(...data.map(d => valueFn(d)), 1);
  return (
    <div className="flex items-end gap-1 h-20 w-full">
      {data.map(d => (
        <div key={keyFn(d)} className="flex-1 flex flex-col items-center gap-0.5 group">
          <div className="relative w-full flex flex-col justify-end" style={{ height: 64 }}>
            <div
              className="w-full rounded-t transition-all"
              style={{
                height: `${Math.max(4, (valueFn(d) / max) * 100)}%`,
                background: colorFn ? colorFn(d) : 'var(--accent)',
                opacity: 0.7,
              }}
            />
          </div>
          <span className="text-[9px] text-[var(--text-muted)] leading-none">{keyFn(d)}</span>
        </div>
      ))}
    </div>
  );
}

const ACTION_LABELS: Record<string, string> = {
  payment_confirmed:  'Оплаты СБП',
  booking_created:    'Бронирований',
  tour_recommended:   'Рекомендаций',
  vision_analysis:    'Анализ фото',
  memory_synth:       'Синтез памяти',
  lead_qualified:     'Квалиф. лидов',
  chat_limit_reached: 'Лимит гостей',
};

const ACTION_COLORS: Record<string, string> = {
  payment_confirmed:  'text-[var(--success)]',
  booking_created:    'text-[var(--ocean)]',
  tour_recommended:   'text-[var(--accent)]',
  vision_analysis:    'text-[var(--warning)]',
  memory_synth:       'text-[var(--text-secondary)]',
  lead_qualified:     'text-[var(--ocean)]',
  chat_limit_reached: 'text-[var(--text-muted)]',
};

function fmtDate(iso: string | null): string {
  if (!iso) return 'нет';
  return new Date(iso).toLocaleString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

// ─── Channel card ─────────────────────────────────────────────────────────────

const CHANNEL_META: Record<string, { label: string; color: string; emoji: string }> = {
  telegram: { label: 'Telegram', color: 'var(--ocean)',   emoji: '✈' },
  max:      { label: 'Max',      color: 'var(--accent)',  emoji: 'M' },
  web:      { label: 'Сайт',    color: 'var(--success)', emoji: '🌐' },
};

function ChannelCard({ id, stats }: { id: string; stats: ChannelStats }) {
  const meta = CHANNEL_META[id] ?? { label: id, color: 'var(--text-secondary)', emoji: '?' };
  return (
    <div className="ds-card p-5 flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold text-white shrink-0"
          style={{ background: meta.color }}
        >
          {meta.emoji}
        </div>
        <span className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>{meta.label}</span>
      </div>
      <div className="grid grid-cols-3 gap-2 text-center">
        <div>
          <p className="text-xl font-bold" style={{ color: meta.color }}>{stats.uniqueChats.toLocaleString('ru-RU')}</p>
          <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>чатов</p>
        </div>
        <div>
          <p className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>{stats.userMsgs.toLocaleString('ru-RU')}</p>
          <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>сообщений</p>
        </div>
        <div>
          <p className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
            {stats.uniqueChats > 0 ? (stats.userMsgs / stats.uniqueChats).toFixed(1) : '0'}
          </p>
          <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>сред./чат</p>
        </div>
      </div>
      <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
        Последний: {fmtDate(stats.lastMsg)}
      </p>
    </div>
  );
}

// ─── Copy button ──────────────────────────────────────────────────────────────

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  const copy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(value).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };
  return (
    <button
      onClick={copy}
      className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded font-mono
                 text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]
                 transition-colors border border-[var(--border)]"
      title="Скопировать chat_id"
    >
      {copied ? <Check size={9} className="text-[var(--success)]" /> : <Copy size={9} />}
      {value}
    </button>
  );
}

// ─── Chat conversation viewer ─────────────────────────────────────────────────

function ChatRow({ chat, type }: { chat: TgChat | WebChat; type: 'tg' | 'web' }) {
  const [open, setOpen]       = useState(false);
  const [msgs, setMsgs]       = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);

  const toggle = useCallback(async () => {
    if (open) { setOpen(false); return; }
    setOpen(true);
    if (msgs.length > 0) return;
    setLoading(true);
    try {
      const url = type === 'tg'
        ? `/api/admin/ai-analytics/chats?chat_id=${(chat as TgChat).chatId}&platform=${(chat as TgChat).platform}`
        : `/api/admin/ai-analytics/chats?chat_id=${(chat as WebChat).sessionId}`;
      const res  = await fetch(url);
      const json = await res.json() as { messages?: ChatMessage[] };
      setMsgs(json.messages ?? []);
    } finally {
      setLoading(false);
    }
  }, [open, msgs.length, chat, type]);

  const isTg = type === 'tg';
  const tg   = chat as TgChat;
  const web  = chat as WebChat;

  return (
    <div className="border border-[var(--border)] rounded-lg overflow-hidden">
      <button
        onClick={toggle}
        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-[var(--bg-hover)] transition-colors"
      >
        {open ? <ChevronDown size={14} className="shrink-0 text-[var(--text-muted)]" />
               : <ChevronRight size={14} className="shrink-0 text-[var(--text-muted)]" />}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            {isTg && (
              <span
                className="text-[10px] font-semibold px-1.5 py-0.5 rounded"
                style={{
                  background: tg.platform === 'max' ? 'var(--accent)' : 'var(--ocean)',
                  color: 'white',
                }}
              >
                {tg.platform === 'max' ? 'Max' : 'TG'}
              </span>
            )}
            {!isTg && (
              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded"
                style={{ background: 'var(--success)', color: 'white' }}>
                Сайт
              </span>
            )}
            <span className="text-sm font-medium text-[var(--text-primary)] truncate">
              {isTg ? tg.userName : (web.authenticated ? `Пользователь` : 'Гость')}
            </span>
            {isTg && <CopyButton value={tg.chatId} />}
            {!isTg && web.userId && (
              <span className="text-[10px] text-[var(--text-muted)] truncate">#{web.userId.slice(-6)}</span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-4 shrink-0 text-xs text-[var(--text-muted)]">
          <span>{isTg ? tg.userMsgs : web.userMsgs} сообщ.</span>
          <span>{fmtDate(isTg ? tg.lastMsg : web.updatedAt)}</span>
        </div>
      </button>

      {open && (
        <div className="border-t border-[var(--border)] px-4 py-3 max-h-96 overflow-y-auto space-y-2"
          style={{ background: 'var(--bg-primary)' }}>
          {loading && (
            <p className="text-xs text-[var(--text-muted)] py-4 text-center">Загрузка...</p>
          )}
          {!loading && msgs.length === 0 && (
            <p className="text-xs text-[var(--text-muted)] py-4 text-center">Нет сообщений</p>
          )}
          {msgs.map((m, i) => (
            <div key={i} className={`flex gap-2 ${m.role === 'assistant' ? 'flex-row-reverse' : ''}`}>
              <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                m.role === 'assistant'
                  ? 'bg-[var(--accent)] text-white'
                  : 'bg-[var(--bg-hover)] text-[var(--text-secondary)]'
              }`}>
                {m.role === 'assistant'
                  ? <Send size={10} />
                  : <User size={10} />}
              </div>
              <div className={`max-w-[80%] rounded-lg px-3 py-2 text-xs leading-relaxed ${
                m.role === 'assistant'
                  ? 'bg-[var(--accent)]/10 text-[var(--text-primary)]'
                  : 'bg-[var(--bg-card)] text-[var(--text-primary)] border border-[var(--border)]'
              }`}>
                {m.content}
                <p className="text-[9px] mt-1 text-[var(--text-muted)]">
                  {new Date(m.created_at).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ChatsSection() {
  const [tgChats,  setTgChats]  = useState<TgChat[]>([]);
  const [webChats, setWebChats] = useState<WebChat[]>([]);
  const [loaded,   setLoaded]   = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [open,     setOpen]     = useState(false);

  const fetch_ = useCallback(async () => {
    setLoading(true);
    try {
      const res  = await fetch('/api/admin/ai-analytics/chats');
      const json = await res.json() as { tgChats: TgChat[]; webChats: WebChat[] };
      setTgChats(json.tgChats ?? []);
      setWebChats(json.webChats ?? []);
      setLoaded(true);
      setOpen(true);
    } finally {
      setLoading(false);
    }
  }, []);

  const toggle = useCallback(() => {
    if (!loaded) { void fetch_(); return; }
    setOpen(o => !o);
  }, [loaded, fetch_]);

  const total = tgChats.length + webChats.length;

  return (
    <div className="ds-card overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4">
        <button
          onClick={toggle}
          className="flex items-center gap-2 flex-1 text-left"
        >
          <h2 className="ds-h2 flex items-center gap-2">
            <MessageSquare size={16} className="text-[var(--ocean)]" />
            Переписки
            {loaded && <span className="text-xs font-normal text-[var(--text-muted)]">({total} чатов)</span>}
          </h2>
          <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
            {!loaded && !loading && 'Нажмите чтобы загрузить'}
            {open ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          </div>
        </button>
        {loaded && (
          <button
            onClick={() => void fetch_()}
            disabled={loading}
            className="text-xs text-[var(--text-muted)] flex items-center gap-1 hover:text-[var(--text-primary)] transition-colors ml-3"
          >
            <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
          </button>
        )}
      </div>

      {open && !loading && (
        <div className="px-5 pb-5 space-y-2 border-t border-[var(--border)]">
          {tgChats.length === 0 && webChats.length === 0 && (
            <p className="text-xs text-[var(--text-muted)] pt-4 text-center">Нет чатов за 30 дней</p>
          )}
          {[...tgChats.map(c => ({ chat: c, type: 'tg' as const })),
             ...webChats.map(c => ({ chat: c, type: 'web' as const }))
          ]
            .sort((a, b) => {
              const da = a.type === 'tg' ? (a.chat as TgChat).lastMsg   : (a.chat as WebChat).updatedAt;
              const db = b.type === 'tg' ? (b.chat as TgChat).lastMsg   : (b.chat as WebChat).updatedAt;
              return new Date(db).getTime() - new Date(da).getTime();
            })
            .map(({ chat, type }) => (
              <ChatRow key={type === 'tg' ? (chat as TgChat).chatId : (chat as WebChat).sessionId}
                chat={chat} type={type} />
            ))
          }
        </div>
      )}
    </div>
  );
}

// ─── Main component ────────────────────────────────────────────────────────────

export default function AIAnalyticsClient() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshed, setRefreshed] = useState<Date | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/ai-analytics');
      const json = await res.json() as AnalyticsData & { error?: string };
      if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
      if (json.error) throw new Error(json.error);
      setData(json);
      setRefreshed(new Date());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ошибка загрузки');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  return (
    <div className="ds-page py-8 space-y-8">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="ds-h1 flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-[var(--accent)]" />
            Аналитика Кузьмича
          </h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            Все каналы: Telegram, Max, Сайт — последние 30 дней
          </p>
        </div>
        <div className="flex items-center gap-3">
          {refreshed && (
            <p className="text-xs text-[var(--text-muted)]">
              {refreshed.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
            </p>
          )}
          <button onClick={load} disabled={loading}
            className="ds-btn ds-btn-secondary flex items-center gap-2 text-sm">
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            Обновить
          </button>
        </div>
      </div>

      {error && (
        <div className="ds-card p-4 text-sm" style={{ borderColor: 'var(--danger)', color: 'var(--danger)' }}>
          {error}
        </div>
      )}

      {loading && !data && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="ds-card p-5 h-36 ds-skeleton" />
          ))}
        </div>
      )}

      {data && (() => {
        const tg  = data.channels['telegram'] ?? { uniqueChats: 0, totalMsgs: 0, userMsgs: 0, lastMsg: null };
        const max = data.channels['max']      ?? { uniqueChats: 0, totalMsgs: 0, userMsgs: 0, lastMsg: null };
        const web: ChannelStats = {
          uniqueChats: data.sessions.total,
          totalMsgs:   data.sessions.totalMessages,
          userMsgs:    data.sessions.totalMessages,
          lastMsg:     null,
        };

        // Aggregate for totals
        const totalChats = tg.uniqueChats + max.uniqueChats + data.sessions.total;
        const totalMsgs  = tg.userMsgs + max.userMsgs + data.sessions.totalMessages;
        const ratingTotal = data.ratings.thumbsUp + data.ratings.thumbsDown;
        const ratingPct   = ratingTotal > 0 ? Math.round((data.ratings.thumbsUp / ratingTotal) * 100) : null;

        // Build TG trend pivot: days × platform
        type TrendDay = { day: string; telegram: number; max: number };
        const trendMap = new Map<string, TrendDay>();
        for (const row of data.tgTrend) {
          if (!trendMap.has(row.day)) trendMap.set(row.day, { day: row.day, telegram: 0, max: 0 });
          const entry = trendMap.get(row.day)!;
          if (row.platform === 'max') entry.max += row.msgs;
          else entry.telegram += row.msgs;
        }
        const trendDays = Array.from(trendMap.values());

        return (
          <>
            {/* Channel cards */}
            <section className="space-y-3">
              <h2 className="ds-h2">Каналы</h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <ChannelCard id="telegram" stats={tg} />
                <ChannelCard id="max"      stats={max} />
                <ChannelCard id="web"      stats={web} />
              </div>
            </section>

            {/* Summary stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard icon={MessageSquare} label="Всего чатов (30 дн.)" value={totalChats.toLocaleString('ru-RU')} sub={`${totalMsgs.toLocaleString()} сообщений`} color="accent" />
              <StatCard icon={Users}         label="С памятью AI"         value={data.memory.totalWithMemory} sub={`${data.memory.withNotes} с заметками`} color="ocean" />
              <StatCard icon={ThumbsUp}      label="Лайков" value={data.ratings.thumbsUp} sub={ratingPct != null ? `${ratingPct}% позитивных` : 'нет оценок'} color="success" />
              <StatCard icon={Brain}         label="Сред. сессий/юзер" value={data.memory.avgSessions.toFixed(1)} sub="повторные визиты" color="warning" />
            </div>

            {/* Trend + Actions */}
            <div className="grid md:grid-cols-2 gap-6">

              {/* TG/Max trend */}
              <div className="ds-card p-5">
                <h2 className="ds-h2 flex items-center gap-2 mb-4">
                  <TrendingUp size={16} className="text-[var(--accent)]" />
                  Сообщения TG + Max по дням
                </h2>
                <div className="mb-3 flex items-center gap-4 text-xs text-[var(--text-muted)]">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded inline-block" style={{ background: 'var(--ocean)' }} />
                    Telegram
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded inline-block" style={{ background: 'var(--accent)' }} />
                    Max
                  </span>
                </div>
                {trendDays.length === 0 ? (
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Нет данных за 14 дней</p>
                ) : (
                  <div className="flex items-end gap-1 h-20 w-full">
                    {trendDays.map(d => {
                      const total = d.telegram + d.max;
                      const maxVal = Math.max(...trendDays.map(x => x.telegram + x.max), 1);
                      return (
                        <div key={d.day} className="flex-1 flex flex-col items-center gap-0.5 group">
                          <div className="relative w-full flex flex-col justify-end overflow-hidden rounded-t" style={{ height: 64 }}>
                            <div className="absolute bottom-0 w-full" style={{
                              height: `${Math.max(4, (total / maxVal) * 100)}%`,
                              background: 'var(--ocean)', opacity: 0.3,
                            }} />
                            <div className="absolute bottom-0 w-full" style={{
                              height: `${Math.max(0, (d.max / maxVal) * 100)}%`,
                              background: 'var(--accent)', opacity: 0.7,
                            }} />
                          </div>
                          <span className="text-[9px] text-[var(--text-muted)] leading-none">{d.day}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="ds-card p-5">
                <h2 className="ds-h2 flex items-center gap-2 mb-4">
                  <BarChart2 size={16} className="text-[var(--ocean)]" />
                  Ключевые события AI
                </h2>
                {Object.keys(data.actions).length === 0 ? (
                  <p className="text-xs text-[var(--text-muted)]">Нет событий за период</p>
                ) : (
                  <div className="space-y-2.5">
                    {Object.entries(ACTION_LABELS).map(([key, label]) => {
                      const cnt = data.actions[key] ?? 0;
                      return (
                        <div key={key} className="flex items-center justify-between">
                          <span className="text-sm text-[var(--text-secondary)]">{label}</span>
                          <span className={`text-sm font-semibold ${ACTION_COLORS[key] ?? ''}`}>
                            {cnt.toLocaleString('ru-RU')}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Ratings row */}
            <div className="grid md:grid-cols-2 gap-6">
              {/* Ratings */}
              <div className="ds-card p-5">
                <h2 className="ds-h2 flex items-center gap-2 mb-4">
                  <Activity size={16} className="text-[var(--success)]" />
                  Оценки в Telegram/Max
                </h2>
                <div className="flex items-center gap-6">
                  <div className="flex items-center gap-2">
                    <ThumbsUp className="w-5 h-5 text-[var(--success)]" />
                    <span className="text-2xl font-bold text-[var(--success)]">{data.ratings.thumbsUp}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <ThumbsDown className="w-5 h-5 text-[var(--danger)]" />
                    <span className="text-2xl font-bold text-[var(--danger)]">{data.ratings.thumbsDown}</span>
                  </div>
                  {ratingPct != null && (
                    <div className="flex-1">
                      <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--bg-hover)' }}>
                        <div className="h-full rounded-full" style={{ width: `${ratingPct}%`, background: 'var(--success)' }} />
                      </div>
                      <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>{ratingPct}% положительных</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Memory */}
              <div className="ds-card p-5">
                <h2 className="ds-h2 flex items-center gap-2 mb-4">
                  <Brain size={16} className="text-[var(--ocean)]" />
                  Память пользователей
                </h2>
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between text-xs mb-1" style={{ color: 'var(--text-muted)' }}>
                      <span>С AI-заметками</span>
                      <span>{data.memory.withNotes} / {data.memory.totalWithMemory}</span>
                    </div>
                    <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--bg-hover)' }}>
                      <div className="h-full rounded-full" style={{
                        width: `${Math.round((data.memory.withNotes / Math.max(data.memory.totalWithMemory, 1)) * 100)}%`,
                        background: 'var(--success)',
                      }} />
                    </div>
                  </div>
                  <div className="flex items-center gap-2 p-3 rounded-lg" style={{ background: 'var(--bg-hover)' }}>
                    <CreditCard size={14} className="text-[var(--success)] shrink-0" />
                    <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                      Оплаты через Кузьмича: <strong style={{ color: 'var(--success)' }}>{(data.actions['payment_confirmed'] ?? 0).toLocaleString('ru-RU')}</strong>
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Top interests */}
            {data.topActivities.length > 0 && (
              <div className="ds-card p-5">
                <h2 className="ds-h2 flex items-center gap-2 mb-4">
                  <Sparkles size={16} className="text-[var(--warning)]" />
                  Топ интересов пользователей
                </h2>
                <div className="flex flex-wrap gap-2">
                  {data.topActivities.map(({ activity, cnt }) => (
                    <span key={activity}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs border border-[var(--border)]"
                      style={{ color: 'var(--text-secondary)' }}>
                      {activity}
                      <span className="font-semibold" style={{ color: 'var(--accent)' }}>{cnt}</span>
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Chats drill-down */}
            <ChatsSection />

            {/* UTM Sources */}
            {data.utmSources.length > 0 && (
              <div className="ds-card p-5">
                <h2 className="ds-h2 flex items-center gap-2 mb-4">
                  <Globe size={16} className="text-[var(--accent)]" />
                  Источники трафика (UTM)
                </h2>
                <div className="space-y-2">
                  {data.utmSources.map(({ source, cnt }) => {
                    const maxCnt = data.utmSources[0]?.cnt ?? 1;
                    return (
                      <div key={source} className="flex items-center gap-3">
                        <span className="text-xs w-24 truncate shrink-0" style={{ color: 'var(--text-secondary)' }}>{source}</span>
                        <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--bg-hover)' }}>
                          <div className="h-full rounded-full" style={{ width: `${Math.round((cnt / maxCnt) * 100)}%`, background: 'var(--accent)' }} />
                        </div>
                        <span className="text-xs font-semibold w-8 text-right" style={{ color: 'var(--text-primary)' }}>{cnt}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        );
      })()}
    </div>
  );
}
