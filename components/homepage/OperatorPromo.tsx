'use client';

import Link from 'next/link';
import { Brain, Zap, BarChart3, ArrowRight, CheckCircle } from 'lucide-react';

export function OperatorPromo() {
  return (
    <section className="w-full py-20 bg-[var(--bg-primary)]">
      <div className="max-w-6xl mx-auto px-4">
        {/* Header */}
        <div className="mb-16 text-center">
          <div className="inline-block mb-4 px-4 py-2 rounded-full bg-[var(--accent)]/10">
            <span className="text-[var(--accent)] text-sm font-semibold">ДЛЯ ТУРОПЕРАТОРОВ</span>
          </div>
          <h2 className="ds-h1 mb-4">
            {'Обработка заявок за 2 клика вместо 30 минут'}
          </h2>
          <p className="text-lg text-[var(--text-secondary)] max-w-2xl mx-auto">
            Кузьмич принимает обращение 24/7, система квалифицирует лид, подбирает туры, готовит PDF-предложение и черновик ответа. Менеджер подтверждает и закрывает сделку.
          </p>
        </div>

        {/* 3 Features */}
        <div className="grid md:grid-cols-3 gap-6 mb-16">
          {/* Feature 1 */}
          <div className="p-6 rounded-lg bg-[var(--bg-card)] border border-[var(--border)]">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-lg bg-[var(--accent)]/10 flex items-center justify-center">
                <Brain className="w-6 h-6 text-[var(--accent)]" />
              </div>
              <h3 className="font-semibold text-[var(--text-primary)]">Кузьмич 24/7</h3>
            </div>
            <p className="text-sm text-[var(--text-secondary)]">
              Принимает первый диалог, собирает бюджет, даты и интересы туриста из чата, формы или мессенджера
            </p>
          </div>

          {/* Feature 2 */}
          <div className="p-6 rounded-lg bg-[var(--bg-card)] border border-[var(--border)]">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-lg bg-[var(--ocean)]/10 flex items-center justify-center">
                <Zap className="w-6 h-6 text-[var(--ocean)]" />
              </div>
              <h3 className="font-semibold text-[var(--text-primary)]">Подбор и черновик</h3>
            </div>
            <p className="text-sm text-[var(--text-secondary)]">
              Подбирает 1-3 релевантных тура и готовит черновик ответа менеджеру с учётом контекста лида
            </p>
          </div>

          {/* Feature 3 */}
          <div className="p-6 rounded-lg bg-[var(--bg-card)] border border-[var(--border)]">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-lg bg-[var(--success)]/10 flex items-center justify-center">
                <BarChart3 className="w-6 h-6 text-[var(--success)]" />
              </div>
              <h3 className="font-semibold text-[var(--text-primary)]">PDF + Telegram</h3>
            </div>
            <p className="text-sm text-[var(--text-secondary)]">
              Генерирует предложение и отправляет менеджеру ссылку в Telegram, чтобы не терять темп обработки
            </p>
          </div>
        </div>

        {/* Results */}
        <div className="grid md:grid-cols-2 gap-8 mb-16 p-8 rounded-lg bg-[var(--bg-card)] border border-[var(--border)]">
          <div>
            <h3 className="text-2xl font-bold text-[var(--text-primary)] mb-6">
              Результаты в цифрах
            </h3>
            <ul className="space-y-4">
              {[
                'Каждый лид получает первый осмысленный ответ без ожидания менеджера',
                'Система автоматически подбирает туры с доступными слотами',
                'Менеджер видит уже квалифицированный лид, а не сырой входящий текст',
                'Предложение и уведомление приходят в Telegram без ручной сборки PDF',
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-[var(--success)] flex-shrink-0 mt-0.5" />
                  <span className="text-[var(--text-secondary)]">{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="flex flex-col justify-center">
            <div className="mb-6 p-4 rounded-lg bg-[var(--accent)]/5 border border-[var(--accent)]/20">
              <p className="font-semibold text-[var(--text-primary)] mb-2">
                Как это работает
              </p>
              <ol className="text-sm text-[var(--text-secondary)] space-y-2">
                <li><span className="font-semibold">1.</span> Турист пишет Кузьмичу или оставляет заявку</li>
                <li><span className="font-semibold">2.</span> Система извлекает контекст и ищет подходящие туры</li>
                <li><span className="font-semibold">3.</span> Готовит PDF и черновик ответа для менеджера</li>
                <li><span className="font-semibold">4.</span> Вам приходит уведомление в Telegram</li>
                <li><span className="font-semibold">5.</span> Менеджер подтверждает и продолжает диалог без ручного старта с нуля</li>
              </ol>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="text-center">
          <div className="mb-8 inline-block">
            <p className="text-sm text-[var(--text-muted)] mb-2">
              Первые 3 месяца бесплатно
            </p>
            <h3 className="text-2xl font-bold text-[var(--text-primary)]">
              Попробуйте Кузьмича и operator tools сейчас
            </h3>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 items-center justify-center">
            <Link
              href="/operators/join"
              className="ds-btn-primary flex items-center gap-2"
            >
              Зарегистрироваться как оператор
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/hub/operator/leads"
              className="ds-btn ds-btn-secondary"
            >
              Посмотреть демо
            </Link>
          </div>

          <p className="text-xs text-[var(--text-muted)] mt-6">
            Без кредитной карты. Только email. Подключится за 5 минут.
          </p>
        </div>
      </div>
    </section>
  );
}
