'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Package, Calendar, DollarSign, BarChart3, Globe, Bell,
  TrendingUp, Users, ExternalLink, CheckCircle, AlertTriangle,
  ArrowRight, Zap, BookOpen, MessageSquare, Bot, Copy,
} from 'lucide-react';

interface SectionCard {
  href: string;
  icon: React.ElementType;
  color: string;
  title: string;
  desc: string;
  tips: string[];
}

function SectionHelp({ href, icon: Icon, color, title, desc, tips }: SectionCard) {
  return (
    <div className="ds-card p-5">
      <div className="flex items-start gap-3 mb-3">
        <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `color-mix(in srgb, ${color} 15%, transparent)` }}>
          <Icon size={18} style={{ color }} />
        </div>
        <div>
          <h3 className="font-semibold text-[var(--text-primary)]">{title}</h3>
          <p className="text-sm text-[var(--text-secondary)]">{desc}</p>
        </div>
      </div>
      <ul className="space-y-1.5 mb-3">
        {tips.map((tip, i) => (
          <li key={i} className="flex items-start gap-2 text-sm text-[var(--text-secondary)]">
            <CheckCircle size={13} className="flex-shrink-0 mt-0.5" style={{ color }} />
            {tip}
          </li>
        ))}
      </ul>
      <Link
        href={href}
        className="inline-flex items-center gap-1.5 text-sm font-medium transition-colors hover:underline"
        style={{ color }}
      >
        Перейти в раздел <ArrowRight size={14} />
      </Link>
    </div>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  function handleCopy() {
    void navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }
  return (
    <button
      onClick={handleCopy}
      className="inline-flex items-center gap-1 text-xs text-[var(--ocean)] hover:underline ml-2 cursor-pointer"
    >
      <Copy size={11} />
      {copied ? 'Скопировано' : 'Копировать'}
    </button>
  );
}

