'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

const ROLE_HUB: Record<string, string> = {
  tourist:           '/hub/tourist',
  operator:          '/hub/operator',
  guide:             '/hub/guide',
  transfer:          '/hub/transfer-operator',
  transfer_operator: '/hub/transfer-operator',
  agent:             '/hub/agent',
  admin:             '/hub/admin',
};

/**
 * /profile — перенаправляет авторизованного пользователя в его личный кабинет (хаб).
 * Неавторизованных — на /auth/login.
 */
export default function ProfilePageClient() {
  const router = useRouter();
  const { user, isLoading } = useAuth();

  useEffect(() => {
    if (isLoading) return;

    if (!user) {
      router.replace('/auth/login?from=/profile');
      return;
    }

    const hub = ROLE_HUB[user.role] ?? ROLE_HUB[user.roles?.[0]] ?? '/hub/tourist';
    router.replace(hub);
  }, [isLoading, user, router]);

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 rounded-full border-2 border-[var(--accent)] border-t-transparent animate-spin" />
        <p className="text-sm text-[var(--text-secondary)]">Перенаправление…</p>
      </div>
    </div>
  );
}
