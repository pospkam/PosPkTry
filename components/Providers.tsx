'use client';

import { ThemeProvider } from '@/contexts/ThemeContext';
import { AuthProvider } from '@/contexts/AuthContext';
import { RoleProvider } from '@/contexts/RoleContext';
import { OrdersProvider } from '@/contexts/OrdersContext';
import { CartProvider } from '@/contexts/CartContext';
import { GeoProvider } from '@/contexts/GeoContext';
import { Toaster } from 'react-hot-toast';
import PageViewTracker from '@/components/shared/PageViewTracker';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <AuthProvider>
        <RoleProvider>
          <OrdersProvider>
            <CartProvider>
              <GeoProvider>
                {children}
              </GeoProvider>
            </CartProvider>
            <Toaster position="top-right" toastOptions={{ duration: 4000 }} />
            <PageViewTracker />
          </OrdersProvider>
        </RoleProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
