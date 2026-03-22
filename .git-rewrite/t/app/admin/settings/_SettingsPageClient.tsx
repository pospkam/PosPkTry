'use client';

import { TokenImportForm } from '@/components/admin/TokenImportForm';
import { PublicNav } from '@/components/shared/PublicNav';

export default function SettingsPageClient() {
  return (
    <main className="min-h-screen bg-transparent">
      <PublicNav />
      
      <div className="max-w-4xl mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold text-[var(--text-primary)] mb-2">Настройки</h1>
        <p className="text-[var(--text-muted)] mb-8">Подключение внешних сервисов</p>
        
        <div className="space-y-6">
          <TokenImportForm />
        </div>
      </div>
    </main>
  );
}
