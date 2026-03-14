'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Phone, MapPin, Fish, Calendar, Home, Users, Star, Shield, ChevronDown } from 'lucide-react';

const GALLERY = [
  '2025-01-27_142444.jpg',
  '2025-01-27_142653.jpg',
  '2025-01-27_142814.jpg',
  '2025-01-27_142818_1.jpg',
  '2025-01-27_142551.jpg',
  '2025-01-27_142551_1.jpg',
  '2025-02-10_151416.jpg',
  '2025-02-10_151421.jpg',
  '2025-02-10_151433.jpg',
  '2025-02-10_151441.jpg',
  '2025-02-10_151450.jpg',
  '2025-01-09_113928_1_.jpg',
];

const TOURS = [
  {
    title: 'Однодневный тур',
    icon: '🎣',
    desc: 'Один насыщенный день на реке. Подходит для первого знакомства с камчатской рыбалкой.',
    winter: { price: 'от 15 000 ₽', label: 'Зима' },
    summer: { price: 'от 18 000 ₽', label: 'Лето' },
    includes: ['Гид на весь день', 'Снаряжение', 'Питание на берегу', 'Трансфер до места'],
  },
  {
    title: 'Многодневный тур',
    icon: '⛺',
    desc: 'Несколько дней погружения в дикую природу. Максимальный шанс поймать трофей.',
    winter: { price: 'от 18 000 ₽/сут', label: 'Зима' },
    summer: { price: 'от 25 000 ₽/сут', label: 'Лето' },
    includes: ['Проживание на базе', 'Питание 3 раза', 'Гид каждый день', 'Снаряжение'],
  },
  {
    title: 'Семейный тур',
    icon: '👨‍👩‍👧',
    desc: 'Специальная программа для семей с детьми. Безопасно, интересно, незабываемо.',
    winter: { price: 'по запросу', label: 'Зима' },
    summer: { price: 'по запросу', label: 'Лето' },
    includes: ['Адаптация под детей', 'Упрощённые снасти', 'Проживание', 'Питание'],
  },
];

const FEATURES = [
  { icon: Shield, title: 'Лицензионный участок', desc: 'Участок №1182 (р. Камчатка), 365 га, 21,5 км. Договор №02/2023-л от 22.05.2023.' },
  { icon: Fish, title: 'Богатый рыбный запас', desc: 'Чавыча, кижуч, нерка, горбуша, кета, микижа, хариус, кунжа, голец.' },
  { icon: Home, title: 'Комфортная база', desc: 'Двухэтажный корпус 400 м² — номера, кухня, столовая, душ, туалет.' },
  { icon: Calendar, title: 'Круглый год', desc: 'Зима: подлёдная рыбалка. Лето: лосось. Работаем 12 месяцев.' },
  { icon: Users, title: 'Опытные гиды', desc: 'Анатолий и Александр — местные профессионалы с многолетним опытом.' },
  { icon: Star, title: 'Техники ловли', desc: 'Спиннинг, нахлыст и другие методы — от новичков до опытных рыбаков.' },
];

const SEASON = [
  { months: 'Июнь — Июль', fish: 'Чавыча (королевский лосось)', color: 'var(--accent)', season: 'Лето' },
  { months: 'Июль — Август', fish: 'Нерка, горбуша, кета', color: 'var(--ocean)', season: 'Лето' },
  { months: 'Август — Сентябрь', fish: 'Кижуч, микижа (радужная форель)', color: 'var(--success)', season: 'Лето' },
  { months: 'Декабрь — Март', fish: 'Подлёдная: микижа, хариус, кунжа, голец', color: '#64B5F6', season: 'Зима' },
];

const FAQ = [
  {
    q: 'Какое время года лучше для рыбалки?',
    a: 'Летний сезон: июнь — сентябрь (тихоокеанские лососи). Зимний: декабрь — март (подлёдная рыбалка). Мы работаем круглый год.',
  },
  {
    q: 'Что включено в стоимость?',
    a: 'Трансфер до места ловли, услуги гида, снаряжение, питание и проживание. Дополнительные услуги — отдельно.',
  },
  {
    q: 'Можно ли забрать пойманную рыбу?',
    a: 'Да. В рамках разрешённого объёма рыба ваша. Помогаем обработать и упаковать. Организуем копчение или вяление за доп. плату.',
  },
  {
    q: 'Снаряжение нужно везти с собой?',
    a: 'Не обязательно. Предоставляем основное снаряжение. Если есть любимые снасти — берите с собой.',
  },
];

