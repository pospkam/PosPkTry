'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { type LucideIcon } from 'lucide-react';

interface SidebarItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

interface HubSidebarProps {
  items: SidebarItem[];
  title: string;
}

/**
 * HubSidebar -- боковая навигация для hub-разделов.
 * Desktop: вертикальный sidebar слева.
 * Mobile: горизонтальный скролл-бар сверху.
 * Активный пункт: accent цвет + бордер справа.
 */
export function HubSidebar({ items, title }: HubSidebarProps) {
  const pathname = usePathname();

  return (
    <>
      {/* Desktop sidebar */}
      <aside
        className="
          hidden md:flex flex-col w-60 shrink-0
          bg-[var(--bg-secondary)] border-r border-[var(--border)]
          min-h-[calc(100vh-4rem)]
        "
      >
        <div className="p-4 border-b border-[var(--border)]">
          <h2 className="text-sm font-semibold text-[var(--text-primary)]">{title}</h2>
        </div>

        <nav className="flex-1 p-2 space-y-0.5">
          {items.map(item => {
            const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`
                  flex items-center gap-3 px-3 py-2.5
                  rounded-[var(--radius-sm)]
                  text-sm transition-colors duration-200
                  min-h-[44px]
                  ${isActive
                    ? 'bg-[var(--accent-muted)] text-[var(--accent)] border-r-2 border-[var(--accent)]'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]'
                  }
                `}
              >
                <Icon className="w-5 h-5 shrink-0" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* Mobile: горизонтальная навигация */}
      <nav
        className="
          md:hidden
          flex overflow-x-auto gap-1 p-2
          bg-[var(--bg-secondary)] border-b border-[var(--border)]
          scrollbar-hide
        "
      >
        {items.map(item => {
          const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`
                flex items-center gap-1.5 px-3 py-2
                rounded-[var(--radius-sm)]
                text-xs whitespace-nowrap shrink-0
                min-h-[44px]
                transition-colors duration-200
                ${isActive
                  ? 'bg-[var(--accent-muted)] text-[var(--accent)]'
                  : 'text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]'
                }
              `}
            >
              <Icon className="w-4 h-4" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}
