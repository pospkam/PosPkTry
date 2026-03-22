'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface AdminProtectedProps {
  children: React.ReactNode;
}

/**
 * Компонент защиты для админских страниц
 * Проверяет наличие токена админа в localStorage
 */
export const AdminProtected: React.FC<AdminProtectedProps> = ({ children }) => {
  const router = useRouter();
  const [isChecking, setIsChecking] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);

  useEffect(() => {
    // Проверяем токен админа
    const adminToken = localStorage.getItem('admin_token');
    const userRoles = localStorage.getItem('user_roles');
    
    if (adminToken) {
      // Токен есть - устанавливаем роль admin если её нет
      try {
        const roles = userRoles ? JSON.parse(userRoles) : [];
        if (!roles.includes('admin')) {
          localStorage.setItem('user_roles', JSON.stringify(['admin']));
        }
      } catch (e) {
        localStorage.setItem('user_roles', JSON.stringify(['admin']));
      }
      setHasAccess(true);
    } else {
      // Токена нет - редирект на логин
      router.push('/admin/login');
    }
    
    setIsChecking(false);
  }, [router]);

  if (isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg-primary)]">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-[var(--border)] border-t-[var(--accent)] rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-[var(--text-secondary)]">Проверка доступа...</p>
        </div>
      </div>
    );
  }

  if (!hasAccess) {
    return null; // Редирект уже выполнен
  }

  return <>{children}</>;
};
