'use client';

import Link from 'next/link';
import { House, Map, Heart, User, AlertTriangle } from 'lucide-react';

const NAV_ITEMS: {
  icon: typeof House;
  label: string;
  href: string;
  sos?: boolean;
}[] = [
  { icon: House, label: 'Домой', href: '/' },
  { icon: Map, label: 'Карта', href: '/map' },
  { icon: Heart, label: 'Избранное', href: '/hub/tourist/wishlist' },
  { icon: User, label: 'ЛК', href: '/profile' },
  { icon: AlertTriangle, label: 'СОС', href: '/safety', sos: true },
];

interface BottomNavProps {
  activePath: string;
  onNavClick?: (e: React.MouseEvent<HTMLAnchorElement>) => void;
}

export default function BottomNav({ activePath, onNavClick }: BottomNavProps) {
  return (
    <nav
      className="md:hidden"
      aria-label="Основная навигация"
      style={{
        position: 'fixed',
        bottom: '32px',
        left: '16px',
        right: '16px',
        zIndex: 100,
        background: 'rgba(255,255,255,0.2)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        border: '1px solid rgba(255,255,255,0.3)',
        borderRadius: '50px',
        padding: '12px 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-around',
      }}
    >
      {NAV_ITEMS.map(({ icon: Icon, label, href, sos }) => {
        const isActive = activePath === href;
        return (
          <Link
            key={href}
            href={href}
            aria-label={label}
            onClick={onNavClick}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '2px',
              color: sos ? '#ef4444' : isActive ? '#00D4FF' : 'rgba(255,255,255,0.8)',
              textDecoration: 'none',
              transition: 'color 200ms ease',
              position: 'relative',
              overflow: 'hidden',
              padding: '4px 8px',
              borderRadius: '12px',
            }}
          >
            <Icon size={20} strokeWidth={1.5} />
            <span
              style={{
                fontFamily: "var(--font-inter,'Inter',sans-serif)",
                fontSize: '10px',
                fontWeight: 500,
              }}
            >
              {label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
