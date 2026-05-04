'use client';

import { Leaf, ShieldCheck, ExternalLink, Info, Calendar, AlertTriangle } from 'lucide-react';
import type { PlaceEco as PlaceEcoData } from './types';

interface Props {
  eco: PlaceEcoData;
  placeName: string;
  locationType?: string | null;
}

const ZONE_LABELS: Record<string, string> = {
  UNESCO:          'Объект Всемирного наследия ЮНЕСКО',
  federal_reserve: 'Государственный заповедник',
  regional_reserve:'Региональный заповедник',
  natural_park:    'Природный парк',
  zakaznik:        'Государственный заказник',
};

const ZONE_DESCRIPTIONS: Record<string, string> = {
  UNESCO:
    'Вулканы Камчатки — объект Всемирного природного наследия ЮНЕСКО с 1996 года. ' +
    'Охраняемая экосистема нетронутой дикой природы с уникальными геотермальными процессами.',
  federal_reserve:
    'Кроноцкий государственный биосферный заповедник — один из старейших в России. ' +
    'Охраняет нетронутые экосистемы полуострова: гейзеры, вулканы, нерестовые реки.',
  regional_reserve:
    'Особо охраняемая природная территория регионального значения.',
  natural_park:
    'Природный парк Камчатки — охраняемая территория с регулируемым экотуризмом. ' +
    'Здесь совмещаются охрана природы и ответственный туризм.',
  zakaznik:
    'Государственный природный заказник. Частичная охрана экосистем: нерест лосося, ' +
    'зимовки медведей, места гнездования редких птиц.',
};

const ZONE_RULES: Record<string, string[]> = {
  UNESCO: [
    'Только организованные группы с аккредитованным гидом',
    'Строго по обозначенным маршрутам — шаг в сторону запрещён',
    'Сбор любых природных объектов (минералы, растения, грибы) запрещён',
    'Не приближаться к термальным выходам — температура до 900°C',
    'Не кормить медведей и лисиц — нарушает дикое поведение животных',
    'Коммерческая съёмка требует разрешения дирекции заповедника',
    'Все отходы уносить с собой',
  ],
  federal_reserve: [
    'Посещение только в составе организованной группы с лицензированным гидом',
    'Самостоятельные маршруты вне разрешённых троп запрещены',
    'Не беспокоить диких животных — медведи свободно перемещаются по территории',
    'Разведение костров только в специально оборудованных местах',
    'Сбор растений, грибов, ягод и минералов запрещён',
    'Дроны требуют отдельного разрешения администрации заповедника',
    'Принцип «не оставляй следов» — все отходы с собой',
  ],
  natural_park: [
    'Въезд автотранспорта — только на специальные стоянки',
    'Разведение костров — только в отведённых местах для отдыха',
    'Сбор ягод и грибов разрешён в личных некоммерческих объёмах',
    'Промысловая рыбалка и охота требуют отдельного разрешения',
    'Домашние животные — только на поводке',
    'Купание в термальных источниках — только в разрешённых зонах',
  ],
  zakaznik: [
    'В период нереста (июль–октябрь) — посещение только с инспектором или гидом',
    'Не приближаться к медведям ближе 100 м — в сезон рыбалки они особенно активны',
    'Рыбалка запрещена без специального государственного разрешения',
    'Разведение костров на берегах рек строго запрещено — пожароопасная зона',
    'Все отходы обязательно уносить с собой',
  ],
};

interface SeasonEvent {
  months: number[];
  label: string;
  type: 'warning' | 'info' | 'closed';
}

const ECO_SEASONS_BY_ZONE: Record<string, SeasonEvent[]> = {
  federal_reserve: [
    { months: [5, 6],       label: 'Гнездовой период птиц — маршруты в горах ограничены', type: 'warning' },
    { months: [7, 8, 9, 10],label: 'Нерест лосося — медведи активны у рек', type: 'warning' },
    { months: [11, 12, 1, 2, 3, 4], label: 'Зимний период — доступ ограничен, часть маршрутов закрыта', type: 'closed' },
  ],
  UNESCO: [
    { months: [5, 6],       label: 'Гнездовой период — посещение строго по разрешению', type: 'warning' },
    { months: [7, 8, 9],    label: 'Пик туристического сезона — бронируйте заранее', type: 'info' },
    { months: [10, 11, 12, 1, 2, 3, 4], label: 'Межсезонье — ряд маршрутов закрыт', type: 'closed' },
  ],
  zakaznik: [
    { months: [7, 8, 9, 10], label: 'Нерест — вход только с инспектором, медведи активны', type: 'warning' },
    { months: [5, 6],        label: 'Гнездование птиц — береговая зона ограничена', type: 'warning' },
  ],
  natural_park: [
    { months: [5, 6],       label: 'Гнездовой период птиц', type: 'info' },
    { months: [7, 8, 9],    label: 'Лучший сезон для посещения', type: 'info' },
    { months: [11, 12, 1, 2, 3], label: 'Зимнее закрытие части маршрутов', type: 'closed' },
  ],
};

const MONTH_SHORT = ['Я', 'Ф', 'М', 'А', 'М', 'И', 'И', 'А', 'С', 'О', 'Н', 'Д'];
const MONTH_FULL  = ['Январь','Февраль','Март','Апрель','Май','Июнь','Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь'];

