'use client';

import React, { useState, useEffect } from 'react';
import {
  AlertTriangle, Mountain, Snowflake, Flame, PawPrint, Waves,
  Ship, Plane, Anchor, ChevronDown, ChevronUp, Shield, Phone,
  ThermometerSnowflake, Skull, CloudFog,
} from 'lucide-react';

interface HazardSignal {
  hazard: string;
  level: 'info' | 'warning' | 'danger' | 'critical';
  title: string;
  message: string;
  precautions: string[];
  incident_ref: string | null;
  icon: string;
}

interface WarningData {
  route_title: string;
  is_open: boolean;
  danger_level: string;
  alert_severity: number;
  alert_message: string | null;
  zone_risk: { risk_score: number; risk_level: string; recommended_action: string } | null;
  signals: HazardSignal[];
  emergency_contacts: Array<{ name: string; phone: string; type: string }>;
  disclaimer: string;
}

const ICON_MAP: Record<string, React.ElementType> = {
  Mountain,
  Snowflake,
  AlertTriangle,
  Flame,
  Skull,
  ThermometerSnowflake,
  PawPrint,
  Waves,
  Ship,
  CloudFog,
  Plane,
  Anchor,
};

const LEVEL_STYLES: Record<string, { bg: string; border: string; text: string; badge: string }> = {
  critical: {
    bg: 'bg-[var(--danger)]/10',
    border: 'border-[var(--danger)]/30',
    text: 'text-[var(--danger)]',
    badge: 'bg-[var(--danger)] text-white',
  },
  danger: {
    bg: 'bg-[var(--danger)]/8',
    border: 'border-[var(--danger)]/20',
    text: 'text-[var(--danger)]',
    badge: 'bg-[var(--danger)]/80 text-white',
  },
  warning: {
    bg: 'bg-[var(--warning)]/10',
    border: 'border-[var(--warning)]/25',
    text: 'text-[var(--warning)]',
    badge: 'bg-[var(--warning)] text-[var(--text-primary)]',
  },
  info: {
    bg: 'bg-[var(--ocean)]/8',
    border: 'border-[var(--ocean)]/20',
    text: 'text-[var(--ocean)]',
    badge: 'bg-[var(--ocean)] text-white',
  },
};

const LEVEL_LABELS: Record<string, string> = {
  critical: 'КРИТИЧНО',
  danger: 'ОПАСНО',
  warning: 'ВНИМАНИЕ',
  info: 'ИНФОРМАЦИЯ',
};

interface SafetyWarningsProps {
  tourId?: number | string;
  routeId?: string;
  compact?: boolean;
}

