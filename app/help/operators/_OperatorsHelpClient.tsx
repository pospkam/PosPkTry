'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  ChevronDown, ChevronRight, UserPlus, Package, Calendar,
  DollarSign, Globe, TrendingUp, Zap, CheckCircle, ArrowRight,
  Phone, Mail, MessageSquare, Clock, Shield, BarChart3,
} from 'lucide-react';

interface AccordionItem {
  q: string;
  a: string | React.ReactNode;
}

function Accordion({ items }: { items: AccordionItem[] }) {
  const [open, setOpen] = useState<number | null>(null);
  return (
    <div className="space-y-2">
      {items.map((item, i) => (
        <div key={i} className="ds-card overflow-hidden">
          <button
            onClick={() => setOpen(open === i ? null : i)}
            className="w-full flex items-center justify-between p-4 text-left hover:bg-[var(--bg-hover)] transition-colors"
          >
            <span className="font-medium text-[var(--text-primary)]">{item.q}</span>
            <ChevronDown
              size={18}
              className={`text-[var(--text-secondary)] transition-transform flex-shrink-0 ml-3 ${open === i ? 'rotate-180' : ''}`}
            />
          </button>
          {open === i && (
            <div className="px-4 pb-4 text-[var(--text-secondary)] text-sm leading-relaxed border-t border-[var(--border)]">
              <div className="pt-3">{item.a}</div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function Step({ num, title, desc, icon: Icon }: { num: number; title: string; desc: string; icon: React.ElementType }) {
  return (
    <div className="flex gap-4">
      <div className="flex-shrink-0 w-10 h-10 rounded-full bg-[var(--accent)] text-white flex items-center justify-center font-bold text-sm">
        {num}
      </div>
      <div className="flex-1 pb-6 border-b border-[var(--border)] last:border-0 last:pb-0">
        <div className="flex items-center gap-2 mb-1">
          <Icon size={16} className="text-[var(--accent)]" />
          <h3 className="font-semibold text-[var(--text-primary)]">{title}</h3>
        </div>
        <p className="text-sm text-[var(--text-secondary)] leading-relaxed">{desc}</p>
      </div>
    </div>
  );
}

export default function OperatorsHelpClient() {
  return (
    <div className="min-h-screen bg-[var(--bg-primary)]">
      {/* Hero */}
      <div className="bg-[var(--bg-card)] border-b border-[var(--border)]">
        <div className="max-w-4xl mx-auto px-4 py-12">
          <Link href="/" className="inline-flex items-center gap-2 text-sm text-[var(--text-secondary)] hover:text-[var(--accent)] mb-6 transition-colors">
            <ChevronRight size={14} className="rotate-180" /> На главную
          </Link>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-[var(--accent)] flex items-center justify-center">
              <Package size={20} className="text-white" />
            </div>
            <span className="text-sm font-medium text-[var(--accent)] uppercase tracking-wider">Для операторов</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-[var(--text-primary)] mb-3" style={{ fontFamily: 'var(--font-playfair)' }}>
            Инструкция оператора TourHab
          </h1>
          <p className="text-[var(--text-secondary)] text-lg max-w-2xl">
            Полное руководство: от регистрации до первой выплаты. Размещайте туры, принимайте бронирования и выходите на международные OTA.
          </p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-10 space-y-12">

        {/* Быстрые ссылки */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Регистрация', icon: UserPlus, href: '#register' },
            { label: 'Туры', icon: Package, href: '#tours' },
            { label: 'Бронирования', icon: Calendar, href: '#bookings' },
            { label: 'Выплаты', icon: DollarSign, href: '#finance' },
          ].map(({ label, icon: Icon, href }) => (
            <a
              key={label}
              href={href}
              className="ds-card p-4 flex flex-col items-center gap-2 hover:bg-[var(--bg-hover)] transition-colors text-center"
            >
              <Icon size={22} className="text-[var(--accent)]" />
              <span className="text-sm font-medium text-[var(--text-primary)]">{label}</span>
            </a>
          ))}
        </div>

        {/* Шаги */}
        <section id="register">
          <h2 className="ds-h2 mb-6">Как начать работу</h2>
          <div className="ds-card p-6 space-y-0">
            <Step num={1} icon={UserPlus} title="Регистрация"
              desc="Перейдите на tourhab.ru/auth/register-operator. Заполните форму: название компании, контактное лицо, телефон, email, краткое описание деятельности. Регистрация занимает 2 минуты." />
            <Step num={2} icon={Shield} title="Проверка и одобрение"
              desc="После регистрации заявка поступает в очередь администраторов. Среднее время проверки — 1 рабочий день. Вы получите уведомление на email и в Telegram о статусе заявки." />
            <Step num={3} icon={Package} title="Заполнение профиля"
              desc="В личном кабинете оператора (/hub/operator) пройдите онбординг: загрузите фото, добавьте описание услуг, укажите реквизиты для выплат (СБП / карта / расчётный счёт)." />
            <Step num={4} icon={Calendar} title="Добавление туров"
              desc="Создайте первый тур: название, описание, базовая цена, продолжительность. Откройте даты в календаре с количеством мест. Тур сразу появится в каталоге и на карте." />
            <Step num={5} icon={CheckCircle} title="Получение первого бронирования"
              desc="Когда турист бронирует тур — вы получаете уведомление в Telegram и email. Подтвердите бронирование в разделе Бронирования. Деньги удерживаются до окончания тура + 36 часов." />
          </div>
        </section>

        {/* Туры */}
        <section id="tours">
          <h2 className="ds-h2 mb-4">Управление турами</h2>
          <Accordion items={[
            {
              q: 'Как добавить новый тур?',
              a: 'В разделе «Туры» нажмите «Добавить тур». Заполните: название, описание (минимум 100 символов), базовую цену за человека, продолжительность в часах, тип активности (треккинг, рыбалка, вертолётный и т.д.). Тур сохраняется как черновик — опубликуйте после проверки.',
            },
            {
              q: 'Как открыть даты и управлять местами?',
              a: 'В разделе «Календарь» выберите тур, кликните на дату или используйте bulk-заполнение (диапазон дат, количество мест). Система автоматически считает свободные места при бронировании. Даты без слотов = FREESALE (неограниченные места).',
            },
            {
              q: 'Что такое теги туров?',
              a: 'Теги помогают туристам находить ваши туры в каталоге. Используйте теги: семейный, для фотографов, вулкан, медведи, рыбалка, сплав, термальные источники и т.д. Добавляются при создании/редактировании тура.',
            },
            {
              q: 'Могу ли я временно скрыть тур?',
              a: 'Да. В карточке тура переключите статус в «Неактивный». Тур исчезнет из каталога, но сохранит все настройки. Восстановить можно в любой момент.',
            },
            {
              q: 'Как работают динамические цены?',
              a: 'В разделе «Динамические цены» (admin) можно настроить правила автоматического изменения цены: высокий сезон (+30%), ранняя бронь (-15%), последний момент (+20%), высокая загрузка (+25%), групповая скидка (-10%). Правила применяются автоматически при каждом расчёте цены.',
            },
          ]} />
        </section>

        {/* Бронирования */}
        <section id="bookings">
          <h2 className="ds-h2 mb-4">Бронирования</h2>
          <Accordion items={[
            {
              q: 'Как приходит уведомление о бронировании?',
              a: 'Мгновенно в Telegram (если указан telegram_chat_id в контактах) и на email. Уведомление содержит: имя туриста, дату, количество гостей, сумму, контакт для связи.',
            },
            {
              q: 'Статусы бронирований — что они означают?',
              a: (
                <div className="space-y-2">
                  {[
                    { status: 'Новое', desc: 'Бронирование создано, оплата проходит' },
                    { status: 'Подтверждено', desc: 'Оплата получена, тур подтверждён' },
                    { status: 'Выполнено', desc: 'Тур состоялся, деньги переходят в выплату' },
                    { status: 'Отменено', desc: 'Отмена оператором или туристом' },
                    { status: 'No Show', desc: 'Турист не явился' },
                  ].map(({ status, desc }) => (
                    <div key={status} className="flex gap-3">
                      <span className="ds-badge font-medium min-w-[110px]">{status}</span>
                      <span>{desc}</span>
                    </div>
                  ))}
                </div>
              ),
            },
            {
              q: 'Как связаться с туристом?',
              a: 'В карточке бронирования есть имя, телефон и email туриста. Свяжитесь напрямую для уточнения деталей: точка встречи, что взять с собой, особые пожелания.',
            },
            {
              q: 'Что делать при отмене тура из-за погоды?',
              a: 'В разделе «Календарь» есть кнопка «Проверить погоду». Система подтягивает прогноз и уведомляет о рисках. При отмене туристы получают автоматическое уведомление и возврат. Свяжитесь с поддержкой для оформления group cancellation.',
            },
          ]} />
        </section>

        {/* Финансы */}
        <section id="finance">
          <h2 className="ds-h2 mb-4">Финансы и выплаты</h2>
          <div className="ds-card p-5 mb-4 border-l-4 border-[var(--accent)]">
            <div className="flex gap-3 items-start">
              <DollarSign size={20} className="text-[var(--accent)] flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-[var(--text-primary)] mb-1">Как работает комиссия</p>
                <p className="text-sm text-[var(--text-secondary)]">
                  Стартовая комиссия платформы — <strong>15%</strong>. С ростом оборота комиссия снижается автоматически:
                  от 100 000 ₽/мес → 12%, от 500 000 ₽/мес → 10%, от 1 000 000 ₽/мес → 8%.
                  Комиссия пересчитывается автоматически после каждого выполненного тура.
                </p>
              </div>
            </div>
          </div>
          <Accordion items={[
            {
              q: 'Когда я получу деньги за тур?',
              a: 'Деньги удерживаются до окончания тура + 36 часов (время на обработку рекламаций). После этого автоматически переходят в статус «К выплате». Выплата производится в течение 3 рабочих дней на указанные реквизиты.',
            },
            {
              q: 'Какие реквизиты можно указать?',
              a: 'СБП (номер телефона + банк), банковская карта, расчётный счёт юридического лица. Реквизиты указываются в разделе «Финансы» → «Реквизиты». Изменение реквизитов требует подтверждения от администратора.',
            },
            {
              q: 'Как отслеживать выплаты?',
              a: 'В разделе «Финансы» видны все транзакции: статус (HELD / К выплате / Выплачено), дата, сумма, тур. История доступна за весь период работы.',
            },
            {
              q: 'Что если турист требует возврат?',
              a: 'Обратитесь в поддержку через раздел «Уведомления» или напрямую admin@tourhab.ru. Возврат рассматривается индивидуально согласно правилам отмены тура. Если тур отменён по вине оператора — возврат 100%.',
            },
          ]} />
        </section>

        {/* OCTO / OTA */}
        <section id="ota">
          <h2 className="ds-h2 mb-4">Выход на международный рынок (OCTO)</h2>
          <div className="ds-card p-5 mb-4 bg-[var(--bg-hover)]">
            <div className="flex items-start gap-3">
              <Globe size={20} className="text-[var(--ocean)] flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-[var(--text-primary)] mb-1">Что такое OCTO?</p>
                <p className="text-sm text-[var(--text-secondary)]">
                  OCTO — стандарт подключения к международным туристическим маркетплейсам: Tiqets, Headout, Musement (TUI), Go City, Groupon.
                  Ваши туры автоматически появляются на этих платформах. Бронирования синхронизируются в реальном времени.
                </p>
              </div>
            </div>
          </div>
          <Accordion items={[
            {
              q: 'Что нужно для подключения к OTA?',
              a: 'Ничего дополнительного от вас не требуется — OCTO API уже настроен для всех туров на платформе. Администратор TourHab создаёт API-ключ и подаёт заявку на партнёрство с OTA. После одобрения ваши туры появляются автоматически.',
            },
            {
              q: 'Изменится ли цена для иностранных туристов?',
              a: 'Базовая цена та же, что вы указываете в системе. OTA могут добавлять собственную наценку. Вы получаете выплату по вашей цене минус комиссия TourHab.',
            },
            {
              q: 'Как работают динамические цены в OTA?',
              a: 'Настроенные вами правила ценообразования автоматически применяются при проверке доступности через OCTO API. Если настроена наценка в высокий сезон — иностранный турист увидит актуальную цену.',
            },
          ]} />
        </section>

        {/* Контакты */}
        <section>
          <h2 className="ds-h2 mb-4">Поддержка операторов</h2>
          <div className="grid md:grid-cols-3 gap-4">
            {[
              { icon: Mail, title: 'Email', value: 'operators@tourhab.ru', desc: 'Ответ в течение 4 часов в рабочее время' },
              { icon: MessageSquare, title: 'Telegram', value: '@tourhab_support', desc: 'Быстрые вопросы — отвечаем в мессенджере' },
              { icon: Clock, title: 'Рабочее время', value: 'Пн–Пт 9:00–18:00', desc: 'Камчатское время (UTC+12)' },
            ].map(({ icon: Icon, title, value, desc }) => (
              <div key={title} className="ds-card p-4">
                <Icon size={18} className="text-[var(--accent)] mb-2" />
                <p className="text-xs text-[var(--text-muted)] mb-1">{title}</p>
                <p className="font-semibold text-[var(--text-primary)] text-sm">{value}</p>
                <p className="text-xs text-[var(--text-secondary)] mt-1">{desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <div className="ds-card p-8 text-center bg-[var(--accent)] text-white rounded-xl">
          <h2 className="text-2xl font-bold mb-2" style={{ fontFamily: 'var(--font-playfair)' }}>
            Готовы разместить туры?
          </h2>
          <p className="mb-5 opacity-90">Регистрация занимает 2 минуты. Первый тур — ещё 5.</p>
          <Link
            href="/auth/register-operator"
            className="inline-flex items-center gap-2 bg-white text-[var(--accent)] px-6 py-3 rounded-lg font-semibold hover:bg-opacity-90 transition-colors"
          >
            Зарегистрироваться как оператор <ArrowRight size={18} />
          </Link>
        </div>

      </div>
    </div>
  );
}
