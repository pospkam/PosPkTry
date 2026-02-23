'use client';

import { TokenImportForm } from '@/components/admin/TokenImportForm';
import { PublicNav } from '@/components/shared/PublicNav';

export default function SettingsPageClient() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800">
      <PublicNav />
      
      <div className="max-w-4xl mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold text-white mb-2">Настройки</h1>
        <p className="text-white/60 mb-8">Подключение внешних сервисов</p>
        
        <div className="space-y-6">
          <TokenImportForm />
        </div>
      </div>
    </main>
  );
}
