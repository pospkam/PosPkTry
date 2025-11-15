export const metadata = {
  title: 'Kamchatour Hub - Экосистема туризма Камчатки',
  description: 'Туры, партнёры, CRM, бронирование, безопасность, рефералы и экология — в едином центре.',
}

import './globals.css'
import './minimal-header.css'
import React from 'react'
import Link from 'next/link'
import { RoleProvider } from '@/contexts/RoleContext'
import { AuthProvider } from '@/contexts/AuthContext'
import { OrdersProvider } from '@/contexts/OrdersContext'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <body className="min-h-screen overflow-x-hidden">
        <AuthProvider>
          <RoleProvider>
            <OrdersProvider>
              {children}
            </OrdersProvider>
          </RoleProvider>
        </AuthProvider>
      </body>
    </html>
  )
}

