'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  HardHat, Send, CheckCircle2, Clock, AlertCircle, XCircle,
  Bug, Lightbulb, Shield, MessageSquare, RefreshCw, ChevronRight,
  ExternalLink, CheckSquare, Square,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Wish {
  id: number;
  message: string;
  category: string;
  priority: string;
  status: string;
  admin_reply: string | null;
  created_at: string;
}

interface Stats {
  total: number;
  new: number;
  in_progress: number;
  done: number;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_META: Record<string, { label: string; color: string; Icon: typeof CheckCircle2 }> = {
  new:         { label: 'Новое',       color: 'var(--ocean)',   Icon: AlertCircle   },
  reviewed:    { label: 'Рассмотрено', color: 'var(--warning)', Icon: Clock         },
  in_progress: { label: 'В работе',    color: 'var(--accent)',  Icon: RefreshCw     },
  done:        { label: 'Готово',      color: 'var(--success)', Icon: CheckCircle2  },
  rejected:    { label: 'Отклонено',   color: 'var(--danger)',  Icon: XCircle       },
};

const CATEGORY_META: Record<string, { label: string; Icon: typeof Bug }> = {
  bug:     { label: 'Баг',              Icon: Bug         },
  feature: { label: 'Предложение',      Icon: Lightbulb   },
  safety:  { label: 'Безопасность',     Icon: Shield      },
  general: { label: 'Общее',            Icon: MessageSquare },
};

const PRIORITY_COLOR: Record<string, string> = {
  high:   'var(--danger)',
  medium: 'var(--warning)',
  low:    'var(--text-muted)',
};

const PRIORITY_LABEL: Record<string, string> = {
  high: 'Высокий', medium: 'Средний', low: 'Низкий',
};

// Страницы платформы для чеклиста тестирования
const CHECKLIST_ITEMS = [
  { id: 'home',     label: 'Главная страница',            href: '/'                         },
  { id: 'chat',     label: 'AI-чат (Кузьмич)',            href: '/#chat'                    },
  { id: 'routes',   label: 'Список маршрутов',            href: '/routes'                   },
  { id: 'route1',   label: 'Карточка маршрута',           href: '/routes'                   },
  { id: 'booking',  label: 'Форма бронирования',          href: '/routes'                   },
  { id: 'sos',      label: 'SOS-кнопка и форма',          href: '/'                         },
  { id: 'signup',   label: 'Регистрация',                 href: '/auth/signup'              },
  { id: 'signin',   label: 'Вход в аккаунт',              href: '/auth/signin'              },
  { id: 'search',   label: 'Поиск (модальное окно)',      href: '/'                         },
  { id: 'mobile',   label: 'Мобильная навигация (pill)',  href: '/'                         },
  { id: 'tourist',  label: 'ЛК туриста',                  href: '/hub/tourist'              },
  { id: 'safety',   label: 'Дашборд безопасности',        href: '/hub/admin/safety'         },
];

type CheckStatus = 'unchecked' | 'ok' | 'bug';

// ─── Компонент чеклиста ───────────────────────────────────────────────────────

function TestChecklist() {
  const [checks, setChecks] = useState<Record<string, CheckStatus>>(() => {
    if (typeof window === 'undefined') return {};
    try {
      return JSON.parse(localStorage.getItem('artem_checklist') ?? '{}');
    } catch { return {}; }
  });

  const toggle = useCallback((id: string) => {
    setChecks(prev => {
      const cycle: CheckStatus[] = ['unchecked', 'ok', 'bug'];
      const cur = prev[id] ?? 'unchecked';
      const next = cycle[(cycle.indexOf(cur) + 1) % cycle.length];
      const updated = { ...prev, [id]: next };
      try { localStorage.setItem('artem_checklist', JSON.stringify(updated)); } catch { /* ignore */ }
      return updated;
    });
  }, []);

  const done  = Object.values(checks).filter(v => v === 'ok').length;
  const bugs  = Object.values(checks).filter(v => v === 'bug').length;

  return (
    <div className="ds-card p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="ds-h2 text-base">Чеклист тестирования</h3>
        <div className="flex gap-3 text-xs">
          <span style={{ color: 'var(--success)' }}>{done} OK</span>
          <span style={{ color: 'var(--danger)' }}>{bugs} баг</span>
        </div>
      </div>

      <div className="space-y-1.5">
        {CHECKLIST_ITEMS.map(item => {
          const status = checks[item.id] ?? 'unchecked';
          return (
            <div
              key={item.id}
              className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-[var(--bg-hover)] transition-colors"
            >
              <button
                onClick={() => toggle(item.id)}
                className="shrink-0 transition-transform active:scale-90"
                title="Нажми: нет проверки → OK → Баг"
              >
                {status === 'unchecked' && <Square className="w-4 h-4 text-[var(--text-muted)]" />}
                {status === 'ok'        && <CheckSquare className="w-4 h-4" style={{ color: 'var(--success)' }} />}
                {status === 'bug'       && <Bug className="w-4 h-4" style={{ color: 'var(--danger)' }} />}
              </button>
              <span
                className="flex-1 text-sm"
                style={{ color: status === 'bug' ? 'var(--danger)' : 'var(--text-primary)' }}
              >
                {item.label}
              </span>
              <a
                href={item.href}
                target="_blank"
                rel="noopener noreferrer"
                className="shrink-0 opacity-40 hover:opacity-100 transition-opacity"
              >
                <ExternalLink className="w-3.5 h-3.5 text-[var(--text-muted)]" />
              </a>
            </div>
          );
        })}
      </div>

      <p className="mt-3 text-xs text-[var(--text-muted)]">
        Нажми иконку: квадрат → OK → Баг. Прогресс сохраняется в браузере.
      </p>
    </div>
  );
}

// ─── Главный компонент ────────────────────────────────────────────────────────

export function ArtemWorkspaceClient() {
  const [wishes, setWishes]   = useState<Wish[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [tab, setTab]         = useState<'feed' | 'new' | 'checklist'>('feed');

  const [message,  setMessage]  = useState('');
  const [category, setCategory] = useState<'bug' | 'feature' | 'safety' | 'general'>('bug');
  const [priority, setPriority] = useState<'high' | 'medium' | 'low'>('medium');

  const bottomRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/safety/wishes?stakeholder=artem');
      if (res.ok) {
        const data = await res.json() as { wishes: Wish[] };
        setWishes(data.wishes ?? []);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  useEffect(() => {
    if (tab === 'feed') bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [wishes, tab]);

  const stats: Stats = {
    total:       wishes.length,
    new:         wishes.filter(w => w.status === 'new').length,
    in_progress: wishes.filter(w => w.status === 'in_progress').length,
    done:        wishes.filter(w => w.status === 'done').length,
  };

  async function handleSend() {
    if (!message.trim() || sending) return;
    setSending(true);
    try {
      const res = await fetch('/api/safety/wishes', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ stakeholder: 'artem', message: message.trim(), category, priority }),
      });
      if (res.ok) {
        setMessage('');
        setTab('feed');
        await load();
      }
    } finally {
      setSending(false);
    }
  }

  function relTime(iso: string): string {
    const diff = Date.now() - new Date(iso).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 60)   return `${m} мин назад`;
    if (m < 1440) return `${Math.floor(m / 60)} ч назад`;
    return `${Math.floor(m / 1440)} дн назад`;
  }