export default function OperatorHelpClient() {
  const sections: SectionCard[] = [
    {
      href: '/hub/operator/tours',
      icon: Package,
      color: 'var(--accent)',
      title: 'Туры',
      desc: 'Создание, редактирование и управление вашими турами',
      tips: [
        'Нажмите «+» для создания нового тура',
        'Добавьте описание минимум 100 символов для лучшего SEO',
        'Теги помогают туристам находить тур в каталоге',
        'Черновик — тур не виден, Активный — в каталоге',
      ],
    },
    {
      href: '/hub/operator/calendar',
      icon: Calendar,
      color: 'var(--ocean)',
      title: 'Календарь',
      desc: 'Управление датами и количеством мест',
      tips: [
        'Кликните по дате для добавления слота',
        'Bulk-заполнение — диапазон дат за один клик',
        'Пустая дата = нет мест; нет записи = FREESALE',
        'Иконка тучи — предупреждение о погоде на дату',
      ],
    },
    {
      href: '/hub/operator/bookings',
      icon: Users,
      color: 'var(--success)',
      title: 'Бронирования',
      desc: 'Все входящие заявки и их статусы',
      tips: [
        'Уведомление в Telegram приходит автоматически после создания заявки',
        'Подтвердите или отклоните в течение 24 часов',
        'В карточке — контакт туриста для связи',
        'Статус «Выполнено» запускает выплату',
      ],
    },
    {
      href: '/hub/operator/finance',
      icon: DollarSign,
      color: 'var(--warning)',
      title: 'Финансы',
      desc: 'Выплаты, реквизиты и история транзакций',
      tips: [
        'Укажите реквизиты СБП или расчётный счёт',
        'Деньги удерживаются: конец тура + 36 часов',
        'Комиссия снижается автоматически с ростом оборота',
        'Выплата после разблокировки — 3 рабочих дня',
      ],
    },
    {
      href: '/hub/operator/analytics',
      icon: BarChart3,
      color: 'var(--accent)',
      title: 'Аналитика',
      desc: 'Просмотры, конверсия и оборот за период',
      tips: [
        'Фильтры: 7 / 30 / 90 / 365 дней',
        'Топ туров — видите что продаётся лучше',
        'Конверсия = бронирования / просмотры × 100',
      ],
    },
    {
      href: '/hub/operator/notifications',
      icon: Bell,
      color: 'var(--ocean)',
      title: 'Уведомления',
      desc: 'Настройка Telegram и email-оповещений',
      tips: [
        'Telegram: укажите chat_id в контактах профиля',
        'Email: уведомления о бронировании и отмене',
        'Погодные предупреждения: автоматически за 48 часов',
      ],
    },
    {
      href: '/hub/operator/integrations',
      icon: Globe,
      color: 'var(--success)',
      title: 'Интеграции',
      desc: 'OCTO API для подключения к OTA (Tiqets, Headout)',
      tips: [
        'Ваши туры уже доступны через OCTO API',
        'API-ключи создаёт администратор TourHab',
        'Webhook URL — для получения уведомлений о бронированиях из OTA',
      ],
    },
    {
      href: '/hub/operator',
      icon: TrendingUp,
      color: 'var(--warning)',
      title: 'Динамические цены',
      desc: 'Автоматическое управление ценой (настраивает admin)',
      tips: [
        'Высокий сезон: +20–30% в июле–августе',
        'Ранняя бронь: -10–15% при бронировании за 30+ дней',
        'Загрузка: +15–25% при > 80% заполненности',
        'Правила настраивает администратор платформы',
      ],
    },
  ];

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <BookOpen size={22} className="text-[var(--accent)]" />
          <h1 className="text-2xl font-bold text-[var(--text-primary)]" style={{ fontFamily: 'var(--font-playfair)' }}>
            Справочник оператора
          </h1>
        </div>
        <p className="text-[var(--text-secondary)]">
          Быстрый доступ к инструкциям по каждому разделу кабинета.
          Полная инструкция:{' '}
          <Link href="/help/operators" className="text-[var(--ocean)] hover:underline inline-flex items-center gap-1">
            tourhab.ru/help/operators <ExternalLink size={12} />
          </Link>
        </p>
      </div>

      {/* Важное */}
      <div className="ds-card p-4 mb-8 border-l-4 border-[var(--warning)] bg-yellow-50 dark:bg-yellow-950/20">
        <div className="flex items-start gap-3">
          <AlertTriangle size={18} className="text-[var(--warning)] flex-shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-semibold text-[var(--text-primary)] mb-1">Важно знать</p>
            <ul className="space-y-1 text-[var(--text-secondary)]">
              <li>Подтверждайте бронирования в течение 24 часов — иначе автоотмена</li>
              <li>Подключите Кузьмича в Telegram или MAX — уведомления приходят автоматически</li>
              <li>Заполните реквизиты в разделе Финансы до первой выплаты</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Быстрый старт */}
      <div className="ds-card p-5 mb-8">
        <div className="flex items-center gap-2 mb-4">
          <Zap size={18} className="text-[var(--accent)]" />
          <h2 className="font-semibold text-[var(--text-primary)]">Быстрый старт — чеклист</h2>
        </div>
        <div className="grid md:grid-cols-2 gap-2">
          {[
            'Заполните описание компании в разделе Профиль',
            'Загрузите фото (обложка + галерея) в Профиле',
            'Укажите реквизиты для выплат в разделе Финансы',
            'Создайте первый тур в разделе Туры',
            'Откройте даты в Календаре',
            'Подключите Кузьмича: /partner email в Telegram или MAX',
          ].map((item, i) => (
            <div key={i} className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
              <div className="w-5 h-5 rounded border border-[var(--border)] flex-shrink-0" />
              {item}
            </div>
          ))}
        </div>
      </div>

      {/* Кузьмич — AI помощник */}
      <div className="ds-card p-5 mb-8">
        <div className="flex items-center gap-2 mb-4">
          <Bot size={18} className="text-[var(--accent)]" />
          <h2 className="font-semibold text-[var(--text-primary)]">Кузьмич — ваш AI помощник в мессенджере</h2>
        </div>
        <p className="text-sm text-[var(--text-secondary)] mb-4">
          Кузьмич знает ваши туры, бронирования и статистику. Пишите ему напрямую в Telegram или MAX —
          отвечает на вопросы о бизнесе, помогает составить ответ туристу, показывает сводку за неделю.
        </p>

        <div className="space-y-4">
          {/* Шаг 1 */}
          <div className="flex gap-3">
            <div className="w-6 h-6 rounded-full bg-[color-mix(in_srgb,var(--accent)_15%,transparent)] text-[var(--accent)] text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">1</div>
            <div>
              <p className="text-sm font-medium text-[var(--text-primary)] mb-1">Откройте бот в Telegram или MAX</p>
              <div className="flex flex-wrap gap-2">
                <a
                  href="https://t.me/KuzmichKam_bot"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded bg-[color-mix(in_srgb,var(--ocean)_10%,transparent)] text-[var(--ocean)] hover:bg-[color-mix(in_srgb,var(--ocean)_20%,transparent)] transition-colors"
                >
                  <ExternalLink size={11} /> Telegram @KuzmichKam_bot
                </a>
              </div>
              <p className="text-xs text-[var(--text-muted)] mt-1">В MAX мессенджере найдите Кузьмич по нику KuzmichKam_bot</p>
            </div>
          </div>

          {/* Шаг 2 */}
          <div className="flex gap-3">
            <div className="w-6 h-6 rounded-full bg-[color-mix(in_srgb,var(--accent)_15%,transparent)] text-[var(--accent)] text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">2</div>
            <div>
              <p className="text-sm font-medium text-[var(--text-primary)] mb-1">Зарегистрируйтесь как оператор</p>
              <p className="text-sm text-[var(--text-secondary)] mb-2">
                Отправьте боту команду с вашим email от аккаунта на TourHab:
              </p>
              <div className="space-y-2">
                <div className="bg-[var(--bg-hover)] rounded-md px-3 py-2 font-mono text-sm text-[var(--text-primary)] flex items-center justify-between">
                  <span>/partner ваш@email.com</span>
                  <CopyButton text="/partner ваш@email.com" />
                </div>
                <p className="text-xs text-[var(--text-muted)]">В MAX мессенджере команды на / не работают — используйте слово без слеша:</p>
                <div className="bg-[var(--bg-hover)] rounded-md px-3 py-2 font-mono text-sm text-[var(--text-primary)] flex items-center justify-between">
                  <span>партнер ваш@email.com</span>
                  <CopyButton text="партнер ваш@email.com" />
                </div>
              </div>
            </div>
          </div>

          {/* Шаг 3 */}
          <div className="flex gap-3">
            <div className="w-6 h-6 rounded-full bg-[color-mix(in_srgb,var(--success)_15%,transparent)] text-[var(--success)] text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
              <CheckCircle size={14} />
            </div>
            <div>
              <p className="text-sm font-medium text-[var(--text-primary)] mb-1">Готово — задавайте вопросы</p>
              <div className="grid sm:grid-cols-2 gap-1.5 mt-2">
                {[
                  'Сколько бронирований на этой неделе?',
                  'Есть ли свободные места на 20 июля?',
                  'Какие туры сейчас активны?',
                  'Помоги написать ответ туристу',
                ].map((q) => (
                  <div key={q} className="flex items-center gap-2 text-xs text-[var(--text-secondary)] bg-[var(--bg-hover)] rounded px-2.5 py-1.5">
                    <MessageSquare size={11} className="flex-shrink-0 text-[var(--text-muted)]" />
                    {q}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Разделы */}
      <div className="grid md:grid-cols-2 gap-4">
        {sections.map(section => (
          <SectionHelp key={section.href} {...section} />
        ))}
      </div>

      {/* Поддержка */}
      <div className="mt-8 ds-card p-5 flex items-start gap-4">
        <MessageSquare size={22} className="text-[var(--text-secondary)] flex-shrink-0 mt-0.5" />
        <div>
          <p className="font-semibold text-[var(--text-primary)] mb-1">Нужна помощь?</p>
          <p className="text-sm text-[var(--text-secondary)]">
            Email:{' '}
            <a href="mailto:operators@tourhab.ru" className="text-[var(--ocean)] hover:underline">
              operators@tourhab.ru
            </a>
            {' · '}
            Telegram: <span className="text-[var(--ocean)]">@tourhab_support</span>
            {' · '}
            Ответ в течение 4 часов в рабочее время (UTC+12)
          </p>
        </div>
      </div>
    </div>
  );
}
