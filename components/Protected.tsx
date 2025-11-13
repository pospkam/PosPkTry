'use client';

import React, { useEffect, useState } from 'react';
import { useRoles } from '@/contexts/RoleContext';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';

interface ProtectedProps {
  children: React.ReactNode;
  roles: string[];
  fallback?: React.ReactNode;
  redirectTo?: string;
}

export const Protected: React.FC<ProtectedProps> = ({ 
  children, 
  roles, 
  fallback = <div className="text-center p-8 text-gray-500">Нет доступа к этому разделу</div>,
  redirectTo
}) => {
  const { hasRole, isLoading: rolesLoading } = useRoles();
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [shouldRender, setShouldRender] = useState(false);
  
  useEffect(() => {
    // Wait for both contexts to load
    if (authLoading || rolesLoading) {
      return;
    }
    
    // Check if user is authenticated
    if (!user) {
      if (redirectTo) {
        router.push(redirectTo);
      }
      setShouldRender(false);
      return;
    }
    
    // Check if user has required role
    const hasAccess = roles.some(role => hasRole(role as any)) || hasRole('admin' as any);
    
    if (!hasAccess) {
      if (redirectTo) {
        router.push(redirectTo);
      }
      setShouldRender(false);
      return;
    }
    
    setShouldRender(true);
  }, [user, roles, authLoading, rolesLoading, hasRole, router, redirectTo]);
  
  // Show loading state
  if (authLoading || rolesLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-premium-gold"></div>
      </div>
    );
  }
  
  // Show fallback if no access
  if (!shouldRender) {
    return <>{fallback}</>;
  }
  
  return <>{children}</>;
};
