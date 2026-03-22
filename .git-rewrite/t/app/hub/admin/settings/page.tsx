'use client';

import React, { useState } from 'react';
import { SystemSettings } from '@/components/admin/Settings/SystemSettings';
import { EmailTemplatesManager } from '@/components/admin/Settings/EmailTemplatesManager';
import { Settings, Mail } from 'lucide-react';

type TabType = 'system' | 'email';

export default function AdminSettings() {
  const [activeTab, setActiveTab] = useState<TabType>('system');

  const tabs = [
    { id: 'system' as TabType, name: 'Система', icon: Settings },
    { id: 'email' as TabType, name: 'Email шаблоны', icon: Mail },
  ];

  return (
    <div className="p-5 lg:p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center gap-2.5">
        <Settings className="w-4 h-4 text-[var(--text-muted)]" />
        <h1 className="text-sm font-semibold text-[var(--text-primary)] tracking-tight">Настройки</h1>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-[var(--border)]">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 text-xs font-medium transition-colors flex items-center gap-1.5 border-b-2 -mb-px ${
                activeTab === tab.id
                  ? 'border-[var(--accent)] text-[var(--accent)]'
                  : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {tab.name}
            </button>
          );
        })}
      </div>

      {/* Content */}
      {activeTab === 'system' && <SystemSettings />}
      {activeTab === 'email' && <EmailTemplatesManager />}
    </div>
  );
}
