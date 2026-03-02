import { Metadata } from 'next';
import { AlertTriangle, Phone, MapPin, Shield, Mountain, Thermometer, Compass } from 'lucide-react';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Безопасность | Kamchatour',
  description: 'Безопасность на Камчатке: SOS, МЧС 112, экстренные контакты, чеклисты для туристов.',
  alternates: { canonical: 'https://kamchatourhub.ru/safety' },
};

export default function SafetyPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-8 bg-[#0D1117] min-h-screen">
      <div className="flex items-center gap-3 mb-8">
        <Shield className="w-8 h-8 text-[var(--danger)]" />
        <h1 className="font-serif text-3xl font-bold text-[#F0F6FC]">Безопасность</h1>
      </div>

      {/* SOS -- glavnyj blok, pervyj i samyj bol'shoj */}
      <div className="border-2 border-[var(--danger)] rounded-2xl p-8 mb-8 bg-[var(--danger)]/5">
        <div className="flex items-center gap-3 mb-4">
          <AlertTriangle className="w-12 h-12 text-[var(--danger)]" />
          <div>
            <h2 className="font-serif text-2xl font-bold text-[#F0F6FC]">При угрозе жизни</h2>
            <p className="text-[#8B949E]">Немедленно звоните в МЧС</p>
          </div>
        </div>
        <a
          href="tel:112"
          className="w-full flex items-center justify-center gap-3 h-16 text-2xl font-bold bg-[var(--danger)] text-white rounded-2xl shadow-lg hover:bg-red-600 transition-all duration-200 animate-pulse"
        >
          <Phone className="w-7 h-7" />
          112 — МЧС
        </a>
      </div>

      {/* Ekstrennye kontakty -- 4 kartochki */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
        {[
          { number: '112', label: 'МЧС', color: 'text-[var(--danger)]' },
          { number: '103', label: 'Скорая', color: 'text-[var(--ocean,#00A8CC)]' },
          { number: '101', label: 'Пожарная', color: 'text-[var(--accent)]' },
          { number: '+7 914-782-22-22', label: 'Kamchatour', color: 'text-[var(--accent)]' },
        ].map(c => (
          <a
            key={c.number}
            href={`tel:${c.number.replace(/[^+\d]/g, '')}`}
            className="bg-[#21262D] border border-[rgba(255,255,255,0.08)] rounded-xl p-4 text-center hover:border-[rgba(255,255,255,0.16)] transition-colors min-h-[44px]"
          >
            <p className={`text-xl font-bold ${c.color}`}>{c.number}</p>
            <p className="text-xs text-[#8B949E] mt-1">{c.label}</p>
          </a>
        ))}
      </div>

      {/* Pravila bezopasnosti */}
      <div className="bg-[#21262D] border border-[rgba(255,255,255,0.08)] rounded-2xl p-6 mb-6">
        <h2 className="font-serif text-xl font-bold text-[#F0F6FC] mb-4 flex items-center gap-2">
          <Compass className="w-5 h-5 text-[var(--accent)]" />
          Правила безопасности на Камчатке
        </h2>
        <ul className="space-y-3">
          {[
            { icon: MapPin, text: 'Всегда сообщайте маршрут и сроки похода оператору или МЧС' },
            { icon: AlertTriangle, text: 'Не приближайтесь к медведям ближе 100 метров' },
            { icon: Thermometer, text: 'Следите за погодой — она меняется быстро' },
            { icon: Shield, text: 'Берите запас еды, воды и тёплой одежды' },
            { icon: Mountain, text: 'Не ходите на вулканы без сертифицированного гида' },
            { icon: Phone, text: 'Держите телефон заряженным, имейте powerbank' },
          ].map(rule => {
            const Icon = rule.icon;
            return (
              <li key={rule.text} className="flex items-start gap-3">
                <Icon className="w-5 h-5 text-[var(--accent)] mt-0.5 shrink-0" />
                <span className="text-[#8B949E]">{rule.text}</span>
              </li>
            );
          })}
        </ul>
      </div>

      <Link
        href="/hub/safety"
        className="inline-flex items-center gap-2 min-h-[44px] px-6 py-3 rounded-xl border border-[var(--accent)] text-[var(--accent)] font-medium hover:bg-[var(--accent)] hover:text-white transition-colors"
      >
        <Shield className="w-4 h-4" />
        Подробнее о безопасности
      </Link>
    </div>
  );
}
