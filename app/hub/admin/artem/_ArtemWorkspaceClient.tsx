'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import {
  Send, CheckCircle, Clock, AlertCircle, RefreshCw,
  Lightbulb, Bug, Shield, MessageSquare, ChevronRight,
} from 'lucide-react';

// ── Types ──────────────────────────────────────────────────────────────────

interface Wish {
  id: number;
  message: string;
  category: string;
  priority: string;
  status: string;
  admin_reply: string | null;
  created_at: string;
  updated_at: string;
}

const CATEGORIES = [
  { id: 'feature',  label: 'Идея',        Icon: Lightbulb },
  { id: 'bug',      label: 'Проблема',     Icon: Bug       },
  { id: 'safety',   label: 'Безопасность', Icon: Shield    },
  { id: 'general',  label: 'Общее',        Icon: MessageSquare },
] as const;

const STATUS_CFG: Record<string, { label: string; color: string; Icon: typeof Clock }> = {
  new:         { label: 'Новое',       color: 'var(--ocean)',   Icon: MessageSquare },
  reviewed:    { label: 'Прочитано',   color: 'var(--warning)', Icon: Clock         },
  in_progress: { label: 'В работе',    color: 'var(--accent)',  Icon: RefreshCw     },
  done:        { label: 'Выполнено',   color: 'var(--success)', Icon: CheckCircle   },
  rejected:    { label: 'Отклонено',   color: 'var(--danger)',  Icon: AlertCircle   },
};

const PRIORITY_CFG: Record<string, string> = {
  high:   'var(--danger)',
  medium: 'var(--warning)',
  low:    'var(--text-muted)',
};

// ── Инструкция ─────────────────────────────────────────────────────────────

