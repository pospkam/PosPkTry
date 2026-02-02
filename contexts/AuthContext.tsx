'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

export interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  role: string;
  roles: string[];
  preferences: UserPreferences;
  createdAt: Date;
  updatedAt: Date;
  token?: string;
}

export interface UserPreferences {
  language: 'ru' | 'en';
  notifications: boolean;
  emergencyAlerts: boolean;
  locationSharing: boolean;
  theme: 'light' | 'dark' | 'system';
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, name: string) => Promise<void>;
  signOut: () => Promise<void>;
  updateUser: (updates: Partial<User>) => Promise<void>;
  updatePreferences: (preferences: Partial<UserPreferences>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

const defaultPreferences: UserPreferences = {
  language: 'ru',
  notifications: true,
  emergencyAlerts: true,
  locationSharing: false,
  theme: 'system'
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadUserFromStorage();
  }, []);

  const loadUserFromStorage = async () => {
    try {
      // Try to load from localStorage first
      const userData = localStorage.getItem('user');
      if (userData) {
        const parsedUser = JSON.parse(userData);
        parsedUser.createdAt = new Date(parsedUser.createdAt);
        parsedUser.updatedAt = new Date(parsedUser.updatedAt);
        parsedUser.preferences = { ...defaultPreferences, ...parsedUser.preferences };
        
        // Verify session with server
        try {
          const response = await fetch('/api/auth/me', {
            headers: {
              'Authorization': `Bearer ${parsedUser.token}`
            }
          });
          
          if (response.ok) {
            const result = await response.json();
            if (result.success) {
              result.data.token = parsedUser.token;
              setUser(result.data);
              return;
            }
          }
        } catch (err) {
          console.error('Session verification failed:', err);
        }
        
        // If verification failed, clear storage
        localStorage.removeItem('user');
      }
    } catch (error) {
      console.error('Error loading user from storage:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const saveUserToStorage = async (userData: User | null) => {
    try {
      if (userData) {
        localStorage.setItem('user', JSON.stringify(userData));
      } else {
        localStorage.removeItem('user');
      }
    } catch (error) {
      console.error('Error saving user to storage:', error);
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/auth/signin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const result = await response.json();
      
      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Invalid credentials');
      }

      const userData = result.data;
      userData.preferences = { ...defaultPreferences, ...userData.preferences };
      userData.createdAt = new Date(userData.createdAt);
      userData.updatedAt = new Date(userData.updatedAt);
      
      setUser(userData);
      await saveUserToStorage(userData);
      
      // Also update roles in RoleContext
      if (typeof window !== 'undefined') {
        localStorage.setItem('user_roles', JSON.stringify(userData.roles));
      }
    } catch (error) {
      console.error('Sign in error:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const signUp = async (email: string, password: string, name: string) => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, name }),
      });

      const result = await response.json();
      
      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Registration failed');
      }

      const userData = result.data;
      userData.preferences = { ...defaultPreferences, ...userData.preferences };
      userData.createdAt = new Date(userData.createdAt);
      userData.updatedAt = new Date(userData.updatedAt);
      
      setUser(userData);
      await saveUserToStorage(userData);
      
      // Also update roles in RoleContext
      if (typeof window !== 'undefined') {
        localStorage.setItem('user_roles', JSON.stringify(userData.roles));
      }
    } catch (error) {
      console.error('Sign up error:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const signOut = async () => {
    try {
      setIsLoading(true);
      await fetch('/api/auth/signout', { method: 'POST' });
      setUser(null);
      await saveUserToStorage(null);
    } catch (error) {
      console.error('Sign out error:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const updateUser = async (updates: Partial<User>) => {
    if (!user) return;
    
    try {
      const updatedUser = { 
        ...user, 
        ...updates, 
        updatedAt: new Date() 
      };
      setUser(updatedUser);
      await saveUserToStorage(updatedUser);
    } catch (error) {
      console.error('Update user error:', error);
      throw error;
    }
  };

  const updatePreferences = async (preferences: Partial<UserPreferences>) => {
    if (!user) return;
    
    try {
      const updatedUser = {
        ...user,
        preferences: { ...user.preferences, ...preferences },
        updatedAt: new Date()
      };
      setUser(updatedUser);
      await saveUserToStorage(updatedUser);
    } catch (error) {
      console.error('Update preferences error:', error);
      throw error;
    }
  };

  const value: AuthContextType = {
    user,
    isLoading,
    signIn,
    signUp,
    signOut,
    updateUser,
    updatePreferences,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
