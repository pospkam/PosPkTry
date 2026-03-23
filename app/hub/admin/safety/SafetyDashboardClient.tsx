'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import {
  AlertCircle, AlertTriangle, CheckCircle, Clock, Users,
  RefreshCw, Radio, CloudRain, BookOpen, ShieldAlert, PhoneCall,
  Send, MessageSquare,
} from 'lucide-react';

// ── Types ──────────────────────────────────────────────────────────────────

interface Alert {
  id: number;
  alert_type: string;
  severity: number;
  title: string;
  description: string;
  affected_zones: string[];
  created_at: string;
  expires_at: string;
  affected_route_count: number;
}

interface CapacityItem {
  agent_route_id: number;
  title: string;
  capacity_remaining: number;
  capacity_per_day: number;
  recommender_status: string;
  tourists_today: number;
  active_alerts?: string[];
  alert_severity: number;
}

type BriefingTab = 'sos' | 'weather' | 'protocols';

interface ChatMsg {
  role: 'user' | 'assistant';
  content: string;
  ts: number;
}

// ── MchsConsultChat ───────────────────────────────────────────────────────

function MchsConsultChat() {
  const [history, setHistory] = useState<ChatMsg[]>([]);
  const [input, setInput]     = useState('');
  const [sending, setSending] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [history]);

  async function sendMessage() {
    const text = input.trim();
    if (!text || sending) return;

    const userMsg: ChatMsg = { role: 'user', content: text, ts: Date.now() };
    const nextHistory = [...history, userMsg];
    setHistory(nextHistory);
    setInput('');
    setSending(true);

    try {
      const res = await fetch('/api/agents/rescue-consult', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          history: nextHistory.slice(-10).map(m => ({ role: m.role, content: m.content })),
        }),
      });
      const data = await res.json();
      if (data.reply) {
        setHistory(prev => [...prev, { role: 'assistant', content: data.reply, ts: Date.now() }]);
      } else {
        setHistory(prev => [...prev, { role: 'assistant', content: `Ошибка: ${data.error ?? 'нет ответа'}`, ts: Date.now() }]);
      }
    } catch {
      setHistory(prev => [...prev, { role: 'assistant', content: 'Связь потеряна. Попробуйте снова.', ts: Date.now() }]);
    } finally {
      setSending(false);
    }
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  }

  return (
    <div className="flex flex-col h-[520px]">
      {/* Agent header */}
      <div className="flex items-center gap-3 px-6 py-4 border-b border-[var(--border)]">
        <div className="w-9 h-9 rounded-full bg-[var(--warning)] bg-opacity-15 flex items-center justify-center">
          <MessageSquare className="w-4 h-4 text-[var(--warning)]" />
        </div>
        <div>
          <p className="font-semibold text-sm text-[var(--text-primary)]">AI Спасатель — Консультация МЧС</p>
          <p className="text-xs text-[var(--text-secondary)]">
            Задавайте вопросы — AI знает текущую обстановку по всем зонам Камчатки
          </p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {history.length === 0 && (
          <div className="text-center py-12 text-[var(--text-secondary)] text-sm">
            <ShieldAlert className="w-8 h-8 mx-auto mb-3 text-[var(--warning)] opacity-40" />
            <p className="font-medium mb-1">Опишите ситуацию или задайте вопрос</p>
            <p className="text-xs text-[var(--text-muted)]">
              Например: «Шивелуч дал выброс 8 км, у нас группа в р-не Ключей» или «Нужен протокол эвакуации при землетрясении»
            </p>
          </div>
        )}
        {history.map((msg, i) => (
          <div
            key={i}
            className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
          >
            <div className={`w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold ${
              msg.role === 'user'
                ? 'bg-[var(--ocean)] bg-opacity-20 text-[var(--ocean)]'
                : 'bg-[var(--warning)] bg-opacity-20 text-[var(--warning)]'
            }`}>
              {msg.role === 'user' ? 'МЧС' : 'AI'}
            </div>
            <div className={`max-w-[80%] px-4 py-3 rounded-lg text-sm leading-relaxed ${
              msg.role === 'user'
                ? 'bg-[var(--ocean)] bg-opacity-10 text-[var(--text-primary)]'
                : 'bg-[var(--bg-hover)] text-[var(--text-primary)]'
            }`}>
              <p className="whitespace-pre-wrap">{msg.content}</p>
              <p className="text-xs text-[var(--text-muted)] mt-1">
                {new Date(msg.ts).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          </div>
        ))}
        {sending && (
          <div className="flex gap-3">
            <div className="w-7 h-7 rounded-full bg-[var(--warning)] bg-opacity-20 flex items-center justify-center text-xs font-bold text-[var(--warning)]">AI</div>
            <div className="bg-[var(--bg-hover)] px-4 py-3 rounded-lg flex items-center gap-2">
              <div className="animate-spin rounded-full h-3 w-3 border border-[var(--border)] border-t-[var(--warning)]" />
              <span className="text-xs text-[var(--text-secondary)]">Анализирую обстановку...</span>
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-[var(--border)] flex gap-2">
        <textarea
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKey}
          placeholder="Опишите ситуацию... (Enter — отправить)"
          rows={2}
          className="ds-input flex-1 resize-none text-sm"
          disabled={sending}
        />
        <button
          onClick={sendMessage}
          disabled={sending || !input.trim()}
          className="ds-btn ds-btn-primary px-4 self-end flex items-center gap-2"
        >
          <Send className="w-4 h-4" />
          <span className="text-sm">Отправить</span>
        </button>
      </div>
    </div>
  );
}

// ── RescueBriefing — AI Спасатель блок ────────────────────────────────────

function RescueBriefing() {
  const [activeTab, setActiveTab] = useState<BriefingTab>('sos');
  const [text, setText] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchBriefing = useCallback(async (type: BriefingTab) => {
    setLoading(true);
    setText('');
    try {
      const res = await fetch(`/api/agents/rescue-briefing?type=${type}`);
      const data = await res.json();
      if (data.success) {
        setText(data.response ?? '');
        setLastUpdated(new Date());
      } else {
        setText(`Ошибка брифинга: ${data.error}`);
      }
    } catch {
      setText('Нет связи с AI Спасателем.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchBriefing(activeTab); }, [activeTab, fetchBriefing]);

  const TABS: { id: BriefingTab; label: string; Icon: typeof Radio }[] = [
    { id: 'sos',       label: 'SOS-инциденты', Icon: Radio },
    { id: 'weather',   label: 'Погода / риски', Icon: CloudRain },
    { id: 'protocols', label: 'Протоколы',      Icon: BookOpen },
  ];

  return (
    <div className="ds-card mb-8 border-l-4 border-[var(--warning)]">
      {/* Agent header */}
      <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-[var(--border)]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-[var(--warning)] bg-opacity-20 flex items-center justify-center">
            <ShieldAlert className="w-5 h-5 text-[var(--warning)]" />
          </div>
          <div>
            <p className="font-semibold text-[var(--text-primary)]">AI Спасатель — Начальник SAR</p>
            <p className="text-xs text-[var(--text-secondary)]">Поисково-спасательные операции · Мониторинг угроз</p>
          </div>
        </div>
        <button
          onClick={() => fetchBriefing(activeTab)}
          disabled={loading}
          className="ds-btn ds-btn-secondary flex items-center gap-2 text-sm"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Обновить
        </button>
      </div>

      {/* Sub-tabs */}
      <div className="flex border-b border-[var(--border)]">
        {TABS.map(({ id, label, Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`flex items-center gap-2 px-5 py-3 text-sm font-medium transition-colors ${
              activeTab === id
                ? 'text-[var(--warning)] border-b-2 border-[var(--warning)]'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {/* AI briefing text */}
      <div className="p-6 min-h-[120px]">
        {loading ? (
          <div className="flex items-center gap-3 text-[var(--text-secondary)]">
            <div className="inline-block animate-spin rounded-full h-5 w-5 border border-[var(--border)] border-t-[var(--warning)]" />
            Запрашиваю брифинг у AI Спасателя...
          </div>
        ) : (
          <div
            className="text-[var(--text-primary)] text-sm leading-relaxed whitespace-pre-line"
            dangerouslySetInnerHTML={{ __html: text || 'Данные отсутствуют.' }}
          />
        )}
        {lastUpdated && !loading && (
          <p className="text-xs text-[var(--text-muted)] mt-4">
            Обновлено: {lastUpdated.toLocaleTimeString('ru-RU')}
          </p>
        )}
      </div>
    </div>
  );
}

// ── SafetyDashboardClient ──────────────────────────────────────────────────

export function SafetyDashboardClient() {
  const [alerts, setAlerts]     = useState<Alert[]>([]);
  const [capacity, setCapacity] = useState<CapacityItem[]>([]);
  const [loading, setLoading]   = useState(true);
  const [tab, setTab] = useState<'alerts' | 'capacity' | 'consult'>('alerts');
  const [refreshed, setRefreshed] = useState<Date | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const [ar, cr] = await Promise.all([
        fetch('/api/safety/alerts'),
        fetch('/api/safety/capacity'),
      ]);
      if (ar.ok) { const d = await ar.json(); setAlerts(d.data ?? []); }
      if (cr.ok) { const d = await cr.json(); setCapacity(d.data ?? []); }
      setRefreshed(new Date());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const id = setInterval(fetchData, 60_000);
    return () => clearInterval(id);
  }, [fetchData]);

  const criticalAlerts  = alerts.filter(a => a.severity >= 2);
  const redLocations    = capacity.filter(c => c.recommender_status === 'red');
  const yellowLocations = capacity.filter(c => c.recommender_status === 'yellow');
  const hasIncidents    = criticalAlerts.length > 0 || redLocations.length > 0;

  return (
    <div className="ds-page min-h-screen">
      <div className="max-w-7xl mx-auto">

        {/* ── Заголовок ────────────────────────────────────────────── */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 className="ds-h1 mb-1">Центр безопасности</h1>
            <p className="text-[var(--text-secondary)]">Оперативный мониторинг · Камчатка</p>
          </div>
          <span className={`px-4 py-1.5 rounded-full text-sm font-medium ${
            hasIncidents
              ? 'bg-[var(--danger)] bg-opacity-15 text-[var(--danger)]'
              : 'bg-[var(--success)] bg-opacity-15 text-[var(--success)]'
          }`}>
            {hasIncidents ? 'Есть инциденты' : 'Норма'}
          </span>
        </div>

        {/* ── AI Спасатель ─────────────────────────────────────────── */}
        <RescueBriefing />

        {/* ── Метрики ──────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Критических алертов', value: criticalAlerts.length,  Icon: AlertCircle,  color: 'var(--danger)'   },
            { label: 'Локации переполнены', value: redLocations.length,    Icon: AlertTriangle, color: 'var(--danger)'  },
            { label: 'Предупреждения (70%)', value: yellowLocations.length, Icon: Clock,        color: 'var(--warning)' },
            { label: 'Локаций всего',         value: capacity.length,       Icon: CheckCircle,  color: 'var(--success)' },
          ].map(({ label, value, Icon, color }) => (
            <div key={label} className="ds-card p-5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-[var(--text-secondary)]">{label}</span>
                <Icon className="w-4 h-4" style={{ color }} />
              </div>
              <p className="text-3xl font-bold text-[var(--text-primary)]">{value}</p>
            </div>
          ))}
        </div>

        {/* ── Вкладки: Алерты / Ёмкость ────────────────────────────── */}
        <div className="ds-card mb-6">
          <div className="flex border-b border-[var(--border)]">
            {(['alerts', 'capacity', 'consult'] as const).map(t => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`px-6 py-4 text-sm font-medium transition-colors ${
                  tab === t
                    ? 'text-[var(--accent)] border-b-2 border-[var(--accent)]'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                {t === 'alerts'   ? `Алерты (${alerts.length})` :
                 t === 'capacity' ? `Ёмкость (${capacity.length})` :
                 'Консультация МЧС'}
              </button>
            ))}
          </div>

          <div className={tab === 'consult' ? '' : 'p-6'}>
            {loading && tab !== 'consult' ? (
              <div className="flex justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border border-[var(--border)] border-t-[var(--accent)]" />
              </div>
            ) : tab === 'alerts' ? (
              <div className="space-y-3">
                {alerts.length === 0 ? (
                  <p className="text-[var(--text-secondary)] text-center py-8">Активных алертов нет</p>
                ) : alerts.map(alert => (
                  <div
                    key={alert.id}
                    className={`p-4 rounded-lg border-l-4 bg-[var(--bg-hover)] ${
                      alert.severity >= 2 ? 'border-[var(--danger)]' : 'border-[var(--ocean)]'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h3 className="font-medium text-[var(--text-primary)]">{alert.title}</h3>
                        <p className="text-sm text-[var(--text-secondary)] mt-1">{alert.description}</p>
                      </div>
                      <span className={`ml-4 shrink-0 px-2 py-0.5 rounded text-xs font-medium ${
                        alert.severity >= 2
                          ? 'bg-[var(--danger)] bg-opacity-20 text-[var(--danger)]'
                          : 'bg-[var(--ocean)] bg-opacity-20 text-[var(--ocean)]'
                      }`}>
                        {alert.alert_type}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-4 text-xs text-[var(--text-muted)]">
                      <span>Зоны: {alert.affected_zones.join(', ')}</span>
                      <span>Маршрутов затронуто: {alert.affected_route_count}</span>
                      <span>Истекает: {new Date(alert.expires_at).toLocaleString('ru-RU')}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : tab === 'consult' ? (
              <MchsConsultChat />
            ) : (
              <div className="space-y-2">
                {capacity.length === 0 ? (
                  <p className="text-[var(--text-secondary)] text-center py-8">Нет данных о ёмкости</p>
                ) : capacity.map(item => (
                  <div
                    key={item.agent_route_id}
                    className="flex items-center justify-between p-4 rounded-lg bg-[var(--bg-hover)] hover:bg-[var(--bg-card)] transition-colors"
                  >
                    <div>
                      <p className="font-medium text-[var(--text-primary)] text-sm">{item.title}</p>
                      <div className="flex items-center gap-3 mt-1 text-xs text-[var(--text-secondary)]">
                        <span className="flex items-center gap-1">
                          <Users className="w-3 h-3" />
                          {item.tourists_today} / {item.capacity_per_day} чел.
                        </span>
                        <span>
                          {item.capacity_remaining > 0
                            ? `Свободно: ${item.capacity_remaining}`
                            : 'Заполнено'}
                        </span>
                      </div>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                      item.recommender_status === 'red'
                        ? 'bg-[var(--danger)] bg-opacity-15 text-[var(--danger)]'
                        : item.recommender_status === 'yellow'
                          ? 'bg-[var(--warning)] bg-opacity-15 text-[var(--warning)]'
                          : 'bg-[var(--success)] bg-opacity-15 text-[var(--success)]'
                    }`}>
                      {item.recommender_status === 'red'   ? 'Закрыто'      :
                       item.recommender_status === 'yellow' ? 'Предупреждение' : 'Норма'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── Экстренные контакты ───────────────────────────────────── */}
        <div className="ds-card p-5">
          <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-3">
            Экстренные контакты
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: 'МЧС Камчатка',     number: '112'          },
              { label: 'Поисковый центр',   number: '+7 4152 41-61-64' },
              { label: 'Скорая помощь',     number: '103'          },
              { label: 'Диспетчер туров',   number: '+7 4152 26-44-44' },
            ].map(({ label, number }) => (
              <div key={label} className="flex items-center gap-2">
                <PhoneCall className="w-4 h-4 shrink-0 text-[var(--accent)]" />
                <div>
                  <p className="text-xs text-[var(--text-secondary)]">{label}</p>
                  <p className="text-sm font-medium text-[var(--text-primary)]">{number}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Footer ───────────────────────────────────────────────── */}
        <p className="text-xs text-[var(--text-muted)] text-center mt-6">
          Данные обновляются каждые 60 секунд
          {refreshed && ` · последнее обновление ${refreshed.toLocaleTimeString('ru-RU')}`}
        </p>
      </div>
    </div>
  );
}
