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
import WeatherBackground from '@/components/WeatherBackground'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <body className="min-h-screen relative overflow-x-hidden">
        <WeatherBackground />
        <AuthProvider>
          <RoleProvider>
            <OrdersProvider>
              <header className="minimal-header">
                <div className="minimal-header-container">
                  {/* Left: User Profile Icon */}
                  <Link href="/auth/login" className="profile-icon-btn" title="Личный кабинет">
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                      <circle cx="12" cy="7" r="4"></circle>
                    </svg>
                  </Link>

                  {/* Right: Logo */}
                  <Link href="/" className="logo-link" title="На главную">
                    <img src="/logo-kamchatour.png" alt="Kamchatour" className="main-logo" />
                  </Link>
                </div>
              </header>
              <main className="max-w-6xl mx-auto px-4">{children}</main>
            </OrdersProvider>
          </RoleProvider>
        </AuthProvider>
      </body>
    </html>
  )
}

