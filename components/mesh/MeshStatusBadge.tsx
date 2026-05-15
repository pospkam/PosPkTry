'use client';

import { Wifi, WifiOff, Loader2, Radio } from 'lucide-react';
import type { MeshStatus } from '@/lib/mesh/types';

interface Props {
  status: MeshStatus;
  peerCount: number;
  onClick?: () => void;
}

export default function MeshStatusBadge({ status, peerCount, onClick }: Props) {
  const label: Record<MeshStatus, string> = {
    idle: 'Mesh выкл',
    connecting: 'Подключение...',
    connected: peerCount > 0 ? `${peerCount} рядом` : 'Mesh активен',
    error: 'Ошибка mesh',
    'no-gps': 'Нет GPS',
  };

  const Icon =
    status === 'connecting'
      ? Loader2
      : status === 'connected' && peerCount > 0
        ? Radio
        : status === 'connected'
          ? Wifi
          : WifiOff;

  const color =
    status === 'connected' && peerCount > 0
      ? 'bg-[var(--success)]'
      : status === 'connected'
        ? 'bg-[var(--ocean)]'
        : status === 'connecting'
          ? 'bg-[var(--warning)]'
          : 'bg-[var(--text-secondary)]';

  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium text-white transition-all ${color}`}
    >
      <Icon size={12} className={status === 'connecting' ? 'animate-spin' : ''} />
      {label[status]}
    </button>
  );
}
