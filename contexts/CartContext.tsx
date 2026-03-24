'use client';

import { createContext, useContext, useState, useEffect, useCallback } from 'react';

export interface CartItem {
  tourId: number;
  title: string;
  operatorName: string;
  price: number;
  activityType: string;
  image: string | null;
  addedAt: string;
}

interface CartContextValue {
  items: CartItem[];
  count: number;
  add: (item: Omit<CartItem, 'addedAt'>) => void;
  remove: (tourId: number) => void;
  has: (tourId: number) => boolean;
  clear: () => void;
}

const CartContext = createContext<CartContextValue | null>(null);

const STORAGE_KEY = 'tourhab_cart';

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setItems(JSON.parse(raw) as CartItem[]);
    } catch { /* ignore */ }
  }, []);

  const persist = (next: CartItem[]) => {
    setItems(next);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch { /* ignore */ }
  };

  const add = useCallback((item: Omit<CartItem, 'addedAt'>) => {
    setItems(prev => {
      if (prev.some(i => i.tourId === item.tourId)) return prev;
      const next = [...prev, { ...item, addedAt: new Date().toISOString() }];
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch { /* ignore */ }
      return next;
    });
  }, []);

  const remove = useCallback((tourId: number) => {
    setItems(prev => {
      const next = prev.filter(i => i.tourId !== tourId);
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch { /* ignore */ }
      return next;
    });
  }, []);

  const has = useCallback((tourId: number) => items.some(i => i.tourId === tourId), [items]);

  const clear = useCallback(() => {
    setItems([]);
    try { localStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
  }, []);

  return (
    <CartContext.Provider value={{ items, count: items.length, add, remove, has, clear }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within CartProvider');
  return ctx;
}