  return (
    <div className="ds-page max-w-4xl mx-auto py-8 px-4 space-y-6">

      {/* Header */}
      <div className="flex items-start gap-4">
        <div
          className="w-14 h-14 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: 'var(--accent)' }}
        >
          <HardHat className="w-7 h-7 text-white" />
        </div>
        <div>
          <h1 className="ds-h1 text-2xl">Рабочее место МЧС</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>
            Артём Михайлов · Координатор МЧС Камчатского края · Тестировщик платформы
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Всего',     value: stats.total,       color: 'var(--text-primary)' },
          { label: 'Новых',     value: stats.new,         color: 'var(--ocean)'        },
          { label: 'В работе',  value: stats.in_progress, color: 'var(--accent)'       },
          { label: 'Решено',    value: stats.done,        color: 'var(--success)'      },
        ].map(s => (
          <div key={s.label} className="ds-card p-4 text-center">
            <div className="text-2xl font-bold" style={{ color: s.color }}>{s.value}</div>
            <div className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-lg" style={{ background: 'var(--bg-hover)' }}>
        {[
          { key: 'feed',      label: 'Мои рекомендации' },
          { key: 'new',       label: 'Новая запись'     },
          { key: 'checklist', label: 'Тест-чеклист'     },
        ].map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key as typeof tab)}
            className="flex-1 py-2 px-3 rounded-md text-sm font-medium transition-all"
            style={tab === t.key ? {
              background: 'var(--bg-card)',
              color:      'var(--text-primary)',
              boxShadow:  '0 1px 3px rgba(0,0,0,0.1)',
            } : {
              color: 'var(--text-muted)',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Feed ─────────────────────────────────────────────────────────────── */}
      {tab === 'feed' && (
        <div className="space-y-3">
          {loading ? (
            <div className="flex justify-center py-16">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-[var(--border)] border-t-[var(--accent)]" />
            </div>
          ) : wishes.length === 0 ? (
            <div className="ds-card p-12 text-center">
              <MessageSquare className="w-10 h-10 mx-auto mb-3 text-[var(--text-muted)]" />
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                Записей пока нет. Перейди на вкладку «Новая запись» и отправь первую рекомендацию.
              </p>
              <button
                onClick={() => setTab('new')}
                className="mt-4 ds-btn ds-btn-primary text-sm"
              >
                Написать рекомендацию
              </button>
            </div>
          ) : (
            [...wishes].reverse().map(w => {
              const st   = STATUS_META[w.status] ?? STATUS_META.new;
              const cat  = CATEGORY_META[w.category] ?? CATEGORY_META.general;
              const CatIcon = cat.Icon;
              const StIcon  = st.Icon;
              return (
                <div key={w.id} className="ds-card p-4">
                  <div className="flex items-start gap-3">
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
                      style={{ background: 'var(--bg-hover)' }}
                    >
                      <CatIcon className="w-4 h-4" style={{ color: 'var(--accent)' }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1.5">
                        <span className="text-xs font-medium px-2 py-0.5 rounded-full" style={{
                          background: 'var(--bg-hover)', color: 'var(--text-secondary)',
                        }}>
                          {cat.label}
                        </span>
                        <span className="text-xs font-medium" style={{ color: PRIORITY_COLOR[w.priority] }}>
                          {PRIORITY_LABEL[w.priority]}
                        </span>
                        <span className="text-xs ml-auto" style={{ color: 'var(--text-muted)' }}>
                          {relTime(w.created_at)}
                        </span>
                      </div>
                      <p className="text-sm leading-relaxed" style={{ color: 'var(--text-primary)' }}>
                        {w.message}
                      </p>
                      {w.admin_reply && (
                        <div
                          className="mt-3 p-3 rounded-lg text-sm"
                          style={{ background: 'var(--bg-hover)', borderLeft: '3px solid var(--accent)' }}
                        >
                          <span className="text-xs font-semibold block mb-1" style={{ color: 'var(--accent)' }}>
                            Ответ администратора
                          </span>
                          <span style={{ color: 'var(--text-secondary)' }}>{w.admin_reply}</span>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <StIcon className="w-4 h-4" style={{ color: st.color }} />
                      <span className="text-xs font-medium" style={{ color: st.color }}>{st.label}</span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
          <div ref={bottomRef} />
        </div>
      )}

      {/* ── New form ─────────────────────────────────────────────────────────── */}
      {tab === 'new' && (
        <div className="ds-card p-6 space-y-5">
          <h2 className="ds-h2 text-base">Новая рекомендация / баг-репорт</h2>

          {/* Category */}
          <div>
            <label className="ds-label mb-2 block">Тип</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {(['bug', 'feature', 'safety', 'general'] as const).map(c => {
                const meta = CATEGORY_META[c];
                const CatIcon = meta.Icon;
                return (
                  <button
                    key={c}
                    onClick={() => setCategory(c)}
                    className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium border transition-all"
                    style={category === c ? {
                      borderColor: 'var(--accent)',
                      background:  'rgba(212,74,12,0.08)',
                      color:       'var(--accent)',
                    } : {
                      borderColor: 'var(--border)',
                      color:       'var(--text-secondary)',
                    }}
                  >
                    <CatIcon className="w-4 h-4" />
                    {meta.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Priority */}
          <div>
            <label className="ds-label mb-2 block">Приоритет</label>
            <div className="flex gap-2">
              {(['high', 'medium', 'low'] as const).map(p => (
                <button
                  key={p}
                  onClick={() => setPriority(p)}
                  className="flex-1 py-2 px-3 rounded-lg text-sm font-medium border transition-all"
                  style={priority === p ? {
                    borderColor: PRIORITY_COLOR[p],
                    background:  `${PRIORITY_COLOR[p]}18`,
                    color:       PRIORITY_COLOR[p],
                  } : {
                    borderColor: 'var(--border)',
                    color:       'var(--text-muted)',
                  }}
                >
                  {PRIORITY_LABEL[p]}
                </button>
              ))}
            </div>
          </div>

          {/* Message */}
          <div>
            <label className="ds-label mb-2 block">
              Описание
              {category === 'bug' && (
                <span className="ml-2 font-normal text-[var(--text-muted)]">
                  — шаги воспроизведения, что ожидал, что получил
                </span>
              )}
            </label>
            <textarea
              value={message}
              onChange={e => setMessage(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && e.metaKey) handleSend(); }}
              className="ds-input w-full resize-none"
              rows={5}
              placeholder={
                category === 'bug'
                  ? 'Например: на странице маршрута кнопка «Забронировать» не реагирует на нажатие в Safari. Шаги: открыть /routes/123 → нажать кнопку → ничего не происходит.'
                  : category === 'safety'
                  ? 'Опишите проблему безопасности или риск для туристов...'
                  : 'Опишите предложение или замечание...'
              }
            />
            <p className="text-xs mt-1.5" style={{ color: 'var(--text-muted)' }}>
              Cmd/Ctrl + Enter для быстрой отправки
            </p>
          </div>

          <button
            onClick={handleSend}
            disabled={!message.trim() || sending}
            className="ds-btn ds-btn-primary flex items-center gap-2 w-full justify-center"
          >
            {sending ? (
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-white/30 border-t-white" />
            ) : (
              <Send className="w-4 h-4" />
            )}
            {sending ? 'Отправляем...' : 'Отправить'}
          </button>
        </div>
      )}

      {/* ── Checklist ────────────────────────────────────────────────────────── */}
      {tab === 'checklist' && <TestChecklist />}

      {/* Quick link to safety */}
      <div
        className="ds-card p-4 flex items-center justify-between cursor-pointer hover:bg-[var(--bg-hover)] transition-colors"
        onClick={() => window.open('/hub/admin/safety', '_blank')}
      >
        <div className="flex items-center gap-3">
          <Shield className="w-5 h-5" style={{ color: 'var(--danger)' }} />
          <div>
            <div className="text-sm font-medium">Дашборд безопасности МЧС</div>
            <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
              Активные SOS-сигналы, мониторинг маршрутов
            </div>
          </div>
        </div>
        <ChevronRight className="w-4 h-4 text-[var(--text-muted)]" />
      </div>
    </div>
  );
}
