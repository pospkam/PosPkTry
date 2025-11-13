'use client';

import React, { createContext, useContext, useMemo, useState, useEffect } from 'react';

export type AppRole = 'tourist' | 'operator' | 'guide' | 'transfer' | 'agent' | 'admin';

interface RoleState {
  roles: AppRole[];
  hasRole: (r: AppRole) => boolean;
  setRoles: (r: AppRole[]) => void;
  isLoading: boolean;
}

const RoleContext = createContext<RoleState | undefined>(undefined);

export const RoleProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [roles, setRoles] = useState<AppRole[]>(['tourist']);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadRoles = () => {
      try {
        const savedRoles = localStorage.getItem('user_roles');
        if (savedRoles) {
          const parsedRoles = JSON.parse(savedRoles) as AppRole[];
          setRoles(parsedRoles);
        }
      } catch (error) {
        console.error('Error loading roles from localStorage:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadRoles();
  }, []);

  useEffect(() => {
    if (!isLoading) {
      try {
        localStorage.setItem('user_roles', JSON.stringify(roles));
      } catch (error) {
        console.error('Error saving roles to localStorage:', error);
      }
    }
  }, [roles, isLoading]);

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
