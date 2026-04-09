'use client';

import { ExternalLink, CheckCircle, Clock, AlertCircle, Copy, Fish } from 'lucide-react';
import { useState } from 'react';

interface OrderStat {
  channel: string;
  count: string;
  last_at: string | null;
}
interface TourStats {
  total: string;
  with_tripster: string;
  with_avito: string;
  with_sputnik8: string;
}

const CHANNELS = [
  {
    id: 'avito',
    name: 'Авито',
    url: 'https://avito.ru',
    description: 'Объявления рыбалки — XML Автозагрузка',
    type: 'classifieds',
    steps: [
      { done: true,  text: 'XML-фид подготовлен и работает' },
      { done: false, text: 'Зарегистрировать URL фида в ЛК → Настройки → Автозагрузка' },
      { done: false, text: 'Дождаться первой загрузки (2-4 часа)' },
    ],
    feedUrl: 'https://tourhab.ru/api/channels/avito/feed',
    priority: 1,
  },
  {
    id: 'yandex',
    name: 'Яндекс.Услуги / Яндекс.Путешествия',
    url: 'https://uslugi.yandex.ru/partners',
    description: 'YML-фид готов — туры в поиске Яндекса и Яндекс.Картах',
    type: 'aggregator',
    steps: [
      { done: true,  text: 'YML-фид подготовлен и работает' },
      { done: false, text: 'Яндекс.Услуги → Добавить услугу → XML-импорт → вставить URL' },
      { done: false, text: 'Яндекс.Путешествия → partner.yandex.ru/travel → экскурсии' },
    ],
    feedUrl: 'https://tourhab.ru/api/channels/yandex/feed',
    priority: 2,
  },
  {
    id: 'tripster',
    name: 'Tripster',
    url: 'https://experience.tripster.ru/locals/',
    description: 'Экскурсии и туры — основной маркетплейс гидов',
    type: 'marketplace',
    steps: [
      { done: true,  text: 'Аккаунт зарегистрирован (fishingkam@yandex.ru)' },
      { done: false, text: 'Создать туры вручную в дашборде Tripster' },
      { done: false, text: 'Запросить API токен: guides@tripster.ru' },
      { done: false, text: 'Добавить tripster_experience_id к турам в нашей БД' },
    ],
    feedUrl: null,
    priority: 2,
  },
  {
    id: 'sputnik8',
    name: 'Sputnik8',
    url: 'https://www.sputnik8.com/ru/for-partners',
    description: 'Туры и активности — крупный российский маркетплейс',
    type: 'marketplace',
    steps: [
      { done: true,  text: 'Аккаунт зарегистрирован (fishingkam@yandex.ru)' },
      { done: false, text: 'Создать туры в личном кабинете Sputnik8' },
      { done: false, text: 'Получить API ключ в ЛК → Настройки' },
      { done: false, text: 'Добавить sputnik8_product_id к турам в нашей БД' },
    ],
    feedUrl: null,
    priority: 3,
  },
  {
    id: 'level_travel',
    name: 'LevelTravel → Яндекс.Путешествия',
    url: 'https://partners.level.travel/',
    description: 'Туры попадают автоматически в Яндекс.Путешествия',
    type: 'aggregator',
    steps: [
      { done: true,  text: 'Аккаунт зарегистрирован (fishingkam@yandex.ru)' },
      { done: false, text: 'Проблема: не приходит СМС — написать support@level.travel' },
      { done: false, text: 'После активации: создать туры → автоматически в Яндексе' },
    ],
    feedUrl: null,
    priority: 4,
  },
  {
    id: 'russpass',
    name: 'Russpass',
    url: 'https://russpass.ru/partners',
    description: 'Государственная туристическая платформа, бесплатно',
    type: 'government',
    steps: [
      { done: true,  text: 'Аккаунт зарегистрирован (fishingkam@yandex.ru)' },
      { done: false, text: 'Восстановить пароль — не сохранён' },
      { done: false, text: 'Добавить туры после восстановления доступа' },
    ],
    feedUrl: null,
    priority: 5,
  },
  {
    id: 'travelpayouts',
    name: 'TravelPayouts',
    url: 'https://www.travelpayouts.com/ru/',
    description: 'Партнёрская сеть — трафик через турагентов и блогеров',
    type: 'affiliate',
    steps: [
      { done: true,  text: 'Аккаунт зарегистрирован (fishingkam@yandex.ru)' },
      { done: false, text: 'Настроить партнёрскую программу (% за бронирование)' },
      { done: false, text: 'Получить API токен для отслеживания конверсий' },
    ],
    feedUrl: null,
    priority: 6,
  },
];

