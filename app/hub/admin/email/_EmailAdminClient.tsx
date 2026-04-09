'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Mail, CheckCircle2, XCircle, Send, RefreshCw, Copy,
  ExternalLink, AlertCircle, Info, Server, User, Lock,
} from 'lucide-react';

interface SmtpStatus {
  success: boolean;
  error?: string;
  config?: {
    host: string;
    port: string;
    secure: string;
    user: string;
    from: string;
  };
}

const PLATFORM_MAILBOXES = [
  { address: 'noreply@tourhab.ru',   role: 'Исходящие письма (SMTP_USER)',      priority: 'critical', desc: 'Бронирования, уведомления, системные письма' },
  { address: 'support@tourhab.ru',   role: 'Поддержка клиентов',                priority: 'high',     desc: 'Куда пишут туристы и операторы' },
  { address: 'info@tourhab.ru',      role: 'Публичный контакт',                  priority: 'high',     desc: 'Общие вопросы, юридические документы' },
  { address: 'operators@tourhab.ru', role: 'Onboarding операторов',             priority: 'medium',   desc: 'Инструкции и доступы для новых операторов' },
  { address: 'finance@tourhab.ru',   role: 'Финансы',                            priority: 'medium',   desc: 'Акты, счета, финансовые вопросы' },
  { address: 'legal@tourhab.ru',     role: 'Юридический отдел',                  priority: 'medium',   desc: 'Договоры, претензии, НПА' },
  { address: 'privacy@tourhab.ru',   role: 'Защита данных (ФЗ-152)',             priority: 'medium',   desc: 'Запросы на удаление данных, персданные' },
  { address: 'admin@tourhab.ru',     role: 'Системный администратор',            priority: 'low',      desc: 'Технические алерты, мониторинг' },
  { address: 'partners@tourhab.ru',  role: 'Партнёрские запросы',               priority: 'low',      desc: 'B2B, аффилиаты, интеграции' },
  { address: 'system@tourhab.ru',    role: 'Внутренние уведомления',             priority: 'low',      desc: 'Cron-задачи, AI-агенты, авто-алерты' },
];

const PRIORITY_LABEL: Record<string, { label: string; color: string }> = {
  critical: { label: 'Обязательный', color: 'text-[var(--danger)] bg-red-50 dark:bg-red-950/20' },
  high:     { label: 'Важный',       color: 'text-[var(--accent)] bg-orange-50 dark:bg-orange-950/20' },
  medium:   { label: 'Рекомендован', color: 'text-[var(--ocean)] bg-blue-50 dark:bg-blue-950/20' },
  low:      { label: 'Опционально',  color: 'text-[var(--text-muted)] bg-[var(--bg-hover)]' },
};

