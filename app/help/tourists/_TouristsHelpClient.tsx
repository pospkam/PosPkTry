'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  ChevronDown, ChevronRight, Map, Search, CreditCard,
  CheckCircle, Star, Shield, ArrowRight, Smartphone,
  MessageSquare, Mail, Clock, RotateCcw, Gift, AlertTriangle,
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

export default function TouristsHelpClient() {
  return (
    <div className="min-h-screen bg-[var(--bg-primary)]">
      {/* Hero */}
      <div className="bg-[var(--bg-card)] border-b border-[var(--border)]">
        <div className="max-w-4xl mx-auto px-4 py-12">
          <Link href="/" className="inline-flex items-center gap-2 text-sm text-[var(--text-secondary)] hover:text-[var(--accent)] mb-6 transition-colors">
            <ChevronRight size={14} className="rotate-180" /> На главную
          </Link>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-[var(--ocean)] flex items-center justify-center">
              <Map size={20} className="text-white" />
            </div>
            <span className="text-sm font-medium text-[var(--ocean)] uppercase tracking-wider">Для туристов</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-[var(--text-primary)] mb-3" style={{ fontFamily: 'var(--font-playfair)' }}>
            Помощь туристам
          </h1>
          <p className="text-[var(--text-secondary)] text-lg max-w-2xl">
            Как найти тур мечты, забронировать и безопасно путешествовать по Камчатке.
          </p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-10 space-y-12">

        {/* Быстрые ссылки */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Найти тур', icon: Search, href: '#search' },
            { label: 'Бронирование', icon: CreditCard, href: '#booking' },
            { label: 'После оплаты', icon: CheckCircle, href: '#after' },
            { label: 'Безопасность', icon: Shield, href: '#safety' },
          ].map(({ label, icon: Icon, href }) => (
            <a
              key={label}
              href={href}
              className="ds-card p-4 flex flex-col items-center gap-2 hover:bg-[var(--bg-hover)] transition-colors text-center"
            >
              <Icon size={22} className="text-[var(--ocean)]" />
              <span className="text-sm font-medium text-[var(--text-primary)]">{label}</span>
            </a>
          ))}
        </div>

        {/* Как найти тур */}
        <section id="search">
          <h2 className="ds-h2 mb-4">Как найти тур</h2>
          <div className="ds-card p-5 mb-4">
            <div className="grid md:grid-cols-3 gap-4">
              {[
                {
                  icon: Map,
                  title: 'Интерактивная карта',
                  desc: 'Откройте /map — 1189 маршрутов на Камчатке. Фильтруйте по типу активности, кликайте на точку для деталей.',
                },
                {
                  icon: Search,
                  title: 'Каталог туров',
                  desc: 'Раздел /routes — все маршруты с фильтрами по цене, сложности, типу. Удобно для планирования программы.',
                },
                {
                  icon: Smartphone,
                  title: 'AI Планировщик',
                  desc: 'На главной странице — умный планировщик. Расскажите о своих интересах и датах — получите персональные рекомендации.',
                },
              ].map(({ icon: Icon, title, desc }) => (
                <div key={title}>
                  <Icon size={20} className="text-[var(--ocean)] mb-2" />
                  <p className="font-semibold text-sm text-[var(--text-primary)] mb-1">{title}</p>
                  <p className="text-sm text-[var(--text-secondary)]">{desc}</p>
                </div>
              ))}
            </div>
          </div>
          <Accordion items={[
            {
              q: 'Как понять, подходит ли тур по сложности?',
              a: 'На странице каждого тура указана сложность: лёгкий (подходит всем), средний (базовая физическая подготовка), сложный (опыт горных походов). В описании всегда есть информация о перепаде высот, длине маршрута и необходимом снаряжении.',
            },
            {
              q: 'Можно ли поехать с детьми?',
              a: 'Многие туры подходят для семей. Фильтр «Семейный» в каталоге покажет подходящие варианты. В описании тура оператор обычно указывает минимальный возраст участников.',
            },
            {
              q: 'Что значит «Фрисейл» на доступности?',
              a: 'FREESALE — тур работает без ограничения мест в указанный сезон. Вы можете забронировать любую дату в пределах сезона оператора.',
            },
          ]} />
        </section>

        {/* Бронирование */}
        <section id="booking">
          <h2 className="ds-h2 mb-4">Как забронировать</h2>
          <div className="ds-card p-6 mb-4">
            <div className="space-y-4">
              {[
                { n: 1, t: 'Выберите тур и дату', d: 'На странице маршрута или в каталоге кликните «Забронировать». Выберите дату из доступных в календаре.' },
                { n: 2, t: 'Укажите участников', d: 'Количество взрослых и детей. Цена пересчитается автоматически. Здесь же отображается скидка программы лояльности.' },
                { n: 3, t: 'Заполните данные', d: 'Имя, телефон, email. Дополнительные пожелания — аллергии, особые требования к снаряжению.' },
                { n: 4, t: 'Оплатите', d: 'CloudPayments — карта Visa/MC/МИР, СБП. Оплата защищена 3D-Secure. Подтверждение приходит мгновенно.' },
              ].map(({ n, t, d }) => (
                <div key={n} className="flex gap-4">
                  <div className="w-7 h-7 rounded-full bg-[var(--ocean)] text-white flex items-center justify-center text-sm font-bold flex-shrink-0">
                    {n}
                  </div>
                  <div>
                    <p className="font-semibold text-[var(--text-primary)] text-sm">{t}</p>
                    <p className="text-sm text-[var(--text-secondary)]">{d}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <Accordion items={[
            {
              q: 'Какие способы оплаты принимаются?',
              a: 'Банковские карты Visa, Mastercard, МИР — через CloudPayments. СБП (Система быстрых платежей). Оплата происходит в защищённой форме, данные карты не передаются оператору.',
            },
            {
              q: 'Могу ли я забронировать для другого человека?',
              a: 'Да. При оформлении укажите данные участника тура (имя, телефон). Квитанция об оплате придёт на ваш email.',
            },
            {
              q: 'Как применить промокод или реферальный код?',
              a: 'В форме бронирования есть поле «Промокод». Введите код — скидка применится автоматически до оплаты. Баллы лояльности применяются в отдельном поле.',
            },
            {
              q: 'Что если нужная дата недоступна?',
              a: 'Свяжитесь с оператором напрямую через контакты на странице тура — часто можно договориться об индивидуальном выезде или попасть в лист ожидания.',
            },
          ]} />
        </section>

        {/* После оплаты */}
        <section id="after">
          <h2 className="ds-h2 mb-4">После оплаты</h2>
          <Accordion items={[
            {
              q: 'Что происходит после оплаты?',
              a: 'Вы получаете подтверждение на email с деталями бронирования. Оператор получает уведомление и свяжется с вами в течение суток для уточнения деталей: точка встречи, что взять, во что одеться.',
            },
            {
              q: 'Как отменить бронирование?',
              a: 'Свяжитесь с оператором напрямую или напишите в поддержку support@tourhab.ru. Условия возврата зависят от времени до начала тура: более 7 дней — полный возврат, 3–7 дней — 50%, менее 3 дней — по договорённости с оператором.',
            },
            {
              q: 'Что если оператор отменил тур?',
              a: 'При отмене тура по инициативе оператора вы получаете полный возврат в течение 5 рабочих дней. Дополнительно — бонусные баллы в программе лояльности как компенсация.',
            },
            {
              q: 'Могу ли я оставить отзыв?',
              a: 'После завершения тура оператор или платформа пришлёт запрос на отзыв. Отзыв можно оставить в личном кабинете в разделе «Мои поездки». За отзыв начисляются 50 баллов лояльности.',
            },
          ]} />
        </section>

        {/* Лояльность */}
        <section id="loyalty">
          <h2 className="ds-h2 mb-4">Программа лояльности</h2>
          <div className="ds-card p-5 mb-4 border-l-4 border-[var(--success)]">
            <div className="flex gap-3 items-start">
              <Gift size={20} className="text-[var(--success)] flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-[var(--text-primary)] mb-1">Как зарабатывать баллы</p>
                <div className="text-sm text-[var(--text-secondary)] space-y-1">
                  <p>1% от суммы каждого бронирования = баллы на следующий тур</p>
                  <p>+100 баллов — первое бронирование</p>
                  <p>+50 баллов — за каждый отзыв</p>
                  <p>+500 баллов — за каждого приглашённого друга</p>
                </div>
              </div>
            </div>
          </div>
          <Accordion items={[
            {
              q: 'Как использовать баллы?',
              a: 'Баллы применяются при следующем бронировании в поле «Баллы лояльности». 1 балл = 1 рубль скидки. Посмотреть баланс и историю — в личном кабинете раздел «Лояльность».',
            },
            {
              q: 'Сколько действуют баллы?',
              a: 'Баллы действуют 365 дней с момента начисления. Следите за датами в личном кабинете.',
            },
            {
              q: 'Как пригласить друга?',
              a: 'В разделе «Лояльность» скопируйте ваш реферальный код. Когда друг зарегистрируется и оплатит первый тур — вы получите 500 баллов, друг — 200.',
            },
          ]} />
        </section>

        {/* Безопасность */}
        <section id="safety">
          <h2 className="ds-h2 mb-4">Безопасность на Камчатке</h2>
          <div className="ds-card p-5 mb-4 bg-red-50 dark:bg-red-950/20 border-l-4 border-[var(--danger)]">
            <div className="flex gap-3 items-start">
              <AlertTriangle size={20} className="text-[var(--danger)] flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-[var(--text-primary)] mb-1">Кнопка SOS</p>
                <p className="text-sm text-[var(--text-secondary)]">
                  В приложении доступна кнопка SOS — мгновенная отправка координат в МЧС Камчатки.
                  Используйте только в реальной чрезвычайной ситуации. Доступна даже без полного интернета.
                </p>
              </div>
            </div>
          </div>
          <Accordion items={[
            {
              q: 'Нужна ли страховка?',
              a: 'Настоятельно рекомендуем туристическую страховку с покрытием горных/экстремальных активностей и вертолётной эвакуации. Камчатка — удалённый регион, стоимость эвакуации может превышать 300 000 ₽.',
            },
            {
              q: 'Обязательна ли регистрация в МЧС?',
              a: 'Для маршрутов выше 1500 м и в труднодоступных районах — да, обязательна. Оператор обязан зарегистрировать группу. Уточняйте при бронировании.',
            },
            {
              q: 'Что взять с собой в поход на Камчатке?',
              a: 'Базовый список: непромокаемая куртка (даже летом), термобельё, трекинговые ботинки, powerbank, аптечка, спрей от медведей (у оператора). Оператор пришлёт детальный список после бронирования.',
            },
            {
              q: 'Как обстоит связь в горах?',
              a: 'Мобильная связь есть только вблизи Петропавловска-Камчатского и крупных сёл. В горах и на побережье — спутниковые устройства у гида. Обсудите с оператором заранее.',
            },
          ]} />
        </section>

        {/* Поддержка */}
        <section>
          <h2 className="ds-h2 mb-4">Поддержка туристов</h2>
          <div className="grid md:grid-cols-3 gap-4">
            {[
              { icon: MessageSquare, title: 'Telegram-бот', value: '@KuzmichKam_bot', desc: 'Куzmич — ваш камчатский помощник. Рекомендации, маршруты, погода' },
              { icon: Mail, title: 'Email', value: 'support@tourhab.ru', desc: 'Ответ в течение 4 часов в рабочее время' },
              { icon: Clock, title: 'Поддержка работает', value: 'Пн–Пт 9:00–18:00', desc: 'Камчатское время (UTC+12)' },
            ].map(({ icon: Icon, title, value, desc }) => (
              <div key={title} className="ds-card p-4">
                <Icon size={18} className="text-[var(--ocean)] mb-2" />
                <p className="text-xs text-[var(--text-muted)] mb-1">{title}</p>
                <p className="font-semibold text-[var(--text-primary)] text-sm">{value}</p>
                <p className="text-xs text-[var(--text-secondary)] mt-1">{desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <div className="ds-card p-8 text-center bg-[var(--ocean)] text-white rounded-xl">
          <h2 className="text-2xl font-bold mb-2" style={{ fontFamily: 'var(--font-playfair)' }}>
            Готовы открыть Камчатку?
          </h2>
          <p className="mb-5 opacity-90">1189 маршрутов. Вулканы, медведи, термальные источники, сплавы.</p>
          <Link
            href="/marketplace"
            className="inline-flex items-center gap-2 bg-white text-[var(--ocean)] px-6 py-3 rounded-lg font-semibold hover:bg-opacity-90 transition-colors"
          >
            Смотреть все туры <ArrowRight size={18} />
          </Link>
        </div>

      </div>
    </div>
  );
}
