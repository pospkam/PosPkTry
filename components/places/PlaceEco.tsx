'use client';

import { Leaf, ShieldCheck, ExternalLink, Info } from 'lucide-react';
import type { PlaceEco as PlaceEcoData } from './types';

interface Props {
  eco: PlaceEcoData;
  placeName: string;
}

const ZONE_LABELS: Record<string, string> = {
  UNESCO: 'Объект ЮНЕСКО',
  federal_reserve: 'Государственный заповедник',
  regional_reserve: 'Региональный заповедник',
  natural_park: 'Природный парк',
  zakaznik: 'Заказник',
  none: '',
};

const ZONE_DESCRIPTIONS: Record<string, string> = {
  UNESCO: 'Охраняется ЮНЕСКО как объект Всемирного природного наследия. Посещение возможно только в рамках установленных правил.',
  federal_reserve: 'Федеральная особо охраняемая природная территория. Экосистема имеет статус нетронутой дикой природы.',
  regional_reserve: 'Особо охраняемая природная территория регионального значения.',
  natural_park: 'Природный парк регионального значения с регулируемым туризмом.',
  zakaznik: 'Природный заказник — частичная охрана отдельных видов и экосистем.',
};

function parseRules(rules: string): string[] {
  return rules
    .split(/\.\s+|\n/)
    .map(s => s.trim().replace(/^[-•·]\s*/, ''))
    .filter(s => s.length > 8);
}

export default function PlaceEco({ eco, placeName }: Props) {
  if (!eco.zone || eco.zone === 'none') return null;

  const label = ZONE_LABELS[eco.zone] ?? eco.zone;
  const desc = ZONE_DESCRIPTIONS[eco.zone];
  const rules = eco.rules ? parseRules(eco.rules) : [];

  const isStrict = eco.zone === 'UNESCO' || eco.zone === 'federal_reserve';

  return (
    <section className="max-w-3xl mx-auto px-4">
      <div className="ds-card overflow-hidden border border-[var(--border)]">

        {/* Header */}
        <div className={`px-5 py-4 flex items-center gap-3 ${isStrict ? 'bg-[var(--success)]/10' : 'bg-[var(--ocean)]/8'}`}>
          <div className={`p-2 rounded-lg ${isStrict ? 'bg-[var(--success)]/20 text-[var(--success)]' : 'bg-[var(--ocean)]/15 text-[var(--ocean)]'}`}>
            <Leaf size={18} strokeWidth={2} />
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-[var(--text-muted)]">Экология и охрана природы</p>
            <p className="font-semibold text-[var(--text-primary)] leading-tight">{label}</p>
          </div>
          {eco.permitRequired && (
            <span className="ml-auto text-xs font-semibold px-2.5 py-1 rounded-full bg-[var(--warning)]/15 text-[var(--warning)]">
              Нужен пропуск
            </span>
          )}
        </div>

        <div className="px-5 py-4 space-y-4">

          {/* Zone description */}
          {desc && (
            <p className="text-sm text-[var(--text-secondary)] leading-relaxed">{desc}</p>
          )}

          {/* Rules */}
          {rules.length > 0 && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-2.5">Правила посещения</p>
              <ul className="space-y-1.5">
                {rules.map((rule, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-[var(--text-secondary)]">
                    <ShieldCheck size={14} className="shrink-0 mt-0.5 text-[var(--success)]" />
                    <span>{rule}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Permit link */}
          {eco.permitRequired && eco.permitUrl && (
            <a
              href={eco.permitUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-sm font-medium text-[var(--ocean)] hover:underline"
            >
              <ExternalLink size={14} />
              Оформить пропуск онлайн
            </a>
          )}

          {/* Permit info without URL */}
          {eco.permitRequired && !eco.permitUrl && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-[var(--warning)]/8 text-sm text-[var(--text-secondary)]">
              <Info size={14} className="shrink-0 mt-0.5 text-[var(--warning)]" />
              <span>Требуется разрешение на посещение. Уточните у местной администрации или вашего гида.</span>
            </div>
          )}

        </div>
      </div>
    </section>
  );
}
