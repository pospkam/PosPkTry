'use client';

import React from 'react';
import { useRoles } from '@/contexts/RoleContext';

interface ProtectedProps {
  children: React.ReactNode;
  roles: string[];
  fallback?: React.ReactNode;
}

export const Protected: React.FC<ProtectedProps> = ({ 
  children, 
  roles, 
  fallback = <div className="text-center p-8 text-gray-500">Нет доступа</div> 
}) => {
  const { hasRole, isLoading } = useRoles();
  
  // Показываем загрузку пока проверяем роли
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-violet-500/30 border-t-violet-400 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-white">Проверка доступа...</p>
        </div>
      </div>
    );
  }
  
  const hasAccess = roles.some(role => hasRole(role as any));
  
  if (!hasAccess) {
    return <>{fallback}</>;
  }
  
  return <>{children}</>;
};
