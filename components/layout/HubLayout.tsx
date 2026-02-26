'use client';

import { type ReactNode } from 'react';
import { type LucideIcon } from 'lucide-react';
import { HubSidebar } from './HubSidebar';

interface SidebarItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

interface HubLayoutProps {
  children: ReactNode;
  sidebarItems: SidebarItem[];
  sidebarTitle: string;
}

/**
 * HubLayout -- обёртка для hub-разделов.
 * Desktop: sidebar слева + контент справа.
 * Mobile: горизонтальная навигация сверху + контент снизу.
 */
export function HubLayout({ children, sidebarItems, sidebarTitle }: HubLayoutProps) {
  return (
    <div className="flex flex-col md:flex-row min-h-[calc(100vh-4rem)]">
      <HubSidebar items={sidebarItems} title={sidebarTitle} />
      <div className="flex-1 overflow-auto">
        {children}
      </div>
    </div>
  );
}
