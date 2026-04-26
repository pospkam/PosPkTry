'use client';

/**
 * GeoToggle — кнопка "Я на Камчатке" в хедере.
 *
 * Нажатие запрашивает геолокацию (Permission prompt).
 * Если координаты в пределах Камчатки — переключает в режим on-site.
 * Если уже on-site — нажатие возвращает в режим planning.
 */

import { MapPin } from 'lucide-react';
import { useGeo } from '@/contexts/GeoContext';

const iconBtnStyle: React.CSSProperties = {
  width: '32px',
  height: '32px',
  borderRadius: '50%',
  border: 'none',
  background: 'transparent',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'pointer',
  color: 'var(--text-secondary)',
  transition: 'color 0.2s, background 0.2s',
  flexShrink: 0,
};

const btnStyle: React.CSSProperties = {
  width: '32px',
  height: '32px',
  borderRadius: '50%',
  border: 'none',
  background: 'transparent',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'pointer',
  color: 'var(--text-secondary)',
  transition: 'color 0.2s, background 0.2s',
  flexShrink: 0,
};

export function GeoToggle() {
  const { mode, enableOnSite, disableOnSite } = useGeo();
  const isActive = mode === 'on-site';

  const handleClick = () => {
    if (isActive) {
      disableOnSite();
    } else {
      enableOnSite();
    }
  };

  return (
    <button
      onClick={handleClick}
      aria-label={isActive ? 'Выйти из режима «На Камчатке»' : 'Включить режим «Я на Камчатке»'}
      style={{
        ...btnStyle,
        color: isActive ? 'var(--accent)' : undefined,
        background: isActive ? 'var(--accent)/10' : undefined,
      }}
      className="hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]"
      title={isActive ? 'Режим: На Камчатке (нажмите для выхода)' : 'Я на Камчатке'}
    >
      <MapPin size={18} />
    </button>
  );
}
