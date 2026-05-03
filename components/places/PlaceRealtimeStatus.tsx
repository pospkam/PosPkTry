'use client';

import { useEffect, useRef, useState } from 'react';
import { AlertTriangle, CheckCircle, XCircle, AlertOctagon, Users } from 'lucide-react';
import type { PlaceRealtime } from './types';

interface Props {
  realtime: PlaceRealtime;
}

type Level = 'green' | 'yellow' | 'orange' | 'red';

function getLevel(rt: PlaceRealtime): Level {
  if (!rt.isOpen) return 'red';
  const sev = rt.alertSeverity ?? 0;
  if (sev >= 4) return 'red';
  if (sev === 3) return 'orange';
  if (sev === 2) return 'yellow';
  return 'green';
}

const LEVEL_CONFIG = {
  green: {
    bg: 'bg-[var(--success)]/10 border-[var(--success)]/30',
    text: 'text-[var(--success)]',
    Icon: CheckCircle,
    default: 'Открыто, без предупреждений',
  },
  yellow: {
    bg: 'bg-[var(--warning)]/10 border-[var(--warning)]/30',
    text: 'text-[var(--warning)]',
    Icon: AlertTriangle,
    default: 'Внимание',
  },
  orange: {
    bg: 'bg-orange-500/10 border-orange-500/30',
    text: 'text-orange-500',
    Icon: AlertOctagon,
    default: 'Ограничения',
  },
  red: {
    bg: 'bg-[var(--danger)]/10 border-[var(--danger)]/30',
    text: 'text-[var(--danger)]',
    Icon: XCircle,
    default: 'Закрыто / Опасно',
  },
};

export default function PlaceRealtimeStatus({ realtime }: Props) {
  const level = getLevel(realtime);
  const cfg = LEVEL_CONFIG[level];
  const { Icon } = cfg;
  const isSticky = level === 'red' || level === 'orange';
  const [stuck, setStuck] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isSticky) return;
    const handler = () => {
      const scrollY = window.scrollY;
      const vh200 = window.innerHeight * 2;
      setStuck(scrollY > 0 && scrollY < vh200);
    };
    window.addEventListener('scroll', handler, { passive: true });
    return () => window.removeEventListener('scroll', handler);
  }, [isSticky]);

  const message = realtime.alertMessage
    ? `${cfg.default}: ${realtime.alertMessage}`
    : !realtime.isOpen
    ? 'Место закрыто для посещения'
    : cfg.default;

  const crowds = realtime.currentCrowds;
  const crowdsLabel =
    crowds == null ? null :
    crowds <= 2    ? 'Свободно' :
    crowds === 3   ? 'Умеренно' :
    crowds === 4   ? 'Многолюдно' : 'Переполнено';
  const crowdsColor =
    crowds == null ? '' :
    crowds <= 2    ? 'text-[var(--success)]' :
    crowds === 3   ? 'text-[var(--warning)]' : 'text-[var(--danger)]';

  const updatedStr = realtime.updatedAt
    ? new Date(realtime.updatedAt).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
    : null;

  return (
    <div
      ref={ref}
      className={`w-full border-b border-t transition-all ${cfg.bg} ${isSticky && stuck ? 'sticky top-0 z-40 shadow-md' : ''}`}
    >
      <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-3 flex-wrap">
        <Icon className={`w-5 h-5 flex-shrink-0 ${cfg.text}`} />
        <p className={`flex-1 text-sm font-semibold ${cfg.text}`}>{message}</p>
        {crowdsLabel && (
          <span className={`flex items-center gap-1 text-xs font-medium ${crowdsColor}`}>
            <Users className="w-3.5 h-3.5" />
            {crowdsLabel}
          </span>
        )}
        {updatedStr && (
          <span className="text-xs text-[var(--text-muted)] flex-shrink-0 hidden sm:block">
            {updatedStr}
          </span>
        )}
      </div>
    </div>
  );
}
