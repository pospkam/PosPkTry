'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useRoles } from '@/contexts/RoleContext';

interface ProtectedProps {
  children: React.ReactNode;
  roles: string[];
  fallback?: React.ReactNode;
}

export const Protected: React.FC<ProtectedProps> = ({
  children,
  roles,
  fallback = <div className="text-center p-8 text-[var(--text-muted)]">Нет доступа</div>
}) => {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const { hasRole, isLoading: rolesLoading } = useRoles();

  const isLoading = authLoading || rolesLoading;

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/auth/login');
    }
  }, [isLoading, user, router]);

  // Показываем загрузку пока проверяем авторизацию/роли
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg-primary)]">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-[var(--border)] border-t-[var(--accent)] rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-[var(--text-primary)]">Проверка доступа...</p>
        </div>
      </div>
    );
  }

  // Не авторизован — редирект (useEffect выше)
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg-primary)]">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-[var(--border)] border-t-[var(--accent)] rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-[var(--text-primary)]">Перенаправление...</p>
        </div>
      </div>
    );
  }

  // Авторизован, но нет нужной роли
  const hasAccess = roles.some(role => hasRole(role as unknown as Parameters<typeof hasRole>[0]));

  if (!hasAccess) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
};
