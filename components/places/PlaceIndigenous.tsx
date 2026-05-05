import { Users, Star, Sprout, BookOpen } from 'lucide-react';
import type { PlaceIndigenous as IndigenousData } from './types';

interface Props {
  indigenous: IndigenousData;
}

const PEOPLES_LABELS: Record<string, string> = {
  itelmen:  'Ительмены',
  koryak:   'Коряки',
  even:     'Эвены',
  chukchi:  'Чукчи',
  ainu:     'Айны',
  aleut:    'Алеуты',
};

export default function PlaceIndigenous({ indigenous }: Props) {
  const peopleLabels = indigenous.peoples
    .map(p => PEOPLES_LABELS[p] ?? p)
    .join(', ');

  return (
    <section className="max-w-3xl mx-auto px-4 mt-6">
      <div className="ds-card overflow-hidden border border-[var(--ocean)]/25">

        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-4 bg-[var(--ocean)]/6 border-b border-[var(--ocean)]/15">
          <div className="p-2 rounded-lg bg-[var(--ocean)]/12 text-[var(--ocean)]">
            <Users className="w-4 h-4" />
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-[var(--text-muted)]">
              Коренные народы
            </p>
            <p className="text-sm font-semibold text-[var(--text-primary)]">
              {peopleLabels || 'Традиционная территория'}
            </p>
          </div>
          {indigenous.sacred && (
            <span className="ml-auto inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-[var(--warning)]/12 text-[var(--warning)] shrink-0">
              <Star className="w-3 h-3" />
              Священное место
            </span>
          )}
        </div>

        <div className="px-5 py-4 space-y-4">

          {/* Local name */}
          {indigenous.localName && (
            <div>
              <p className="text-[11px] font-medium uppercase tracking-wider text-[var(--text-muted)] mb-1">
                Традиционное название
              </p>
              <p className="text-base font-semibold text-[var(--text-primary)]"
                style={{ fontFamily: 'var(--font-playfair)' }}>
                {indigenous.localName}
              </p>
            </div>
          )}

          {/* Traditional use */}
          {indigenous.traditionalUse && (
            <div className="flex items-start gap-3">
              <Sprout className="w-4 h-4 text-[var(--success)] shrink-0 mt-0.5" />
              <div>
                <p className="text-[11px] font-medium uppercase tracking-wider text-[var(--text-muted)] mb-1">
                  Традиционное природопользование
                </p>
                <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                  {indigenous.traditionalUse}
                </p>
              </div>
            </div>
          )}

          {/* Sacred note */}
          {indigenous.sacred && !indigenous.respectNotes && (
            <div className="flex items-start gap-3 p-3 rounded-xl bg-[var(--warning)]/8 border border-[var(--warning)]/20">
              <Star className="w-4 h-4 text-[var(--warning)] shrink-0 mt-0.5" />
              <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                Это место имеет культурное и духовное значение для коренных народов Камчатки.
                Пожалуйста, ведите себя тихо и уважительно.
              </p>
            </div>
          )}

          {/* Specific respect notes */}
          {indigenous.respectNotes && (
            <div className="flex items-start gap-3 p-3 rounded-xl bg-[var(--warning)]/8 border border-[var(--warning)]/20">
              <BookOpen className="w-4 h-4 text-[var(--warning)] shrink-0 mt-0.5" />
              <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                {indigenous.respectNotes}
              </p>
            </div>
          )}

          {/* Footer note */}
          <p className="text-[11px] text-[var(--text-muted)] border-t border-[var(--border)] pt-3 leading-relaxed">
            Камчатка — исконная земля коренных малочисленных народов Севера. Их культура и
            традиционный уклад неотделимы от природы полуострова.
          </p>

        </div>
      </div>
    </section>
  );
}
