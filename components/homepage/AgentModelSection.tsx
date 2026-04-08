'use client';

import Link from 'next/link';
import { Handshake, Shield, Clock, TrendingUp, FileText, ArrowRight } from 'lucide-react';

export function AgentModelSection() {
  return (
    <section className="w-full py-20 bg-[var(--bg-card)]">
      <div className="max-w-6xl mx-auto px-4">
        {/* Header */}
        <div className="mb-16 text-center">
          <div className="inline-block mb-4 px-4 py-2 rounded-full bg-[var(--ocean)]/10">
            <span className="text-[var(--ocean)] text-sm font-semibold">АГЕНТСКАЯ МОДЕЛЬ</span>
          </div>
          <h2 className="ds-h1 mb-4">
            Мы приводим туристов — вы исполняете туры
          </h2>
          <p className="text-lg text-[var(--text-secondary)] max-w-2xl mx-auto">
            TourHab работает как агент: привлекаем клиентов через AI-ботов, сайт и мессенджеры.
            Вы концентрируетесь на том, что делаете лучше всего — проводите туры.
          </p>
        </div>

        {/* How it works */}
        <div className="grid md:grid-cols-4 gap-6 mb-16">
          {[
            { step: '01', title: 'Подключение', desc: 'Регистрация на платформе, загрузка туров, подписание агентского договора', icon: FileText },
            { step: '02', title: 'Привлечение', desc: 'AI-боты Кузьмич (Telegram, MAX) и сайт tourhab.ru приводят туристов к вашим турам', icon: TrendingUp },
            { step: '03', title: 'Обработка', desc: 'AI Lead Processor квалифицирует заявки, подбирает туры, генерирует PDF-предложения', icon: Clock },
            { step: '04', title: 'Исполнение', desc: 'Вы подтверждаете бронь, проводите тур. Мы перечисляем оплату за вычетом 10%', icon: Handshake },
          ].map(({ step, title, desc, icon: Icon }) => (
            <div key={step} className="relative p-6 rounded-lg bg-[var(--bg-primary)] border border-[var(--border)]">
              <span className="text-4xl font-bold text-[var(--accent)]/20 absolute top-4 right-4">{step}</span>
              <div className="w-10 h-10 rounded-lg bg-[var(--ocean)]/10 flex items-center justify-center mb-4">
                <Icon className="w-5 h-5 text-[var(--ocean)]" />
              </div>
              <h3 className="font-semibold text-[var(--text-primary)] mb-2">{title}</h3>
              <p className="text-sm text-[var(--text-secondary)]">{desc}</p>
            </div>
          ))}
        </div>

        {/* Benefits vs traditional */}
        <div className="grid md:grid-cols-2 gap-8 mb-16">
          <div className="p-8 rounded-lg bg-[var(--bg-primary)] border border-[var(--border)]">
            <h3 className="text-xl font-bold text-[var(--text-primary)] mb-6">
              Без TourHab
            </h3>
            <ul className="space-y-3">
              {[
                'Ручная обработка каждой заявки — 20-30 минут',
                'Пропущенные звонки и сообщения',
                'Нет ночных и выходных ответов',
                'Расходы на рекламу без гарантий',
                'Отсутствие аналитики по лидам',
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-3 text-sm text-[var(--text-muted)]">
                  <span className="text-[var(--danger)] mt-0.5">x</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="p-8 rounded-lg border-2 border-[var(--accent)] bg-[var(--bg-primary)]">
            <h3 className="text-xl font-bold text-[var(--text-primary)] mb-6">
              С TourHab
            </h3>
            <ul className="space-y-3">
              {[
                'AI обрабатывает заявку за 15 секунд — 24/7',
                '3 канала: сайт + Telegram + MAX',
                'PDF-предложение генерируется автоматически',
                'Платите только за результат — 10% с продажи',
                'Дашборд с аналитикой: конверсии, выручка, рейтинг',
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-3 text-sm text-[var(--text-secondary)]">
                  <Shield className="w-4 h-4 text-[var(--success)] flex-shrink-0 mt-0.5" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-16">
          {[
            { value: '131', label: 'маршрутов в базе знаний' },
            { value: '13', label: 'туров в каталоге' },
            { value: '3', label: 'канала привлечения' },
            { value: '10%', label: 'комиссия с продажи' },
          ].map(({ value, label }) => (
            <div key={label} className="text-center p-6 rounded-lg bg-[var(--bg-primary)] border border-[var(--border)]">
              <p className="text-3xl font-bold text-[var(--accent)]">{value}</p>
              <p className="text-sm text-[var(--text-muted)] mt-1">{label}</p>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="text-center p-10 rounded-lg bg-[var(--accent)]/5 border border-[var(--accent)]/20">
          <h3 className="text-2xl font-bold text-[var(--text-primary)] mb-3">
            Начните получать клиентов уже сегодня
          </h3>
          <p className="text-[var(--text-secondary)] mb-8 max-w-xl mx-auto">
            Регистрация за 5 минут. Первые 3 месяца AI-обработка лидов бесплатно.
            Агентский договор — прозрачные условия.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 items-center justify-center">
            <Link
              href="/operators/join"
              className="ds-btn-primary flex items-center gap-2"
            >
              Стать партнёром
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/legal/agent-agreement"
              className="ds-btn ds-btn-secondary"
            >
              Агентский договор
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