function getMonthColor(month: number, events: SeasonEvent[]): string {
  for (const ev of events) {
    if (ev.months.includes(month)) {
      if (ev.type === 'closed')  return 'bg-[var(--danger)]/20 text-[var(--danger)]';
      if (ev.type === 'warning') return 'bg-[var(--warning)]/20 text-[var(--warning)]';
      if (ev.type === 'info')    return 'bg-[var(--success)]/20 text-[var(--success)]';
    }
  }
  return 'bg-[var(--bg-hover)] text-[var(--text-muted)]';
}

function parseRules(rules: string): string[] {
  return rules
    .split(/\.\s+|\n/)
    .map(s => s.trim().replace(/^[-•·]\s*/, ''))
    .filter(s => s.length > 8);
}

export default function PlaceEco({ eco, placeName, locationType }: Props) {
  if (!eco.zone || eco.zone === 'none') return null;

  const label    = ZONE_LABELS[eco.zone] ?? eco.zone;
  const desc     = ZONE_DESCRIPTIONS[eco.zone];
  const seasons  = ECO_SEASONS_BY_ZONE[eco.zone] ?? [];
  const isStrict = eco.zone === 'UNESCO' || eco.zone === 'federal_reserve';

  // Use migration-provided rules if they exist, otherwise fall back to static
  const ruleList: string[] = eco.rules
    ? parseRules(eco.rules)
    : (ZONE_RULES[eco.zone] ?? []);

  return (
    <section className="max-w-3xl mx-auto px-4">
      <div className="ds-card overflow-hidden border border-[var(--border)]">

        {/* ── Header ─────────────────────────────────────────────────────────── */}
        <div className={`px-5 py-4 flex items-center gap-3 ${isStrict ? 'bg-[var(--success)]/8' : 'bg-[var(--ocean)]/6'}`}>
          <div className={`p-2 rounded-lg ${isStrict ? 'bg-[var(--success)]/18 text-[var(--success)]' : 'bg-[var(--ocean)]/14 text-[var(--ocean)]'}`}>
            <Leaf size={18} strokeWidth={2} />
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-[var(--text-muted)]">Экология и охрана природы</p>
            <p className="font-semibold text-[var(--text-primary)] leading-tight">{label}</p>
          </div>
          {eco.permitRequired && (
            <span className="ml-auto text-xs font-semibold px-2.5 py-1 rounded-full bg-[var(--warning)]/15 text-[var(--warning)] shrink-0">
              Нужен пропуск
            </span>
          )}
        </div>

        <div className="px-5 py-4 space-y-5">

          {/* ── Zone description ───────────────────────────────────────────────── */}
          {desc && (
            <p className="text-sm text-[var(--text-secondary)] leading-relaxed">{desc}</p>
          )}

          {/* ── Seasonal calendar ──────────────────────────────────────────────── */}
          {seasons.length > 0 && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-3 flex items-center gap-1.5">
                <Calendar size={12} />
                Экологический календарь
              </p>

              {/* Month grid */}
              <div className="grid grid-cols-12 gap-1 mb-3">
                {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                  <div
                    key={m}
                    className={`aspect-square rounded flex items-center justify-center text-[10px] font-bold ${getMonthColor(m, seasons)}`}
                    title={`${MONTH_FULL[m - 1]}`}
                  >
                    {MONTH_SHORT[m - 1]}
                  </div>
                ))}
              </div>

              {/* Legend */}
              <div className="space-y-1.5">
                {seasons.map((ev, i) => (
                  <div key={i} className="flex items-start gap-2 text-xs text-[var(--text-secondary)]">
                    <AlertTriangle
                      size={12}
                      className={`shrink-0 mt-0.5 ${
                        ev.type === 'closed'  ? 'text-[var(--danger)]' :
                        ev.type === 'warning' ? 'text-[var(--warning)]' :
                                                'text-[var(--success)]'
                      }`}
                    />
                    <span>
                      <strong className="text-[var(--text-primary)]">
                        {ev.months.map(m => MONTH_FULL[m - 1].slice(0, 3)).join(', ')}:
                      </strong>{' '}
                      {ev.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Visitor rules ──────────────────────────────────────────────────── */}
          {ruleList.length > 0 && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-2.5">Правила посещения</p>
              <ul className="space-y-1.5">
                {ruleList.map((rule, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-[var(--text-secondary)]">
                    <ShieldCheck size={14} className="shrink-0 mt-0.5 text-[var(--success)]" />
                    <span>{rule}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* ── Permit link ────────────────────────────────────────────────────── */}
          {eco.permitRequired && eco.permitUrl && (
            <a
              href={eco.permitUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm font-medium text-[var(--ocean)] hover:underline"
            >
              <ExternalLink size={14} />
              Оформить пропуск онлайн
            </a>
          )}

          {eco.permitRequired && !eco.permitUrl && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-[var(--warning)]/8 text-sm text-[var(--text-secondary)]">
              <Info size={14} className="shrink-0 mt-0.5 text-[var(--warning)]" />
              <span>Требуется разрешение на посещение. Уточните у гида или местной администрации.</span>
            </div>
          )}

        </div>
      </div>
    </section>
  );
}