export default function EmailAdminClient() {
  const [status, setStatus]           = useState<SmtpStatus | null>(null);
  const [checking, setChecking]       = useState(false);
  const [testTo, setTestTo]           = useState('');
  const [sending, setSending]         = useState(false);
  const [sendResult, setSendResult]   = useState<{ ok: boolean; msg: string } | null>(null);
  const [copied, setCopied]           = useState<string | null>(null);

  const checkSmtp = useCallback(async () => {
    setChecking(true);
    setStatus(null);
    try {
      const res = await fetch('/api/admin/email-test');
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
        <a
          href="https://timeweb.cloud/mailbox"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 text-xs text-[var(--ocean)] hover:underline"
        >
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
          <button
            onClick={checkSmtp}
            disabled={checking}
            className="flex items-center gap-1.5 text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
          >
            <RefreshCw className={`w-3 h-3 ${checking ? 'animate-spin' : ''}`} />
            Проверить
          </button>
        </div>

        {/* Статус-индикатор */}
        {status === null ? (
          <div className="flex items-center gap-2 text-sm text-[var(--text-muted)]">
            <RefreshCw className="w-4 h-4 animate-spin" />
            Проверяю соединение…
          </div>
        ) : status.success ? (
          <div className="flex items-center gap-2 text-sm text-[var(--success)]">
            <CheckCircle2 className="w-4 h-4" />
            Подключено — письма уходят
          </div>
        ) : (
          <div className="flex items-center gap-2 text-sm text-[var(--danger)]">
            <XCircle className="w-4 h-4" />
            {status.error ?? 'Нет соединения'}
          </div>
        )}

        {/* Конфиг */}
        {status?.config && (
          <div className="grid grid-cols-2 gap-2 pt-1">
            {[
              { icon: Server, label: 'Хост',     val: `${status.config.host}:${status.config.port}` },
              { icon: Lock,   label: 'Шифрование', val: status.config.secure === 'true' ? 'SSL/TLS (465)' : 'STARTTLS (587)' },
              { icon: User,   label: 'Логин',     val: status.config.user },
              { icon: Mail,   label: 'От кого',   val: status.config.from },
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

        {/* Не настроен — инструкция */}
        {status && !status.success && (
          <div className="flex gap-2 p-3 rounded-md bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800/30">
            <AlertCircle className="w-4 h-4 text-[var(--accent)] shrink-0 mt-0.5" />
            <div className="text-xs text-[var(--text-secondary)] space-y-1">
              <p className="font-semibold text-[var(--text-primary)]">SMTP не настроен</p>
              <p>Добавьте переменные в Timeweb Cloud → App 175269 → Переменные окружения:</p>
              {[
                ['SMTP_HOST',   'smtp.timeweb.ru'],
                ['SMTP_PORT',   '465'],
                ['SMTP_SECURE', 'true'],
                ['SMTP_USER',   'noreply@tourhab.ru'],
                ['SMTP_PASS',   '••••••••'],
                ['SMTP_FROM',   'TourHab <noreply@tourhab.ru>'],
              ].map(([k, v]) => (
                <div key={k} className="flex items-center gap-1.5 font-mono text-[11px]">
                  <span className="text-[var(--ocean)]">{k}</span>
                  <span className="text-[var(--text-muted)]">=</span>
                  <span>{v}</span>
                </div>
              ))}
            </div>
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
          <input
            type="email"
            placeholder="email@example.com"
            value={testTo}
            onChange={e => setTestTo(e.target.value)}
            className="ds-input flex-1 text-sm"
            required
          />
          <button
            type="submit"
            disabled={sending || !testTo.trim()}
            className="ds-btn ds-btn-primary text-sm px-4 flex items-center gap-1.5 disabled:opacity-50"
          >
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

      {/* Ящики платформы */}
      <div className="ds-card p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Mail className="w-4 h-4 text-[var(--text-muted)]" />
          <span className="text-sm font-semibold text-[var(--text-primary)]">Почтовые ящики платформы</span>
          <span className="text-xs text-[var(--text-muted)] bg-[var(--bg-hover)] px-1.5 py-0.5 rounded-full">{PLATFORM_MAILBOXES.length}</span>
        </div>
        <div className="flex items-start gap-2 p-3 rounded-md bg-[var(--bg-hover)]">
          <Info className="w-3.5 h-3.5 text-[var(--ocean)] shrink-0 mt-0.5" />
          <p className="text-xs text-[var(--text-secondary)]">
            Создавайте ящики в <a href="https://timeweb.cloud/mailbox" target="_blank" rel="noopener noreferrer" className="text-[var(--ocean)] hover:underline">Timeweb → Почта</a>. Можно сделать алиасы-переадресации на один реальный ящик (например, всё → support@tourhab.ru).
          </p>
        </div>
        <div className="divide-y divide-[var(--border)]">
          {PLATFORM_MAILBOXES.map((mb) => {
            const prio = PRIORITY_LABEL[mb.priority];
            return (
              <div key={mb.address} className="flex items-start gap-3 py-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      onClick={() => copyText(mb.address)}
                      className="flex items-center gap-1 text-sm font-mono font-medium text-[var(--text-primary)] hover:text-[var(--ocean)] transition-colors"
                    >
                      {mb.address}
                      <Copy className={`w-3 h-3 ${copied === mb.address ? 'text-[var(--success)]' : 'text-[var(--text-muted)]'}`} />
                    </button>
                    <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${prio.color}`}>
                      {prio.label}
                    </span>
                  </div>
                  <p className="text-xs text-[var(--text-muted)] mt-0.5">{mb.role}</p>
                  <p className="text-xs text-[var(--text-secondary)] mt-0.5">{mb.desc}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Инструкция Timeweb */}
      <div className="ds-card p-4 space-y-3">
        <div className="flex items-center gap-2">
          <ExternalLink className="w-4 h-4 text-[var(--text-muted)]" />
          <span className="text-sm font-semibold text-[var(--text-primary)]">Как создать ящик в Timeweb</span>
        </div>
        <ol className="space-y-2 text-xs text-[var(--text-secondary)]">
          {[
            'Зайдите в Timeweb Cloud → раздел «Почта»',
            'Выберите домен tourhab.ru',
            'Нажмите «Создать почтовый ящик»',
            'Логин: noreply (или другой из списка выше)',
            'Пароль: задайте и сохраните в переменных окружения',
            'Повторите для support@tourhab.ru и info@tourhab.ru',
          ].map((step, i) => (
            <li key={i} className="flex gap-2">
              <span className="shrink-0 w-4 h-4 rounded-full bg-[var(--bg-hover)] text-[var(--text-muted)] text-[10px] font-bold flex items-center justify-center">
                {i + 1}
              </span>
              {step}
            </li>
          ))}
        </ol>
        <a
          href="https://timeweb.cloud/mailbox"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-xs ds-btn ds-btn-secondary mt-1"
        >
          <ExternalLink className="w-3 h-3" />
          Открыть Timeweb → Почта
        </a>
      </div>

    </div>
  );
}
