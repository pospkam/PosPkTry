'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Mail, CheckCircle2, XCircle, Send, RefreshCw, Copy,
  ExternalLink, AlertCircle, Server, User, Lock, ChevronDown, ChevronUp,
} from 'lucide-react';

interface SmtpStatus {
  success: boolean;
  error?: string;
  config?: { host: string; port: string; secure: string; user: string; from: string };
}

// 2 реальных ящика + 10 служебных алиасов для внутренних ролей
const SYSTEM_MAILBOXES = [
  {
    address: 'noreply@tourhab.ru',
    type: 'real' as const,
    label: 'Платформа — исходящие',
    color: '#D44A0C',
    agent: null,
    when: 'Все автоматические письма: подтверждение бронирования, оплата, напоминания, регистрация.',
    action: 'Это SMTP_USER. Настроить в Timeweb → Почта. Ответы туда не приходят — только отправка.',
  },
  {
    address: 'support@tourhab.ru',
    type: 'real' as const,
    label: 'Поддержка — входящие',
    color: '#2568B0',
    agent: null,
    when: 'Пишут туристы с вопросами, операторы с проблемами, жалобы, обращения.',
    action: 'Сделать переадресацию на ваш личный ящик в Timeweb → Почта → Alias.',
  },
];

const AGENT_MAILBOXES = [
  {
    address: 'admin@tourhab.ru',
    agent: 'Admin',
    label: 'Операционный директор',
    color: '#6366F1',
    when: 'Сводные отчёты платформы, критические инциденты и решения по внутренним инициативам.',
    action: 'Читать после каждого цикла review. Содержит summary и список одобренных изменений.',
  },
  {
    address: 'legal@tourhab.ru',
    agent: 'Legal',
    label: 'Юрист',
    color: '#8B5CF6',
    when: 'Уведомления о compliance-рисках, изменениях законодательства, истечении лицензий операторов.',
    action: 'Реагировать в течение 3 дней. Юридические риски требуют немедленной проверки.',
  },
  {
    address: 'security@tourhab.ru',
    agent: 'Security',
    label: 'Безопасность',
    color: '#EF4444',
    when: 'Аномальная активность: брут-форс, подозрительные IP, массовые запросы, утечки данных.',
    action: 'Высокий приоритет. Открывать сразу. Может содержать требование заблокировать аккаунт.',
  },
  {
    address: 'growth@tourhab.ru',
    agent: 'Hacker',
    label: 'Рост / Growth',
    color: '#F59E0B',
    when: 'Еженедельные growth-отчёты: конверсия, воронка, лучшие каналы, A/B тесты.',
    action: 'Читать по понедельникам. Смотреть на метрики конверсии — если упала >10%, действовать.',
  },
  {
    address: 'sos@tourhab.ru',
    agent: 'Rescue',
    label: 'SAR / Безопасность туристов',
    color: '#DC2626',
    when: 'SOS-сигналы туристов, погодные риски, экстренные уведомления МЧС.',
    action: 'Абсолютный приоритет. Переадресовать на телефон. Настроить звуковое уведомление.',
  },
  {
    address: 'eco@tourhab.ru',
    agent: 'Eco',
    label: 'Экология',
    color: '#3FB950',
    when: 'Еженедельный eco-score платформы, предупреждения о превышении нагрузки на маршруты.',
    action: 'Читать раз в неделю. При red-alert — ограничить бронирования на перегруженных маршрутах.',
  },
  {
    address: 'content@tourhab.ru',
    agent: 'Content',
    label: 'Аудит контента',
    color: '#06B6D4',
    when: 'Отчёты о качестве описаний туров, фото, несоответствии стандартам платформы.',
    action: 'Операторы с низким score получают уведомления. Вам — сводка что нужно исправить.',
  },
  {
    address: 'quality@tourhab.ru',
    agent: 'Quality',
    label: 'Качество',
    color: '#10B981',
    when: 'Новые отзывы ниже 3 звёзд, жалобы на операторов, health-score операторов в красной зоне.',
    action: 'При оценке < 2.5 — рассмотреть предупреждение оператору. Trend падения — расследовать.',
  },
  {
    address: 'planning@tourhab.ru',
    agent: 'Planning',
    label: 'Стратег',
    color: '#8B5CF6',
    when: 'Прогнозы бронирований на след. месяц, предупреждения о дефиците туров в сезон.',
    action: 'Читать в начале месяца. Если прогноз < 70% от цели — усилить маркетинг или добавить туры.',
  },
  {
    address: 'evo@tourhab.ru',
    agent: 'Evo',
    label: 'Архитектор платформы',
    color: '#7C3AED',
    when: 'Результаты A/B тестов, предложения по эволюции платформы, tech-debt отчёты.',
    action: 'Читать раз в 2 недели. Инициативы с высоким ROI — выносить на одобрение в /hub/admin/agents.',
  },
];

