'use client';

import { Shield, Check, AlertCircle, ExternalLink } from 'lucide-react';
import { recommendInsurance, type InsurancePlan } from '@/lib/services/insurance.service';

interface Props {
  activityTypes: string[];
  routeTitle?: string;
}

/**
 * InsuranceBlock — рекомендация страховки на основе типон активности маршрута
 * Интегрирует Cherehapa (tourhab.ru affiliate)
 */
export default function InsuranceBlock({ activityTypes, routeTitle }: Props) {
  const rec = recommendInsurance(activityTypes);

  if (!rec.plan) return null;

  return (
    <section className="mt-10 pt-8 border-t border-[var(--border)]">
      <div className="flex items-center gap-2 mb-4">
        <Shield className="w-5 h-5" style={{ color: 'var(--warning)' }} />
        <p className="text-sm font-semibold text-[var(--text-primary)]">Страховка для путешествия</p>
      </div>

      {/* Рекомендуемый план */}
      <div
        className="rounded-lg border-2 p-4 mb-4 transition-all hover:shadow-sm"
        style={{
          background: 'var(--bg-card)',
          borderColor: 'var(--warning)',
        }}
      >
        <div className="flex items-start justify-between mb-3">
          <div>
            <h3 className="font-semibold text-[var(--text-primary)]">{rec.plan.name}</h3>
            <p className="text-sm text-[var(--text-muted)] mt-1">{rec.plan.description}</p>
          </div>
          <div className="text-right flex-shrink-0">
            <p className="text-lg font-bold text-[var(--accent)]">{rec.plan.price} ₽</p>
            <p className="text-xs text-[var(--text-muted)]">на путешествие</p>
          </div>
        </div>

        {/* Покрытие */}
        <div className="mb-4">
          <p className="text-xs uppercase tracking-widest text-[var(--text-muted)] mb-2">Включено</p>
          <div className="grid grid-cols-2 gap-2">
            {rec.plan.coverage.map(c => (
              <div key={c} className="flex items-center gap-1.5 text-sm">
                <Check className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--success)' }} />
                <span className="text-[var(--text-secondary)]">{formatCoverage(c)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Рассуждение */}
        <div className="flex items-start gap-2 p-2 rounded mb-3" style={{ background: 'var(--bg-primary)' }}>
          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: 'var(--warning)' }} />
          <p className="text-xs text-[var(--text-secondary)]">{rec.reasoning}</p>
        </div>

        {/* CTA */}
        <a
          href={rec.plan.link}
          target="_blank"
          rel="noopener noreferrer sponsored"
          className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-semibold transition-all hover:shadow-sm"
          style={{
            background: 'var(--warning)',
            color: 'white',
          }}
        >
          Выбрать полис
          <ExternalLink className="w-4 h-4" />
        </a>
      </div>

      {/* Альтернативные планы */}
      {rec.alternatives.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs uppercase tracking-widest text-[var(--text-muted)]">Также доступны</p>
          {rec.alternatives.map(plan => (
            <a
              key={plan.id}
              href={plan.link}
              target="_blank"
              rel="noopener noreferrer sponsored"
              className="group flex items-center justify-between p-3 rounded-lg border transition-all hover:shadow-sm hover:-translate-y-0.5"
              style={{
                background: 'var(--bg-card)',
                borderColor: 'var(--border)',
              }}
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-[var(--text-primary)]">{plan.name}</p>
                <p className="text-xs text-[var(--text-muted)] truncate">{plan.description}</p>
              </div>
              <div className="text-right flex-shrink-0 ml-3">
                <p className="text-sm font-bold text-[var(--accent)]">{plan.price} ₽</p>
              </div>
            </a>
          ))}
        </div>
      )}
    </section>
  );
}

function formatCoverage(key: string): string {
  const map: Record<string, string> = {
    medical: 'Медицинское',
    evacuation_domestic: 'Эвакуация в РФ',
    evacuation_international: 'Эвакуация за рубеж',
    equipment_loss: 'Потеря снаряжения',
    activity_injury: 'Повреждение при активности',
    extreme_sports: 'Экстремальные виды спорта',
  };
  return map[key] || key;
}
