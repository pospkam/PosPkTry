'use client';

import React, { useState } from 'react';
import { Protected } from '@/components/Protected';
import { AdminNav } from '@/components/admin/AdminNav';
import { SystemSettings } from '@/components/admin/Settings/SystemSettings';
import { EmailTemplatesManager } from '@/components/admin/Settings/EmailTemplatesManager';

type TabType = 'system' | 'email';

export default function AdminSettings() {
  const [activeTab, setActiveTab] = useState<TabType>('system');

  const tabs = [
    { id: 'system' as TabType, name: 'Системные настройки', icon: '⚙️' },
    { id: 'email' as TabType, name: 'Email шаблоны', icon: '📧' },
  ];

  return (
    <Protected roles={['admin']}>
      <main className="min-h-screen bg-transparent text-white">
        <AdminNav />

        {/* Header */}
        <div className="bg-white/15 border-b border-white/15 p-6">
          <div className="max-w-7xl mx-auto">
            <div>
              <h1 className="text-3xl font-black text-white">
                Настройки системы
              </h1>
              <p className="text-white/70 mt-1">
                Конфигурация платформы и управление шаблонами
              </p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white/15 border-b border-white/15">
          <div className="max-w-7xl mx-auto px-6">
            <div className="flex space-x-1">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-6 py-4 font-medium transition-all duration-200 flex items-center gap-2 ${
                    activeTab === tab.id
                      ? 'bg-premium-gold text-premium-black border-b-2 border-white/15'
                      : 'text-white/70 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  <span>{tab.icon}</span>
                  {tab.name}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="max-w-7xl mx-auto p-6">
          {activeTab === 'system' && <SystemSettings />}
          {activeTab === 'email' && <EmailTemplatesManager />}
        </div>
      </main>
    </Protected>
  );
}