export default function FishingKamClient() {
  const [showModal, setShowModal] = useState(false);
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [consent, setConsent] = useState(false);
  const [sent, setSent] = useState(false);
  const [faqOpen, setFaqOpen] = useState<number | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, phone, source_url: 'https://fishingkam.ru', route_title: 'Рыбалка на Камчатке' }),
      });
    } catch { /* silent */ }
    setSent(true);
  };

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)]">

      {/* ── Sticky header ──────────────────────────────────────── */}
      <header className="sticky top-0 z-50 bg-[var(--bg-card)] border-b border-[var(--border)]">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Fish className="w-5 h-5 text-[var(--accent)]" />
            <span className="font-bold text-[var(--text-primary)] text-lg" style={{ fontFamily: 'var(--font-playfair)' }}>
              Камчатская рыбалка
            </span>
          </div>
          <div className="hidden md:flex items-center gap-6 text-sm text-[var(--text-secondary)]">
            <a href="tel:+79147822222" className="flex items-center gap-1.5 hover:text-[var(--accent)] transition-colors">
              <Phone className="w-3.5 h-3.5" />
              +7 (914) 782-22-22
            </a>
            <a href="tel:+79992997007" className="flex items-center gap-1.5 hover:text-[var(--accent)] transition-colors">
              <Phone className="w-3.5 h-3.5" />
              +7 (999) 299-70-07
            </a>
          </div>
          <button onClick={() => setShowModal(true)} className="ds-btn ds-btn-primary text-sm px-4 py-2">
            Оставить заявку
          </button>
        </div>
      </header>

      {/* ── Hero ───────────────────────────────────────────────── */}
      <section className="relative h-[90vh] min-h-[580px] overflow-hidden">
        <Image
          src="/images/fishingkam/2025-01-27_142444.jpg"
          alt="Рыбалка на реке Камчатка"
          fill
          className="object-cover object-center"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/30 to-black/70" />
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-4">
          <p className="text-white/80 text-sm uppercase tracking-widest mb-4 font-medium">
            Река Камчатка · Участок №1182 · 365 га
          </p>
          <h1 className="text-white font-bold mb-6 text-4xl md:text-6xl leading-tight" style={{ fontFamily: 'var(--font-playfair)' }}>
            Настоящая<br />камчатская рыбалка
          </h1>
          <p className="text-white/80 text-lg md:text-xl max-w-xl mb-8">
            Лицензионный участок, опытные гиды, комфортная база. Зимняя и летняя рыбалка круглый год.
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <button onClick={() => setShowModal(true)} className="px-8 py-3.5 rounded-lg font-semibold text-white text-base transition-all duration-200 hover:opacity-90" style={{ background: 'var(--accent)' }}>
              Рассчитать стоимость
            </button>
            <a href="tel:+79147822222" className="px-8 py-3.5 rounded-lg font-semibold text-white text-base border border-white/40 hover:bg-white/10 transition-all duration-200 flex items-center justify-center gap-2">
              <Phone className="w-4 h-4" />
              Позвонить
            </a>
          </div>
        </div>
      </section>

      {/* ── Features ───────────────────────────────────────────── */}
      <section className="py-16 px-4 max-w-6xl mx-auto">
        <h2 className="ds-h2 text-center mb-2">Почему «Камчатская рыбалка»</h2>
        <p className="text-center text-[var(--text-secondary)] mb-10">Лидеры в организации рыболовных туров на Камчатке с 2023 года</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {FEATURES.map((f, i) => (
            <div key={i} className="ds-card p-6">
              <f.icon className="w-7 h-7 text-[var(--accent)] mb-3" />
              <h3 className="font-semibold text-[var(--text-primary)] mb-1.5">{f.title}</h3>
              <p className="text-sm text-[var(--text-secondary)] leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Tours ──────────────────────────────────────────────── */}
      <section className="py-16 px-4 bg-[var(--bg-card)]">
        <div className="max-w-6xl mx-auto">
          <h2 className="ds-h2 text-center mb-2">Все туры</h2>
          <p className="text-center text-[var(--text-secondary)] mb-10">Минимальная группа — 5 человек</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {TOURS.map((tour, i) => (
              <div key={i} className="bg-[var(--bg-primary)] border border-[var(--border)] rounded-xl p-6 flex flex-col">
                <div className="text-3xl mb-3">{tour.icon}</div>
                <h3 className="text-xl font-bold mb-2 text-[var(--text-primary)]" style={{ fontFamily: 'var(--font-playfair)' }}>{tour.title}</h3>
                <p className="text-sm text-[var(--text-secondary)] mb-4 flex-1">{tour.desc}</p>
                <div className="flex gap-2 mb-4">
                  <span className="px-3 py-1 rounded-full text-xs font-medium bg-[var(--bg-hover)] text-[var(--text-primary)] border border-[var(--border)]">
                    ❄️ {tour.winter.price}
                  </span>
                  <span className="px-3 py-1 rounded-full text-xs font-medium bg-[var(--bg-hover)] text-[var(--text-primary)] border border-[var(--border)]">
                    ☀️ {tour.summer.price}
                  </span>
                </div>
                <ul className="space-y-1.5 mb-5">
                  {tour.includes.map((item, j) => (
                    <li key={j} className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                      <span className="w-4 h-4 rounded-full bg-[var(--success)]/20 text-[var(--success)] text-xs flex items-center justify-center font-bold flex-shrink-0">✓</span>
                      {item}
                    </li>
                  ))}
                </ul>
                <button onClick={() => setShowModal(true)} className="ds-btn ds-btn-primary w-full text-sm">
                  Оставить заявку
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Season calendar ────────────────────────────────────── */}
      <section className="py-16 px-4 max-w-6xl mx-auto">
        <h2 className="ds-h2 text-center mb-2">Что ловить и когда</h2>
        <p className="text-center text-[var(--text-secondary)] mb-10">Сезонный календарь рыболова</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {SEASON.map((s, i) => (
            <div key={i} className="ds-card p-5 flex gap-4 items-start">
              <div className="w-1 rounded-full self-stretch flex-shrink-0" style={{ background: s.color }} />
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-medium px-2 py-0.5 rounded-full border border-[var(--border)] text-[var(--text-muted)]">{s.season}</span>
                  <span className="font-semibold text-[var(--text-primary)]">{s.months}</span>
                </div>
                <p className="text-[var(--text-secondary)] text-sm">{s.fish}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Gallery ────────────────────────────────────────────── */}
      <section className="py-16 px-4 bg-[var(--bg-card)]">
        <div className="max-w-6xl mx-auto">
          <h2 className="ds-h2 text-center mb-2">Галерея</h2>
          <p className="text-center text-[var(--text-secondary)] mb-8">Живые моменты наших туров</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
            {GALLERY.map((photo, i) => (
              <div key={i} className="relative aspect-square overflow-hidden rounded-lg bg-[var(--bg-hover)]">
                <Image
                  src={`/images/fishingkam/${photo}`}
                  alt={`Рыбалка на Камчатке ${i + 1}`}
                  fill
                  className="object-cover hover:scale-105 transition-transform duration-300"
                />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Accommodation ──────────────────────────────────────── */}
      <section className="py-16 px-4 max-w-6xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
          <div>
            <h2 className="ds-h2 mb-4">Комфортное размещение</h2>
            <p className="text-[var(--text-secondary)] mb-6 leading-relaxed">
              На базе — двухэтажный корпус площадью 400 м² со всеми удобствами. Уютные номера, горячая вода, кухня с настоящей камчатской кухней.
            </p>
            <div className="space-y-3">
              {[
                '1 семейный 4-местный номер (2 спальных + 2 одиночных кровати)',
                '1 номер с двуспальной кроватью',
                '4 двухместных номера',
                'Кухня и столовая на 1-м этаже',
                'Раздельный туалет и душевая',
              ].map((item, i) => (
                <div key={i} className="flex items-start gap-2 text-sm text-[var(--text-secondary)]">
                  <span className="w-5 h-5 rounded-full bg-[var(--accent)]/15 text-[var(--accent)] text-xs flex items-center justify-center font-bold flex-shrink-0 mt-0.5">✓</span>
                  {item}
                </div>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {['2025-01-27_142510_1.jpg', '2025-01-09_114531_1.jpg', '2025-01-09_114821_1.jpg', '2025-02-10_151450.jpg'].map((photo, i) => (
              <div key={i} className="relative aspect-square overflow-hidden rounded-lg">
                <Image src={`/images/fishingkam/${photo}`} alt="База" fill className="object-cover" />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Avito ──────────────────────────────────────────────── */}
      <section className="py-12 px-4 max-w-6xl mx-auto">
        <div className="ds-card p-6 flex flex-col sm:flex-row items-center gap-5">
          <div className="w-12 h-12 flex-shrink-0 rounded-xl bg-[#00AAFF]/10 flex items-center justify-center">
            <span className="text-[#00AAFF] font-black text-lg">А</span>
          </div>
          <div className="flex-1 text-center sm:text-left">
            <p className="font-semibold text-[var(--text-primary)] mb-1">Мы на Авито</p>
            <p className="text-sm text-[var(--text-secondary)]">Проверенные объявления с отзывами на официальной площадке</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 flex-shrink-0">
            <a
              href="https://www.avito.ru/elizovo/ohota_i_rybalka/rybalka_na_reke_kamchatka_ot_professionalov_7631461509"
              target="_blank"
              rel="noopener noreferrer"
              className="ds-btn ds-btn-secondary text-sm px-4 py-2"
            >
              Охота и рыбалка
            </a>
            <a
              href="https://www.avito.ru/elizovo/predlozheniya_uslug/rybalka_na_reke_kamchatka_ot_professionalov_7631333356"
              target="_blank"
              rel="noopener noreferrer"
              className="ds-btn ds-btn-secondary text-sm px-4 py-2"
            >
              Услуги
            </a>
          </div>
        </div>
      </section>

      {/* ── FAQ ────────────────────────────────────────────────── */}
      <section className="py-16 px-4 bg-[var(--bg-card)]">
        <div className="max-w-3xl mx-auto">
          <h2 className="ds-h2 text-center mb-2">Часто спрашивают</h2>
          <p className="text-center text-[var(--text-secondary)] mb-8">Отвечаем на самые популярные вопросы</p>
          <div className="space-y-2">
            {FAQ.map((item, i) => (
              <div key={i} className="ds-card overflow-hidden">
                <button
                  className="w-full text-left px-5 py-4 flex items-center justify-between gap-3 hover:bg-[var(--bg-hover)] transition-colors"
                  onClick={() => setFaqOpen(faqOpen === i ? null : i)}
                >
                  <span className="font-medium text-[var(--text-primary)]">{item.q}</span>
                  <ChevronDown className={`w-4 h-4 flex-shrink-0 text-[var(--text-muted)] transition-transform ${faqOpen === i ? 'rotate-180' : ''}`} />
                </button>
                {faqOpen === i && (
                  <div className="px-5 pb-4 text-sm text-[var(--text-secondary)] leading-relaxed border-t border-[var(--border)]">
                    {item.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ────────────────────────────────────────────────── */}
      <section className="py-20 px-4 text-center" style={{ background: 'var(--accent)' }}>
        <h2 className="text-white text-3xl md:text-4xl font-bold mb-3" style={{ fontFamily: 'var(--font-playfair)' }}>
          Готовы к настоящей рыбалке?
        </h2>
        <p className="text-white/80 mb-8 text-lg">Оставьте заявку — рассчитаем стоимость и ответим на все вопросы</p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button onClick={() => setShowModal(true)} className="px-8 py-3.5 bg-white text-[var(--accent)] font-semibold rounded-lg hover:bg-white/90 transition-colors">
            Оставить заявку
          </button>
          <a href="tel:+79147822222" className="px-8 py-3.5 border border-white/40 text-white font-semibold rounded-lg hover:bg-white/10 transition-colors flex items-center justify-center gap-2">
            <Phone className="w-4 h-4" />
            +7 (914) 782-22-22
          </a>
        </div>
      </section>

      {/* ── Contacts ───────────────────────────────────────────── */}
      <section className="py-16 px-4 max-w-6xl mx-auto">
        <h2 className="ds-h2 text-center mb-10">Контакты</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
          <div className="ds-card p-6">
            <Phone className="w-6 h-6 text-[var(--accent)] mx-auto mb-3" />
            <p className="font-semibold mb-1">Анатолий</p>
            <a href="tel:+79147822222" className="text-[var(--ocean)] hover:underline">+7 (914) 782-22-22</a>
            <p className="text-xs text-[var(--text-muted)] mt-1">Пн–Пт, 00:00–10:00 по МСК</p>
          </div>
          <div className="ds-card p-6">
            <Phone className="w-6 h-6 text-[var(--accent)] mx-auto mb-3" />
            <p className="font-semibold mb-1">Александр</p>
            <a href="tel:+79992997007" className="text-[var(--ocean)] hover:underline">+7 (999) 299-70-07</a>
            <p className="text-xs text-[var(--text-muted)] mt-1">Пн–Пт, 00:00–10:00 по МСК</p>
          </div>
          <div className="ds-card p-6">
            <MapPin className="w-6 h-6 text-[var(--accent)] mx-auto mb-3" />
            <p className="font-semibold mb-1">Офис</p>
            <p className="text-sm text-[var(--text-secondary)]">г. Елизово, ул. Звёздная, 1А, каб. 14</p>
            <a href="tel:+79247808011" className="text-[var(--ocean)] text-sm hover:underline">8 (924) 780-80-11</a>
          </div>
        </div>
      </section>

      {/* ── Footer ─────────────────────────────────────────────── */}
      <footer className="bg-[var(--bg-card)] border-t border-[var(--border)] py-8 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Fish className="w-4 h-4 text-[var(--accent)]" />
                <span className="font-semibold" style={{ fontFamily: 'var(--font-playfair)' }}>Камчатская рыбалка</span>
              </div>
              <p className="text-xs text-[var(--text-muted)]">© 2025 ООО «Камчатская рыбалка»</p>
            </div>
            <div className="text-xs text-[var(--text-muted)] space-y-1">
              <p>ИНН 4100050147 · ОГРН 1244100000869</p>
              <p>684005, Камчатский край, г. Елизово, ул. Звёздная, д. 1«А», каб. 14</p>
              <p>Рыболовный участок №1182 (р. Камчатка) · Договор №02/2023-л от 22.05.2023</p>
            </div>
            <Link href="https://tourhab.ru" className="text-xs text-[var(--text-muted)] hover:text-[var(--ocean)] transition-colors">
              Площадка TourHab
            </Link>
          </div>
        </div>
      </footer>

      {/* ── Lead modal ─────────────────────────────────────────── */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60" onClick={() => setShowModal(false)}>
          <div className="bg-[var(--bg-card)] rounded-xl w-full max-w-md p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
            {sent ? (
              <div className="text-center py-6">
                <div className="w-12 h-12 rounded-full bg-[var(--success)]/20 flex items-center justify-center mx-auto mb-3">
                  <span className="text-[var(--success)] text-xl">✓</span>
                </div>
                <h3 className="font-bold text-lg mb-1">Заявка принята!</h3>
                <p className="text-[var(--text-secondary)] text-sm">Свяжемся с вами в ближайшее время.</p>
                <button onClick={() => { setShowModal(false); setSent(false); setName(''); setPhone(''); setConsent(false); }} className="mt-4 ds-btn ds-btn-secondary text-sm">
                  Закрыть
                </button>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between mb-5">
                  <h3 className="font-bold text-lg" style={{ fontFamily: 'var(--font-playfair)' }}>Оставить заявку</h3>
                  <button onClick={() => setShowModal(false)} className="text-[var(--text-muted)] hover:text-[var(--text-primary)] text-xl leading-none">×</button>
                </div>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="ds-label">Имя</label>
                    <input type="text" value={name} onChange={e => setName(e.target.value)} required placeholder="Ваше имя" className="ds-input w-full mt-1" />
                  </div>
                  <div>
                    <label className="ds-label">Телефон</label>
                    <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} required placeholder="+7 (___) ___-____" className="ds-input w-full mt-1" />
                  </div>
                  <label className="flex items-start gap-2 cursor-pointer">
                    <input type="checkbox" checked={consent} onChange={e => setConsent(e.target.checked)} className="mt-0.5 accent-[var(--accent)]" required />
                    <span className="text-xs text-[var(--text-muted)]">
                      Подтверждаю согласие на обработку персональных данных в соответствии с ФЗ «О персональных данных»
                    </span>
                  </label>
                  <button type="submit" disabled={!name || !phone || !consent} className="ds-btn ds-btn-primary w-full disabled:opacity-50">
                    Отправить заявку
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