export default function SafetyWarnings({ tourId, routeId, compact = false }: SafetyWarningsProps) {
  const [data, setData] = useState<WarningData | null>(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);
  const [expandedSignal, setExpandedSignal] = useState<string | null>(null);

  useEffect(() => {
    if (!tourId && !routeId) return;

    const params = new URLSearchParams();
    if (tourId) params.set('tour_id', String(tourId));
    if (routeId) params.set('route_id', routeId);

    fetch(`/api/safety/warnings?${params}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => setData(d))
      .catch(() => null)
      .finally(() => setLoading(false));
  }, [tourId, routeId]);

  if (loading || !data || data.signals.length === 0) return null;

  const topSignals = compact ? data.signals.slice(0, 2) : data.signals;
  const hasMore = compact && data.signals.length > 2;

  const overallStyle = LEVEL_STYLES[data.danger_level] || LEVEL_STYLES.info;

  return (
    <div className={`rounded-lg border ${overallStyle.border} ${overallStyle.bg} overflow-hidden`}>
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-4 py-3 text-left"
      >
        <div className="flex items-center gap-2">
          <Shield className={`w-5 h-5 ${overallStyle.text}`} />
          <span className={`font-semibold text-sm ${overallStyle.text}`}>
            Безопасность маршрута
          </span>
          <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${overallStyle.badge}`}>
            {LEVEL_LABELS[data.danger_level] || 'ИНФОРМАЦИЯ'}
          </span>
          <span className="text-xs text-[var(--text-muted)]">
            {data.signals.length} {data.signals.length === 1 ? 'сигнал' : 'сигналов'}
          </span>
        </div>
        {expanded ? (
          <ChevronUp className="w-4 h-4 text-[var(--text-muted)]" />
        ) : (
          <ChevronDown className="w-4 h-4 text-[var(--text-muted)]" />
        )}
      </button>

      {/* Zone risk alert */}
      {data.zone_risk && data.zone_risk.risk_level !== 'low' && (
        <div className="px-4 pb-2">
          <div className="flex items-center gap-2 text-xs bg-[var(--danger)]/15 text-[var(--danger)] px-3 py-2 rounded">
            <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
            <span>
              Зона: уровень риска {data.zone_risk.risk_level} ({data.zone_risk.risk_score}/100).
              {' '}{data.zone_risk.recommended_action}
            </span>
          </div>
        </div>
      )}

      {/* Signals list */}
      {expanded && (
        <div className="px-4 pb-4 space-y-2">
          {topSignals.map(signal => {
            const SignalIcon = ICON_MAP[signal.icon] || AlertTriangle;
            const style = LEVEL_STYLES[signal.level] || LEVEL_STYLES.info;
            const isExpanded = expandedSignal === signal.hazard;

            return (
              <div key={signal.hazard} className={`rounded border ${style.border} overflow-hidden`}>
                <button
                  onClick={() => setExpandedSignal(isExpanded ? null : signal.hazard)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 text-left ${style.bg}`}
                >
                  <SignalIcon className={`w-4 h-4 flex-shrink-0 ${style.text}`} />
                  <div className="flex-1 min-w-0">
                    <span className={`text-sm font-medium ${style.text}`}>{signal.title}</span>
                  </div>
                  <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold ${style.badge}`}>
                    {LEVEL_LABELS[signal.level]}
                  </span>
                  {isExpanded ? (
                    <ChevronUp className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                  ) : (
                    <ChevronDown className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                  )}
                </button>

                {isExpanded && (
                  <div className="px-3 py-3 bg-[var(--bg-card)] space-y-3">
                    <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                      {signal.message}
                    </p>

                    {signal.precautions.length > 0 && (
                      <div>
                        <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1.5">
                          Меры предосторожности
                        </p>
                        <ul className="space-y-1">
                          {signal.precautions.map((p, i) => (
                            <li key={i} className="flex items-start gap-2 text-xs text-[var(--text-secondary)]">
                              <span className="text-[var(--accent)] mt-0.5 flex-shrink-0">--</span>
                              {p}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {signal.incident_ref && (
                      <div className="text-[10px] text-[var(--text-muted)] italic border-t border-[var(--border)] pt-2">
                        Реальный инцидент: {signal.incident_ref}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}

          {hasMore && !expanded && (
            <button
              onClick={() => setExpanded(true)}
              className="text-xs text-[var(--ocean)] hover:underline"
            >
              + ещё {data.signals.length - 2} предупреждений
            </button>
          )}

          {/* Emergency contacts */}
          {data.emergency_contacts.length > 0 && (
            <div className="mt-3 pt-3 border-t border-[var(--border)]">
              <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-2">
                Экстренные контакты
              </p>
              <div className="grid grid-cols-2 gap-2">
                {data.emergency_contacts.map((c, i) => (
                  <a
                    key={i}
                    href={`tel:${c.phone.replace(/\s/g, '')}`}
                    className="flex items-center gap-2 px-2 py-1.5 rounded bg-[var(--bg-hover)] text-xs hover:bg-[var(--accent)]/10 transition-colors"
                  >
                    <Phone className="w-3 h-3 text-[var(--accent)]" />
                    <div>
                      <div className="text-[var(--text-primary)] font-medium text-[10px]">{c.name}</div>
                      <div className="text-[var(--text-muted)] text-[10px]">{c.phone}</div>
                    </div>
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Disclaimer */}
          <p className="text-[9px] text-[var(--text-muted)] mt-2 leading-relaxed">
            {data.disclaimer}
          </p>
        </div>
      )}

      {/* Compact: just show top signal titles */}
      {!expanded && (
        <div className="px-4 pb-3">
          <div className="flex flex-wrap gap-1.5">
            {data.signals.slice(0, 4).map(signal => {
              const SignalIcon = ICON_MAP[signal.icon] || AlertTriangle;
              const style = LEVEL_STYLES[signal.level] || LEVEL_STYLES.info;
              return (
                <span
                  key={signal.hazard}
                  className={`inline-flex items-center gap-1 text-[10px] px-2 py-1 rounded-full ${style.bg} ${style.text} border ${style.border}`}
                >
                  <SignalIcon className="w-3 h-3" />
                  {signal.title}
                </span>
              );
            })}
            {data.signals.length > 4 && (
              <span className="text-[10px] text-[var(--text-muted)] self-center">
                +{data.signals.length - 4}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
