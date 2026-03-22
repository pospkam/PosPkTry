'use client';

import React, { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react';

export interface OrderItem {
  id: string;
  kind: 'tours' | 'activities' | 'accommodations' | 'transfers';
  title: string;
  price: number;
  quantity: number;
  image?: string;
  description?: string;
}

export interface Order {
  id: string;
  items: OrderItem[];
  total: number;
  status: 'created' | 'paid' | 'cancelled' | 'completed';
  paymentStatus: 'pending' | 'paid' | 'failed' | 'refunded';
  createdAt: Date;
  updatedAt: Date;
  customerInfo?: {
    name: string;
    email: string;
    phone: string;
  };
  notes?: string;
}

interface OrdersContextType {
  orders: Order[];
  createOrder: (items: OrderItem[], customerInfo?: Order['customerInfo']) => Promise<Order>;
  confirmOrder: (orderId: string) => Promise<Order | null>;
  cancelOrder: (orderId: string) => Promise<void>;
  updateOrderStatus: (orderId: string, status: Order['status']) => Promise<void>;
  clearOrders: () => Promise<void>;
  getOrderById: (orderId: string) => Order | null;
  getOrdersByStatus: (status: Order['status']) => Order[];
}

const STORAGE_KEY = 'orders';

const OrdersContext = createContext<OrdersContextType | undefined>(undefined);

export const useOrdersContext = () => {
  const ctx = useContext(OrdersContext);
  if (!ctx) throw new Error('useOrdersContext must be used within OrdersProvider');
  return ctx;
};

export const OrdersProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [orders, setOrders] = useState<Order[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
          const parsedOrders = JSON.parse(raw).map((order: any) => ({
            ...order,
            createdAt: new Date(order.createdAt),
            updatedAt: new Date(order.updatedAt),
          }));
          setOrders(parsedOrders);
        }
      } catch (e) {
        console.error('Failed to load orders', e);
      }
    })();
  }, []);

  useEffect(() => {
    (async () => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(orders));
      } catch (e) {
        console.error('Failed to persist orders', e);
      }
    })();
  }, [orders]);

  const createOrder = useCallback(async (
    items: OrderItem[], 
    customerInfo?: Order['customerInfo']
  ): Promise<Order> => {
    const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const order: Order = {
      id: `order_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      items,
      total,
      status: 'created',
      paymentStatus: 'pending',
      createdAt: new Date(),
      updatedAt: new Date(),
      customerInfo,
    };
    
    setOrders(prev => [order, ...prev]);
    return order;
  }, []);

  const confirmOrder = useCallback(async (orderId: string): Promise<Order | null> => {
    let updated: Order | null = null;
    setOrders(prev => prev.map(order => {
      if (order.id === orderId) {
        updated = { 
          ...order, 
          status: 'paid', 
          paymentStatus: 'paid',
          updatedAt: new Date()
        };
        return updated;
      }
      return order;
    }));
    return updated;
  }, []);

  const cancelOrder = useCallback(async (orderId: string) => {
    setOrders(prev => prev.map(order => 
      order.id === orderId 
        ? { ...order, status: 'cancelled', updatedAt: new Date() }
        : order
    ));
  }, []);

  const updateOrderStatus = useCallback(async (orderId: string, status: Order['status']) => {
    setOrders(prev => prev.map(order => 
      order.id === orderId 
        ? { ...order, status, updatedAt: new Date() }
        : order
    ));
  }, []);

  const clearOrders = useCallback(async () => setOrders([]), []);

  const getOrderById = useCallback((orderId: string) => {
    return orders.find(order => order.id === orderId) || null;
  }, [orders]);

  const getOrdersByStatus = useCallback((status: Order['status']) => {
    return orders.filter(order => order.status === status);
  }, [orders]);

  const value = useMemo<OrdersContextType>(() => ({ 
    orders, 
    createOrder, 
    confirmOrder, 
    cancelOrder, 
    updateOrderStatus,
    clearOrders,
    getOrderById,
    getOrdersByStatus
  }), [orders, createOrder, confirmOrder, cancelOrder, updateOrderStatus, clearOrders, getOrderById, getOrdersByStatus]);

  return <OrdersContext.Provider value={value}>{children}</OrdersContext.Provider>;
};
