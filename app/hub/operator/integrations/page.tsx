'use client';

import React, { useState, useEffect } from 'react';
import { Protected } from '@/components/Protected';

export const metadata = {
  title: 'Интеграции | Kamhub',
  description: 'Интеграции с партнерами',
};

import { 
  RefreshCw, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  ExternalLink,
  Fish,
  Calendar,
  Package
} from 'lucide-react';

interface PartnerStatus {
  partner: {
    id: string;
    name: string;
    website: string;
    type: string;
  };
  sync: {
    lastSync: string | null;
    toursCount: number;
    status: 'ok' | 'error' | 'never';
  };
  configured: boolean;
}

interface SyncResult {
  success: boolean;
  toursImported: number;
  toursUpdated: number;
  errors: string[];
  syncedAt: string;
}

export default function IntegrationsPage() {
  const [partners, setPartners] = useState<PartnerStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState<string | null>(null);
  const [syncResult, setSyncResult] = useState<SyncResult | null>(null);

  useEffect(() => {
    fetchPartners();
  }, []);

  const fetchPartners = async () => {
    try {
      const response = await fetch('/api/partners/kamchatka-fishing');
      const data = await response.json();
      
      if (data.success) {
        setPartners([data.data]);
      }
    } catch (error) {
      console.error('Error fetching partners:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSync = async (partnerId: string) => {
    setSyncing(partnerId);
    setSyncResult(null);

    try {
      const response = await fetch(`/api/partners/${partnerId}`, {
        method: 'POST',
      });
      const data = await response.json();
      
      if (data.success) {
        setSyncResult(data.data);
        fetchPartners();
      } else {
        setSyncResult({
          success: false,
          toursImported: 0,
          toursUpdated: 0,
          errors: [data.error || 'Sync failed'],
          syncedAt: new Date().toISOString(),
        });
      }
    } catch (error) {
      setSyncResult({
        success: false,
        toursImported: 0,
        toursUpdated: 0,
        errors: [error instanceof Error ? error.message : 'Unknown error'],
        syncedAt: new Date().toISOString(),
      });
    } finally {
      setSyncing(null);
    }
  };

  const getStatusIcon = (status: string, configured: boolean) => {
    if (!configured) return <AlertCircle className="w-5 h-5 text-yellow-400" />;
    if (status === 'ok') return <CheckCircle className="w-5 h-5 text-green-400" />;
    if (status === 'error') return <XCircle className="w-5 h-5 text-red-400" />;
    return <AlertCircle className="w-5 h-5 text-gray-400" />;
  };

  const getPartnerIcon = (type: string) => {
    switch (type) {
      case 'fishing-tours':
        return <Fish className="w-8 h-8 text-blue-400" />;
      default:
        return <Package className="w-8 h-8 text-gray-400" />;
    }
  };

  if (loading) {
    return (
      <Protected roles={['operator', 'admin']}>
        <div className="min-h-screen bg-transparent flex items-center justify-center">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-premium-gold/30 border-t-premium-gold rounded-full animate-spin mx-auto mb-4" />
            <p className="text-white">Загрузка интеграций...</p>
          </div>
        </div>
      </Protected>
    );
  }

  return (
    <Protected roles={['operator', 'admin']}>
      <main className="min-h-screen bg-transparent text-white">
        <div className="bg-white/15 border-b border-white/15 p-6">
          <h1 className="text-3xl font-black text-white">Интеграции с партнерами</h1>
          <p className="text-white/70 mt-1">Управление API подключениями и синхронизацией данных</p>
        </div>

        <div className="max-w-7xl mx-auto px-6 py-8">
          {/* Sync Result Alert */}
          {syncResult && (
            <div className={`mb-6 p-4 rounded-xl border ${
              syncResult.success 
                ? 'bg-green-500/10 border-green-500/30' 
                : 'bg-red-500/10 border-red-500/30'
            }`}>
              <div className="flex items-start gap-3">
                {syncResult.success ? (
                  <CheckCircle className="w-5 h-5 text-green-400 mt-0.5" />
                ) : (
                  <XCircle className="w-5 h-5 text-red-400 mt-0.5" />
                )}
                <div>
                  <h3 className={`font-semibold ${syncResult.success ? 'text-green-400' : 'text-red-400'}`}>
                    {syncResult.success ? 'Синхронизация завершена' : 'Ошибка синхронизации'}
                  </h3>
                  {syncResult.success ? (
                    <p className="text-white/70 text-sm mt-1">
                      Импортировано: {syncResult.toursImported} туров, 
                      Обновлено: {syncResult.toursUpdated}
                    </p>
                  ) : (
                    <ul className="text-red-300 text-sm mt-1">
                      {syncResult.errors.map((err) => (
                        <li key={err}>{err}</li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Partners Grid */}
          <div className="grid gap-6">
            {partners.map((partner) => (
              <div 
                key={partner.partner.id}
                className="bg-white/10 border border-white/20 rounded-2xl p-6"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    <div className="p-3 bg-white/10 rounded-xl">
                      {getPartnerIcon(partner.partner.type)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-xl font-bold">{partner.partner.name}</h2>
                        {getStatusIcon(partner.sync.status, partner.configured)}
                      </div>
                      <a 
                        href={partner.partner.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-premium-gold hover:underline text-sm flex items-center gap-1 mt-1"
                      >
                        {partner.partner.website}
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  </div>

                  <button
                    onClick={() => handleSync(partner.partner.id)}
                    disabled={!partner.configured || syncing === partner.partner.id}
                    className={`px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors ${
                      partner.configured
                        ? 'bg-premium-gold text-premium-black hover:bg-premium-gold/80'
                        : 'bg-white/10 text-white/50 cursor-not-allowed'
                    }`}
                  >
                    <RefreshCw className={`w-4 h-4 ${syncing === partner.partner.id ? 'animate-spin' : ''}`} />
                    {syncing === partner.partner.id ? 'Синхронизация...' : 'Синхронизировать'}
                  </button>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-4 mt-6">
                  <div className="bg-white/5 rounded-xl p-4">
                    <p className="text-white/50 text-sm">Статус</p>
                    <p className={`text-lg font-semibold ${
                      !partner.configured ? 'text-yellow-400' :
                      partner.sync.status === 'ok' ? 'text-green-400' :
                      partner.sync.status === 'error' ? 'text-red-400' :
                      'text-gray-400'
                    }`}>
                      {!partner.configured ? 'Не настроено' :
                       partner.sync.status === 'ok' ? 'Активно' :
                       partner.sync.status === 'error' ? 'Ошибка' :
                       'Не синхронизировано'}
                    </p>
                  </div>
                  <div className="bg-white/5 rounded-xl p-4">
                    <p className="text-white/50 text-sm">Туров</p>
                    <p className="text-lg font-semibold text-white">{partner.sync.toursCount}</p>
                  </div>
                  <div className="bg-white/5 rounded-xl p-4">
                    <p className="text-white/50 text-sm">Последняя синхронизация</p>
                    <p className="text-lg font-semibold text-white">
                      {partner.sync.lastSync 
                        ? new Date(partner.sync.lastSync).toLocaleDateString('ru-RU')
                        : 'Никогда'}
                    </p>
                  </div>
                </div>

                {/* Configuration Warning */}
                {!partner.configured && (
                  <div className="mt-4 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-xl">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="w-5 h-5 text-yellow-400 mt-0.5" />
                      <div>
                        <h4 className="font-semibold text-yellow-400">Требуется настройка</h4>
                        <p className="text-white/70 text-sm mt-1">
                          Добавьте API ключи в переменные окружения:
                        </p>
                        <code className="block mt-2 p-2 bg-black/30 rounded text-xs text-white/80">
                          KAMCHATKA_FISHING_API_KEY=zrefrc2397r0vqpzjpex<br/>
                          KAMCHATKA_FISHING_API_SECRET=16b2c5b78a22f194e1b5
                        </code>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}

            {partners.length === 0 && (
              <div className="text-center py-12 text-white/50">
                <Package className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <p>Нет подключенных партнеров</p>
              </div>
            )}
          </div>
        </div>
      </main>
    </Protected>
  );
}
