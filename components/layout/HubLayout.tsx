'use client';

import { type ReactNode, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { type LucideIcon } from 'lucide-react';
import { HubSidebar } from './HubSidebar';
import { useAuth } from '@/contexts/AuthContext';

interface SidebarItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

interface HubLayoutProps {
  children: ReactNode;
  sidebarItems: SidebarItem[];
  sidebarTitle: string;
  /** Роль(и), необходимые для доступа. Неавторизованные → /auth/login, чужая роль → свой хаб. */
  requiredRole: string | string[];
}

const ROLE_HUB: Record<string, string> = {
  tourist:           '/hub/tourist',
  operator:          '/hub/operator',
  guide:             '/hub/guide',
  transfer:          '/hub/transfer-operator',
  transfer_operator: '/hub/transfer-operator',
  agent:             '/hub/agent',
  admin:             '/hub/admin',
};

export function HubLayout({ children, sidebarItems, sidebarTitle, requiredRole }: HubLayoutProps) {
  const router = useRouter();
  const { user, isLoading } = useAuth();

  useEffect(() => {
    if (isLoading) return;

    if (!user) {
      const from = typeof window !== 'undefined' ? window.location.pathname : '';
      router.replace(`/auth/login${from ? `?from=${encodeURIComponent(from)}` : ''}`);
      return;
    }

    const allowed = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
    const userRoles: string[] = user.roles?.length ? user.roles : [user.role];

    if (!userRoles.some(r => allowed.includes(r))) {
      const myHub = ROLE_HUB[user.role] ?? ROLE_HUB[userRoles[0]] ?? '/';
      router.replace(myHub);
    }
  }, [isLoading, user, requiredRole, router]);

  if (isLoading || !user) {
    return (
      <div className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-[var(--accent)] border-t-transparent animate-spin" />
          <p className="text-sm text-[var(--text-secondary)]">Проверка доступа…</p>
        </div>
      </div>
    );
  }

  const allowed = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
  const userRoles: string[] = user.roles?.length ? user.roles : [user.role];
  if (!userRoles.some(r => allowed.includes(r))) return null;

  return (
    <div className="flex flex-col md:flex-row min-h-[calc(100vh-4rem)]">
      <HubSidebar items={sidebarItems} title={sidebarTitle} />
      <div className="flex-1 overflow-auto">
        {children}
      </div>
    </div>
  );
}