const TYPE_COLORS: Record<string, string> = {
  classifieds:  'var(--ocean)',
  marketplace:  'var(--accent)',
  aggregator:   'var(--warning)',
  government:   'var(--success)',
  affiliate:    'var(--text-muted)',
};
const TYPE_LABELS: Record<string, string> = {
  classifieds:  'Объявления',
  marketplace:  'Маркетплейс',
  aggregator:   'Агрегатор',
  government:   'Гос. платформа',
  affiliate:    'Партнёрская сеть',
};

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
      className="inline-flex items-center gap-1 text-xs text-[var(--ocean)] hover:underline"
    >
      {copied ? <CheckCircle className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
      {copied ? 'Скопировано' : 'Копировать'}
    </button>
  );
}

export function ChannelsDashboardClient({
  orders, tours,
}: { orders: OrderStat[]; tours: TourStats }) {
  const orderMap = Object.fromEntries(orders.map(o => [o.channel, o]));

  const completedAll = (ch: typeof CHANNELS[0]) => ch.steps.every(s => s.done);
  const completedCount = (ch: typeof CHANNELS[0]) => ch.steps.filter(s => s.done).length;

  return (
    <div className="ds-page">

      {/* Заголовок */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-1">
          <Fish className="w-5 h-5 text-[var(--accent)]" />
          <h1 className="ds-h1">Каналы продаж</h1>
        </div>
        <p className="text-[var(--text-secondary)]">
          Дистрибуция туров «Камчатской рыбалки» на внешних платформах
        </p>
      </div>

      {/* Сводка по турам */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Активных туров',    value: tours.total,          color: 'var(--text-primary)' },
          { label: 'На Tripster',        value: tours.with_tripster,  color: 'var(--accent)' },
          { label: 'На Sputnik8',        value: tours.with_sputnik8,  color: 'var(--warning)' },
          { label: 'На Авито',           value: tours.with_avito,     color: 'var(--ocean)' },
        ].map(({ label, value, color }) => (
          <div key={label} className="ds-card p-4 text-center">
            <p className="text-3xl font-bold" style={{ color }}>{value}</p>
            <p className="text-xs text-[var(--text-muted)] mt-1">{label}</p>
          </div>
        ))}
      </div>

      {/* Авито: XML фид (отдельный блок) */}
      <div className="ds-card p-6 mb-6 border-l-4 border-[var(--ocean)]">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <p className="font-semibold text-[var(--text-primary)] text-lg">Авито XML Автозагрузка</p>
            <p className="text-sm text-[var(--text-secondary)] mt-0.5">
              Фид готов. Лобан регистрирует URL в ЛК Авито — и все 11 туров появятся автоматически.
            </p>
          </div>
          <span
            className="text-xs font-semibold px-2.5 py-1 rounded-full shrink-0"
            style={{ background: `${TYPE_COLORS.classifieds}18`, color: TYPE_COLORS.classifieds }}
          >
            Готово к регистрации
          </span>
        </div>
        <div className="bg-[var(--bg-hover)] rounded-lg p-4 flex items-center justify-between gap-3">
          <div>
            <p className="text-xs text-[var(--text-muted)] mb-1">URL для регистрации в Авито:</p>
            <code className="text-sm text-[var(--text-primary)] font-mono">
              https://tourhab.ru/api/channels/avito/feed
            </code>
          </div>
          <CopyButton text="https://tourhab.ru/api/channels/avito/feed" />
        </div>
        <div className="mt-3 flex items-center gap-2 text-xs text-[var(--text-muted)]">
          <p>Путь: Авито → Мои объявления → Автозагрузка → Добавить файл (XML)</p>
          <a
            href="https://avito.ru"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-[var(--ocean)] hover:underline ml-auto"
          >
            Открыть Авито <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>

      {/* Яндекс: YML фид */}
      <div className="ds-card p-6 mb-6 border-l-4 border-[var(--warning)]">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <p className="font-semibold text-[var(--text-primary)] text-lg">Яндекс YML-фид</p>
            <p className="text-sm text-[var(--text-secondary)] mt-0.5">
              Фид готов. Зарегистрируй URL в Яндекс.Услугах — туры появятся в поиске Яндекса.
            </p>
          </div>
          <span
            className="text-xs font-semibold px-2.5 py-1 rounded-full shrink-0"
            style={{ background: `${TYPE_COLORS.aggregator}18`, color: TYPE_COLORS.aggregator }}
          >
            Готово к регистрации
          </span>
        </div>
        <div className="bg-[var(--bg-hover)] rounded-lg p-4 flex items-center justify-between gap-3">
          <div>
            <p className="text-xs text-[var(--text-muted)] mb-1">URL для регистрации в Яндексе:</p>
            <code className="text-sm text-[var(--text-primary)] font-mono">
              https://tourhab.ru/api/channels/yandex/feed
            </code>
          </div>
          <CopyButton text="https://tourhab.ru/api/channels/yandex/feed" />
        </div>
        <div className="mt-3 flex items-center gap-2 text-xs text-[var(--text-muted)]">
          <p>Путь: uslugi.yandex.ru/partners → XML-импорт → Добавить фид</p>
          <a
            href="https://uslugi.yandex.ru/partners"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-[var(--ocean)] hover:underline ml-auto"
          >
            Открыть Яндекс.Услуги <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>

      {/* Все каналы */}
      <div className="space-y-4">
        {CHANNELS.map(ch => {
          const ord = orderMap[ch.id];
          const done = completedCount(ch);
          const total = ch.steps.length;
          const allDone = completedAll(ch);

          return (
            <div key={ch.id} className={`ds-card p-5 ${allDone ? 'opacity-70' : ''}`}>
              <div className="flex items-start justify-between gap-4 mb-4">
                <div className="flex items-start gap-3">
                  <div
                    className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0 mt-0.5"
                    style={{ background: TYPE_COLORS[ch.type] ?? 'var(--text-muted)' }}
                  >
                    {ch.priority}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-[var(--text-primary)]">{ch.name}</p>
                      <span
                        className="text-[10px] font-medium px-2 py-0.5 rounded"
                        style={{ background: `${TYPE_COLORS[ch.type]}18`, color: TYPE_COLORS[ch.type] }}
                      >
                        {TYPE_LABELS[ch.type]}
                      </span>
                    </div>
                    <p className="text-sm text-[var(--text-secondary)] mt-0.5">{ch.description}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  {ord && (
                    <div className="text-right">
                      <p className="text-sm font-bold text-[var(--text-primary)]">{ord.count}</p>
                      <p className="text-[10px] text-[var(--text-muted)]">заказов</p>
                    </div>
                  )}
                  <a
                    href={ch.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ds-btn ds-btn-secondary text-xs flex items-center gap-1.5"
                  >
                    Открыть <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>

              {/* Прогресс */}
              <div className="mb-3">
                <div className="flex items-center justify-between mb-1.5">
                  <p className="text-xs text-[var(--text-muted)]">Готовность</p>
                  <p className="text-xs font-medium text-[var(--text-secondary)]">{done}/{total}</p>
                </div>
                <div className="h-1.5 bg-[var(--bg-hover)] rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${(done / total) * 100}%`,
                      background: allDone ? 'var(--success)' : 'var(--accent)',
                    }}
                  />
                </div>
              </div>

              {/* Шаги */}
              <div className="space-y-1.5">
                {ch.steps.map((step, i) => (
                  <div key={i} className="flex items-start gap-2">
                    {step.done
                      ? <CheckCircle className="w-4 h-4 text-[var(--success)] shrink-0 mt-0.5" />
                      : <Clock className="w-4 h-4 text-[var(--text-muted)] shrink-0 mt-0.5" />
                    }
                    <span className={`text-sm ${step.done ? 'text-[var(--text-muted)] line-through' : 'text-[var(--text-secondary)]'}`}>
                      {step.text}
                    </span>
                  </div>
                ))}
              </div>

              {ch.feedUrl && (
                <div className="mt-3 bg-[var(--bg-hover)] rounded p-3 flex items-center justify-between gap-2">
                  <code className="text-xs font-mono text-[var(--text-secondary)]">{ch.feedUrl}</code>
                  <CopyButton text={ch.feedUrl} />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Инструкция для Лобана */}
      <div className="ds-card p-6 mt-8 border-l-4 border-[var(--accent)]">
        <p className="font-semibold text-[var(--text-primary)] mb-4">Инструкция для Лобана — что делать прямо сейчас</p>
        <ol className="space-y-3">
          {[
            {
              n: 1, title: 'Авито — зарегистрировать XML фид (10 минут)',
              body: 'Авито → Мой Авито → Управление объявлениями → Автозагрузка → Добавить. Вставить URL: https://tourhab.ru/api/channels/avito/feed',
            },
            {
              n: 2, title: 'Tripster — создать туры вручную (1-2 часа)',
              body: 'Зайти на experience.tripster.ru. Создать туры: название, описание, цену, фото. После создания — написать на guides@tripster.ru с просьбой об API доступе.',
            },
            {
              n: 3, title: 'Sputnik8 — создать туры в партнёрском ЛК',
              body: 'Зайти на sputnik8.com/for-partners. Логин: fishingkam@yandex.ru. Добавить туры рыбалки с ценами и фото.',
            },
            {
              n: 4, title: 'LevelTravel — решить проблему с СМС',
              body: 'Написать на support@level.travel: "Не могу подтвердить аккаунт, СМС не приходит на +7XXXXXXXXXX". После активации появимся в Яндекс.Путешествиях.',
            },
          ].map(({ n, title, body }) => (
            <li key={n} className="flex gap-4">
              <span
                className="w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold text-white shrink-0"
                style={{ background: 'var(--accent)' }}
              >
                {n}
              </span>
              <div>
                <p className="font-medium text-[var(--text-primary)] text-sm">{title}</p>
                <p className="text-sm text-[var(--text-secondary)] mt-0.5 leading-relaxed">{body}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>

    </div>
  );
}