export default function EmailAdminClient() {
  const [status, setStatus]         = useState<SmtpStatus | null>(null);
  const [checking, setChecking]     = useState(false);
  const [testTo, setTestTo]         = useState('');
  const [sending, setSending]       = useState(false);
  const [sendResult, setSendResult] = useState<{ ok: boolean; msg: string } | null>(null);
  const [copied, setCopied]         = useState<string | null>(null);
  const [expanded, setExpanded]     = useState<string | null>(null);

  const checkSmtp = useCallback(async () => {
    setChecking(true);
    setStatus(null);
    try {
      const res  = await fetch('/api/admin/email-test');
      const data: SmtpStatus = await res.json();
      setStatus(data);
    } catch {
      setStatus({ success: false, error: 'Не удалось выполнить запрос' });
    } finally {
      setChecking(false);
    }
  }, []);

  useEffect(() => { checkSmtp(); }, [checkSmtp]);

  async function handleSendTest(e: React.FormEvent) {
    e.preventDefault();
    if (!testTo.trim()) return;
    setSending(true);
    setSendResult(null);
    try {
      const res  = await fetch('/api/admin/email-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: testTo.trim() }),
      });
      const data = await res.json();
      setSendResult({ ok: data.success, msg: data.success ? 'Письмо отправлено' : (data.error ?? 'Ошибка') });
    } catch {
      setSendResult({ ok: false, msg: 'Сетевая ошибка' });
    } finally {
      setSending(false);
    }
  }

  function copyText(text: string) {
    navigator.clipboard.writeText(text).catch(() => {});
    setCopied(text);
    setTimeout(() => setCopied(null), 1500);
  }

  return (
    <div className="p-5 lg:p-6 space-y-6 max-w-4xl">

      {/* Заголовок */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <Mail className="w-4 h-4 text-[var(--text-muted)]" />
          <h1 className="text-sm font-semibold text-[var(--text-primary)] tracking-tight">Email</h1>
        </div>
        <a href="https://timeweb.cloud/mailbox" target="_blank" rel="noopener noreferrer"
           className="flex items-center gap-1.5 text-xs text-[var(--ocean)] hover:underline">
          <ExternalLink className="w-3 h-3" />
          Timeweb → Почта
        </a>
      </div>

      {/* SMTP статус */}
      <div className="ds-card p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Server className="w-4 h-4 text-[var(--text-muted)]" />
            <span className="text-sm font-semibold text-[var(--text-primary)]">SMTP-сервер</span>
          </div>
          <button onClick={checkSmtp} disabled={checking}
                  className="flex items-center gap-1.5 text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">
            <RefreshCw className={`w-3 h-3 ${checking ? 'animate-spin' : ''}`} />
            Проверить
          </button>
        </div>

        {status === null ? (
          <div className="flex items-center gap-2 text-sm text-[var(--text-muted)]">
            <RefreshCw className="w-4 h-4 animate-spin" /> Проверяю…
          </div>
        ) : status.success ? (
          <div className="flex items-center gap-2 text-sm text-[var(--success)]">
            <CheckCircle2 className="w-4 h-4" /> Подключено — письма уходят
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm text-[var(--danger)]">
              <XCircle className="w-4 h-4" /> {status.error ?? 'Нет соединения'}
            </div>
            <div className="flex gap-2 p-3 rounded-md bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800/30">
              <AlertCircle className="w-4 h-4 text-[var(--accent)] shrink-0 mt-0.5" />
              <div className="text-xs space-y-1">
                <p className="font-semibold text-[var(--text-primary)]">Добавьте в Timeweb Cloud → App 175269 → Переменные:</p>
                {[['SMTP_HOST','smtp.timeweb.ru'],['SMTP_PORT','465'],['SMTP_SECURE','true'],
                  ['SMTP_USER','noreply@tourhab.ru'],['SMTP_PASS','Gr96Ww32'],
                  ['SMTP_FROM','TourHab <noreply@tourhab.ru>']].map(([k,v]) => (
                  <div key={k} className="flex gap-1.5 font-mono text-[11px]">
                    <span className="text-[var(--ocean)]">{k}</span>
                    <span className="text-[var(--text-muted)]">=</span>
                    <span className="text-[var(--text-primary)]">{v}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {status?.config && (
          <div className="grid grid-cols-2 gap-2">
            {[
              { icon: Server, label: 'Хост',       val: `${status.config.host}:${status.config.port}` },
              { icon: Lock,   label: 'Шифрование', val: status.config.secure === 'true' ? 'SSL/TLS' : 'STARTTLS' },
              { icon: User,   label: 'Логин',       val: status.config.user },
              { icon: Mail,   label: 'From',         val: status.config.from },
            ].map(({ icon: Icon, label, val }) => (
              <div key={label} className="flex items-start gap-2 p-2 rounded-md bg-[var(--bg-hover)]">
                <Icon className="w-3.5 h-3.5 mt-0.5 text-[var(--text-muted)] shrink-0" />
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-[var(--text-muted)]">{label}</p>
                  <p className="text-xs font-medium text-[var(--text-primary)] break-all">{val}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Тест-письмо */}
      <div className="ds-card p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Send className="w-4 h-4 text-[var(--text-muted)]" />
          <span className="text-sm font-semibold text-[var(--text-primary)]">Тестовое письмо</span>
        </div>
        <form onSubmit={handleSendTest} className="flex gap-2">
          <input type="email" placeholder="email@example.com" value={testTo}
                 onChange={e => setTestTo(e.target.value)} className="ds-input flex-1 text-sm" required />
          <button type="submit" disabled={sending || !testTo.trim()}
                  className="ds-btn ds-btn-primary text-sm px-4 flex items-center gap-1.5 disabled:opacity-50">
            {sending ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
            {sending ? 'Отправляю…' : 'Отправить'}
          </button>
        </form>
        {sendResult && (
          <div className={`flex items-center gap-2 text-sm ${sendResult.ok ? 'text-[var(--success)]' : 'text-[var(--danger)]'}`}>
            {sendResult.ok ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
            {sendResult.msg}
          </div>
        )}
      </div>

      {/* Системные ящики */}
      <div className="ds-card p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Server className="w-4 h-4 text-[var(--text-muted)]" />
          <span className="text-sm font-semibold text-[var(--text-primary)]">Системные ящики</span>
          <span className="text-[10px] text-[var(--text-muted)] bg-[var(--bg-hover)] px-1.5 py-0.5 rounded-full">2 реальных</span>
        </div>
        <div className="divide-y divide-[var(--border)]">
          {SYSTEM_MAILBOXES.map(mb => (
            <div key={mb.address} className="py-3 space-y-2">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: mb.color }} />
                <button onClick={() => copyText(mb.address)}
                        className="flex items-center gap-1.5 text-sm font-mono font-medium text-[var(--text-primary)] hover:text-[var(--ocean)] transition-colors">
                  {mb.address}
                  <Copy className={`w-3 h-3 ${copied === mb.address ? 'text-[var(--success)]' : 'text-[var(--text-muted)]'}`} />
                </button>
                <span className="text-xs text-[var(--text-muted)]">{mb.label}</span>
              </div>
              <p className="text-xs text-[var(--text-secondary)] pl-4">{mb.when}</p>
              <p className="text-xs font-medium text-[var(--text-primary)] pl-4 flex gap-1">
                <span className="text-[var(--accent)]">→</span> {mb.action}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Служебные алиасы внутренних ролей */}
      <div className="ds-card p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Mail className="w-4 h-4 text-[var(--text-muted)]" />
          <span className="text-sm font-semibold text-[var(--text-primary)]">Внутренние роли и алиасы</span>
          <span className="text-[10px] text-[var(--text-muted)] bg-[var(--bg-hover)] px-1.5 py-0.5 rounded-full">10 алиасов → noreply</span>
        </div>
        <p className="text-xs text-[var(--text-secondary)]">
          Все 10 ящиков — <strong>алиасы-переадресации</strong> на <code className="text-[var(--ocean)]">noreply@tourhab.ru</code>.
          Это служебный слой для внутренних уведомлений и разнесения ролей. Создавать отдельные SMTP-ящики не нужно.
        </p>
        <div className="divide-y divide-[var(--border)]">
          {AGENT_MAILBOXES.map(mb => {
            const isOpen = expanded === mb.address;
            return (
              <div key={mb.address} className="py-3">
                <button
                  onClick={() => setExpanded(isOpen ? null : mb.address)}
                  className="w-full flex items-center gap-2 text-left"
                >
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: mb.color }} />
                  <span className="text-xs font-semibold text-[var(--text-primary)] w-20 shrink-0">{mb.agent}</span>
                  <span className="font-mono text-xs text-[var(--text-secondary)] flex-1 truncate">{mb.address}</span>
                  <span className="text-[10px] text-[var(--text-muted)] hidden sm:block shrink-0">{mb.label}</span>
                  {isOpen
                    ? <ChevronUp className="w-3.5 h-3.5 text-[var(--text-muted)] shrink-0" />
                    : <ChevronDown className="w-3.5 h-3.5 text-[var(--text-muted)] shrink-0" />}
                </button>

                {isOpen && (
                  <div className="mt-3 pl-5 space-y-2">
                    <button onClick={() => copyText(mb.address)}
                            className="flex items-center gap-1.5 font-mono text-xs text-[var(--ocean)] hover:underline">
                      {mb.address}
                      <Copy className={`w-3 h-3 ${copied === mb.address ? 'text-[var(--success)]' : 'text-[var(--text-muted)]'}`} />
                    </button>
                    <p className="text-xs text-[var(--text-secondary)]">
                      <span className="font-semibold text-[var(--text-primary)]">Когда пишет:</span> {mb.when}
                    </p>
                    <p className="text-xs text-[var(--text-secondary)] flex gap-1">
                      <span className="text-[var(--accent)] font-bold shrink-0">→</span>
                      <span><span className="font-semibold text-[var(--text-primary)]">Ваше действие:</span> {mb.action}</span>
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Настройка алиасов */}
      <div className="ds-card p-4 space-y-3">
        <div className="flex items-center gap-2">
          <ExternalLink className="w-4 h-4 text-[var(--text-muted)]" />
          <span className="text-sm font-semibold text-[var(--text-primary)]">Настройка в Timeweb</span>
        </div>
        <ol className="space-y-2 text-xs text-[var(--text-secondary)]">
          {[
            'Создайте ящик noreply@tourhab.ru (пароль Gr96Ww32) — это SMTP_USER',
            'Создайте ящик support@tourhab.ru — настройте переадресацию на ваш личный email',
            'Для каждой внутренней роли: Почта → Алиасы → добавьте admin@, legal@, security@ и другие → переадресовать на noreply@',
            'То есть письмо с sos@tourhab.ru фактически уходит через общий SMTP noreply@tourhab.ru',
          ].map((step, i) => (
            <li key={i} className="flex gap-2">
              <span className="shrink-0 w-4 h-4 rounded-full bg-[var(--bg-hover)] text-[var(--text-muted)] text-[10px] font-bold flex items-center justify-center">
                {i + 1}
              </span>
              {step}
            </li>
          ))}
        </ol>
        <a href="https://timeweb.cloud/mailbox" target="_blank" rel="noopener noreferrer"
           className="inline-flex items-center gap-1.5 text-xs ds-btn ds-btn-secondary mt-1">
          <ExternalLink className="w-3 h-3" />
          Открыть Timeweb → Почта
        </a>
      </div>

    </div>
  );
}
