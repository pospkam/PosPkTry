'use client';

import { useState } from 'react';
import { Leaf, ChevronDown, Footprints, Trash2, Eye, Flame, Dog } from 'lucide-react';

interface LNTRule {
  icon: React.ReactNode;
  title: string;
  detail: string;
}

const RULES: LNTRule[] = [
  {
    icon: <Trash2 className="w-4 h-4" />,
    title: 'Уходи так же чисто, как пришёл',
    detail: 'Забирай весь мусор с собой, включая упаковку от еды, окурки и органические отходы. Даже кожура апельсина разлагается годами в камчатском климате.',
  },
  {
    icon: <Footprints className="w-4 h-4" />,
    title: 'Оставайся на тропе',
    detail: 'Шаг в сторону от маркированной тропы разрушает почвенный покров и тундровую растительность, которая восстанавливается десятилетиями. Особенно критично в моховых и болотных зонах.',
  },
  {
    icon: <Eye className="w-4 h-4" />,
    title: 'Наблюдай, не вмешивайся',
    detail: 'Не подходи к медведям ближе 100 м, не фотографируй животных со вспышкой, не издавай громких звуков у гнездовий птиц. Дистанция — это уважение.',
  },
  {
    icon: <Dog className="w-4 h-4" />,
    title: 'Не корми диких животных',
    detail: 'Подкармливание лисиц и медведей делает их зависимыми от человека и опасными. Животное, которое потеряло страх — обречено.',
  },
  {
    icon: <Flame className="w-4 h-4" />,
    title: 'Костёр — только в разрешённых местах',
    detail: 'Разводи огонь только в специально отведённых стоянках. Используй горелку там, где костёр запрещён. Пожары на Камчатке уничтожают уникальные экосистемы.',
  },
];

interface Props {
  capacityPerDay?: number | null;
  ecoZone?: string | null;
}

export default function PlaceLNT({ capacityPerDay, ecoZone }: Props) {
  const [expanded, setExpanded] = useState(false);

  // Don't duplicate with PlaceEco for strict zones — eco block already has rules there
  if (ecoZone && (ecoZone === 'UNESCO' || ecoZone === 'federal_reserve')) return null;

  return (
    <section className="max-w-3xl mx-auto px-4 mt-6">
      <div className="ds-card overflow-hidden">

        <button
          onClick={() => setExpanded(v => !v)}
          className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-[var(--bg-hover)] transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-[var(--success)]/12 text-[var(--success)]">
              <Leaf className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-[var(--text-muted)]">
                Бережное посещение
              </p>
              <p className="text-sm font-semibold text-[var(--text-primary)]">
                Принципы Leave No Trace на Камчатке
              </p>
            </div>
          </div>
          <ChevronDown
            className={`w-4 h-4 text-[var(--text-muted)] transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}
          />
        </button>

        {expanded && (
          <div className="px-5 pb-5 space-y-4 border-t border-[var(--border)]">

            {capacityPerDay != null && (
              <div className="mt-4 flex items-center gap-2 text-xs text-[var(--text-secondary)] bg-[var(--success)]/6 px-3 py-2 rounded-lg border border-[var(--success)]/18">
                <Leaf className="w-3.5 h-3.5 text-[var(--success)] shrink-0" />
                <span>
                  Рекомендуемый размер группы — не более{' '}
                  <strong className="text-[var(--text-primary)]">{capacityPerDay} человек в сутки</strong>
                  {' '}для сохранения природного баланса.
                </span>
              </div>
            )}

            <ul className="space-y-3 mt-3">
              {RULES.map((r, i) => (
                <li key={i} className="flex items-start gap-3">
                  <span className="shrink-0 mt-0.5 text-[var(--success)] opacity-70">{r.icon}</span>
                  <div>
                    <p className="text-sm font-semibold text-[var(--text-primary)]">{r.title}</p>
                    <p className="text-xs text-[var(--text-muted)] mt-0.5 leading-relaxed">{r.detail}</p>
                  </div>
                </li>
              ))}
            </ul>

            <p className="text-[11px] text-[var(--text-muted)] border-t border-[var(--border)] pt-3">
              Камчатка — объект Всемирного природного наследия ЮНЕСКО. Её экосистема существует
              миллионы лет — наш визит должен оставлять след только в памяти.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