function Instructions() {
  const [open, setOpen] = useState(true);
  return (
    <div className="ds-card mb-6 border-l-4 border-[var(--ocean)]">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-6 py-4 text-left"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-[var(--ocean)] bg-opacity-15 flex items-center justify-center">
            <MessageSquare className="w-4 h-4 text-[var(--ocean)]" />
          </div>
          <span className="font-semibold text-[var(--text-primary)]">Как пользоваться рабочим местом</span>
        </div>
        <ChevronRight className={`w-4 h-4 text-[var(--text-secondary)] transition-transform ${open ? 'rotate-90' : ''}`} />
      </button>
      {open && (
        <div className="px-6 pb-6 space-y-4 text-sm text-[var(--text-secondary)]">
          <p className="text-[var(--text-primary)] font-medium">
            Артём, это твоя личная рабочая область на платформе KamchatourHub.
          </p>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="bg-[var(--bg-hover)] rounded-lg p-4">
              <p className="font-medium text-[var(--text-primary)] mb-2">Как давать задачи</p>
              <ol className="space-y-1.5 list-decimal list-inside">
                <li>Выбери категорию задачи внизу страницы</li>
                <li>Напиши задачу или идею в поле ввода</li>
                <li>Нажми «Отправить» или Enter</li>
                <li>Команда получит уведомление и приступит</li>
              </ol>
            </div>
            <div className="bg-[var(--bg-hover)] rounded-lg p-4">
              <p className="font-medium text-[var(--text-primary)] mb-2">Статусы задач</p>
              <div className="space-y-1.5">
                {Object.entries(STATUS_CFG).map(([key, cfg]) => (
                  <div key={key} className="flex items-center gap-2">
                    <cfg.Icon className="w-3.5 h-3.5 shrink-0" style={{ color: cfg.color }} />
                    <span style={{ color: cfg.color }} className="font-medium text-xs">{cfg.label}</span>
                    <span className="text-xs text-[var(--text-muted)]">—</span>
                    <span className="text-xs">
                      {key === 'new' && 'задача получена, ждёт обработки'}
                      {key === 'reviewed' && 'команда прочитала'}
                      {key === 'in_progress' && 'в активной разработке'}
                      {key === 'done' && 'выполнено, можно проверять'}
                      {key === 'rejected' && 'отклонено с пояснением'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="bg-[var(--bg-hover)] rounded-lg p-4">
            <p className="font-medium text-[var(--text-primary)] mb-2">Категории задач</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {CATEGORIES.map(({ id, label, Icon }) => (
                <div key={id} className="flex items-center gap-2">
                  <Icon className="w-4 h-4 text-[var(--ocean)]" />
                  <div>
                    <p className="text-xs font-medium text-[var(--text-primary)]">{label}</p>
                    <p className="text-[10px] text-[var(--text-muted)]">
                      {id === 'feature'  && 'новые функции, улучшения'}
                      {id === 'bug'      && 'что-то не работает'}
                      {id === 'safety'   && 'вопросы безопасности туристов'}
                      {id === 'general'  && 'всё остальное'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <p className="text-[10px] text-[var(--text-muted)]">
            Ответ команды появится прямо под твоей задачей. Страница обновляется автоматически каждую минуту.
          </p>
        </div>
      )}
    </div>
  );
}

// ── Карточка задачи ────────────────────────────────────────────────────────

function WishCard({ wish }: { wish: Wish }) {
  const st  = STATUS_CFG[wish.status] ?? STATUS_CFG.new;
  const cat = CATEGORIES.find(c => c.id === wish.category);
  const CatIcon = cat?.Icon ?? MessageSquare;

  return (
    <div className="ds-card p-5 hover:shadow-sm transition-shadow">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium"
            style={{ background: `${st.color}18`, color: st.color }}
          >
            <st.Icon className="w-3 h-3" />
            {st.label}
          </span>
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] bg-[var(--bg-hover)] text-[var(--text-secondary)]">
            <CatIcon className="w-3 h-3" />
            {cat?.label ?? wish.category}
          </span>
          <span
            className="w-2 h-2 rounded-full"
            style={{ background: PRIORITY_CFG[wish.priority] ?? 'var(--text-muted)' }}
            title={`Приоритет: ${wish.priority}`}
          />
        </div>
        <span className="text-[10px] text-[var(--text-muted)] shrink-0">
          {new Date(wish.created_at).toLocaleString('ru-RU', {
            day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
          })}
        </span>
      </div>

      {/* Message */}
      <p className="text-sm text-[var(--text-primary)] leading-relaxed whitespace-pre-wrap">
        {wish.message}
      </p>

      {/* Admin reply */}
      {wish.admin_reply && (
        <div className="mt-3 pl-4 border-l-2 border-[var(--accent)] bg-[var(--bg-hover)] rounded-r-lg py-2 pr-3">
          <p className="text-[10px] font-semibold text-[var(--accent)] mb-1">Ответ команды</p>
          <p className="text-sm text-[var(--text-secondary)] leading-relaxed">{wish.admin_reply}</p>
          <p className="text-[10px] text-[var(--text-muted)] mt-1">
            {new Date(wish.updated_at).toLocaleString('ru-RU', {
              day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
            })}
          </p>
        </div>
      )}
    </div>
  );
}

// ── Главный компонент ──────────────────────────────────────────────────────

export function ArtemWorkspaceClient() {
  const [wishes, setWishes]       = useState<Wish[]>([]);
  const [loading, setLoading]     = useState(true);
  const [sending, setSending]     = useState(false);
  const [input, setInput]         = useState('');
  const [category, setCategory]   = useState<string>('general');
  const [priority, setPriority]   = useState<string>('medium');
  const [refreshed, setRefreshed] = useState<Date | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const fetchWishes = useCallback(async () => {
    try {
      const res = await fetch('/api/safety/wishes?stakeholder=artem');
      if (res.ok) {
        const d = await res.json();
        setWishes(d.wishes ?? []);
        setRefreshed(new Date());
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchWishes();
    const id = setInterval(fetchWishes, 60_000);
    return () => clearInterval(id);
  }, [fetchWishes]);

  async function handleSend() {
    const text = input.trim();
    if (!text || sending) return;
    setSending(true);
    try {
      const res = await fetch('/api/safety/wishes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stakeholder: 'artem', message: text, category, priority }),
      });
      if (res.ok) {
        setInput('');
        textareaRef.current?.focus();
        await fetchWishes();
      }
    } finally {
      setSending(false);
    }
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleSend();
    }
  }

  const done       = wishes.filter(w => w.status === 'done').length;
  const inProgress = wishes.filter(w => w.status === 'in_progress').length;
  const pending    = wishes.filter(w => w.status === 'new' || w.status === 'reviewed').length;

  return (
    <div className="ds-page min-h-screen">
      <div className="max-w-3xl mx-auto">

        {/* Заголовок */}
        <div className="mb-8">
          <h1 className="ds-h1 mb-1">Рабочее место</h1>
          <p className="text-[var(--text-secondary)]">Артём · KamchatourHub</p>
        </div>

        {/* Инструкция */}
        <Instructions />

        {/* Статистика */}
        {wishes.length > 0 && (
          <div className="grid grid-cols-3 gap-3 mb-6">
            {[
              { label: 'Выполнено',  value: done,       color: 'var(--success)', Icon: CheckCircle  },
              { label: 'В работе',   value: inProgress,  color: 'var(--accent)',  Icon: RefreshCw    },
              { label: 'Ожидают',    value: pending,     color: 'var(--ocean)',   Icon: Clock        },
            ].map(({ label, value, color, Icon }) => (
              <div key={label} className="ds-card p-4 text-center">
                <Icon className="w-5 h-5 mx-auto mb-1" style={{ color }} />
                <p className="text-2xl font-bold text-[var(--text-primary)]">{value}</p>
                <p className="text-xs text-[var(--text-secondary)] mt-0.5">{label}</p>
              </div>
            ))}
          </div>
        )}

        {/* Список задач */}
        <div className="space-y-3 mb-6">
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-7 w-7 border border-[var(--border)] border-t-[var(--accent)]" />
            </div>
          ) : wishes.length === 0 ? (
            <div className="ds-card p-10 text-center">
              <MessageSquare className="w-10 h-10 mx-auto mb-3 text-[var(--text-muted)] opacity-40" />
              <p className="text-[var(--text-secondary)] font-medium">Пока задач нет</p>
              <p className="text-sm text-[var(--text-muted)] mt-1">
                Напиши первую задачу или идею — команда получит уведомление
              </p>
            </div>
          ) : (
            wishes.map(w => <WishCard key={w.id} wish={w} />)
          )}
        </div>

        {/* Форма ввода */}
        <div className="ds-card p-5 sticky bottom-4 shadow-lg">
          <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-3">
            Новая задача
          </p>

          {/* Категория */}
          <div className="flex gap-2 mb-3 flex-wrap">
            {CATEGORIES.map(({ id, label, Icon }) => (
              <button
                key={id}
                onClick={() => setCategory(id)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  category === id
                    ? 'bg-[var(--ocean)] text-white'
                    : 'bg-[var(--bg-hover)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                <Icon className="w-3 h-3" />
                {label}
              </button>
            ))}
            <div className="ml-auto flex gap-1.5">
              {(['high', 'medium', 'low'] as const).map(p => (
                <button
                  key={p}
                  onClick={() => setPriority(p)}
                  className={`w-2.5 h-2.5 rounded-full transition-all mt-1.5 ${
                    priority === p ? 'scale-125 ring-2 ring-offset-1 ring-[var(--border)]' : ''
                  }`}
                  style={{ background: PRIORITY_CFG[p] }}
                  title={p === 'high' ? 'Высокий' : p === 'medium' ? 'Средний' : 'Низкий'}
                />
              ))}
            </div>
          </div>

          {/* Текст + кнопка */}
          <div className="flex gap-2">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKey}
              placeholder="Напиши задачу, идею или вопрос... (Ctrl+Enter — отправить)"
              rows={3}
              className="ds-input flex-1 resize-none text-sm"
              disabled={sending}
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || sending}
              className="ds-btn ds-btn-primary self-end flex items-center gap-2 px-5"
            >
              {sending
                ? <div className="animate-spin rounded-full h-4 w-4 border border-white border-t-transparent" />
                : <Send className="w-4 h-4" />
              }
              <span className="text-sm">Отправить</span>
            </button>
          </div>

          {refreshed && (
            <p className="text-[10px] text-[var(--text-muted)] mt-2 text-right">
              Обновлено: {refreshed.toLocaleTimeString('ru-RU')}
            </p>
          )}
        </div>

      </div>
    </div>
  );
}
