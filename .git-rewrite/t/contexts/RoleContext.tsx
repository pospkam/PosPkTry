'use client';

import React, { createContext, useContext, useMemo, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';

export type AppRole = 'tourist' | 'operator' | 'guide' | 'transfer' | 'agent' | 'admin' | 'stay' | 'gear';

interface RoleState {
  roles: AppRole[];
  hasRole: (r: AppRole) => boolean;
  setRoles: (r: AppRole[]) => void;
  isLoading: boolean;
}

const RoleContext = createContext<RoleState | undefined>(undefined);

export const RoleProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isLoading: authLoading } = useAuth();
  const [roles, setRoles] = useState<AppRole[]>(['tourist']);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!authLoading) {
      if (user && user.roles) {
        setRoles(user.roles as AppRole[]);
      } else {
        setRoles(['tourist']);
      }
      setIsLoading(false);
    }
  }, [user, authLoading]);

  const hasRole = (r: AppRole) => roles.includes(r) || roles.includes('admin');
  
  const value = useMemo(() => ({ 
    roles, 
    hasRole, 
    setRoles, 
    isLoading 
  }), [roles, isLoading]);

  return <RoleContext.Provider value={value}>{children}</RoleContext.Provider>;
};

export const useRoles = () => {
  const ctx = useContext(RoleContext);
  if (!ctx) throw new Error('useRoles must be used within RoleProvider');
  return ctx;
};
