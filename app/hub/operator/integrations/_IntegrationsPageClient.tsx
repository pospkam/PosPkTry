'use client';

import React, { useState, useEffect } from 'react';
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

export default function IntegrationsPageClient() {
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
    if (!configured) return <AlertCircle className="w-5 h-5 text-[var(--warning)]" />;
    if (status === 'ok') return <CheckCircle className="w-5 h-5 text-[var(--success)]" />;
    if (status === 'error') return <XCircle className="w-5 h-5 text-[var(--danger)]" />;
    return <AlertCircle className="w-5 h-5 text-[var(--text-muted)]" />;
  };

  const getPartnerIcon = (type: string) => {
    switch (type) {
      case 'fishing-tours':
        return <Fish className="w-8 h-8 text-[var(--accent)]" />;
      default:
        return <Package className="w-8 h-8 text-[var(--text-muted)]" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-[var(--accent)]/20 border-t-[var(--accent)] rounded-full animate-spin mx-auto mb-4" />
          <p className="text-[var(--text-muted)]">Загрузка интеграций...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-5 lg:p-6 space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">Интеграции с партнерами</h1>
        <p className="text-[var(--text-muted)] mt-1">Управление API подключениями и синхронизацией данных</p>
      </div>

      {/* Sync Result Alert */}
      {syncResult && (
        <div className={`p-4 rounded-lg border ${
          syncResult.success
            ? 'bg-[var(--success)]/5 border-[var(--success)]/30'
            : 'bg-[var(--danger)]/5 border-[var(--danger)]/30'
        }`}>
          <div className="flex items-start gap-3">
            {syncResult.success ? (
              <CheckCircle className="w-5 h-5 text-[var(--success)] mt-0.5" />
            ) : (
              <XCircle className="w-5 h-5 text-[var(--danger)] mt-0.5" />
            )}
            <div>
              <h3 className={`font-semibold ${syncResult.success ? 'text-[var(--success)]' : 'text-[var(--danger)]'}`}>
                {syncResult.success ? 'Синхронизация завершена' : 'Ошибка синхронизации'}
              </h3>
              {syncResult.success ? (
                <p className="text-[var(--text-muted)] text-sm mt-1">
                  Импортировано: {syncResult.toursImported} туров,
                  Обновлено: {syncResult.toursUpdated}
                </p>
              ) : (
                <ul className="text-[var(--danger)] text-sm mt-1">
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
      <div className="grid gap-5">
        {partners.map((partner) => (
          <div
            key={partner.partner.id}
            className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg p-6"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-[var(--bg-hover)] rounded-md">
                  {getPartnerIcon(partner.partner.type)}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-semibold text-[var(--text-primary)]">{partner.partner.name}</h2>
                    {getStatusIcon(partner.sync.status, partner.configured)}
                  </div>
                  <a
                    href={partner.partner.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[var(--accent)] hover:underline text-sm flex items-center gap-1 mt-1"
                  >
                    {partner.partner.website}
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>

              <button
                onClick={() => handleSync(partner.partner.id)}
                disabled={!partner.configured || syncing === partner.partner.id}
                className={`px-4 py-2 rounded-md text-sm font-medium flex items-center gap-2 transition-colors ${
                  partner.configured
                    ? 'bg-[var(--accent)] text-[var(--bg-card)] hover:opacity-90'
                    : 'bg-[var(--bg-hover)] text-[var(--text-muted)] cursor-not-allowed'
                }`}
              >
                <RefreshCw className={`w-4 h-4 ${syncing === partner.partner.id ? 'animate-spin' : ''}`} />
                {syncing === partner.partner.id ? 'Синхронизация...' : 'Синхронизировать'}
              </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4 mt-6">
              <div className="bg-[var(--bg-hover)] rounded-md p-4">
                <p className="text-[var(--text-muted)] text-sm">Статус</p>
                <p className={`text-lg font-semibold ${
                  !partner.configured ? 'text-[var(--warning)]' :
                  partner.sync.status === 'ok' ? 'text-[var(--success)]' :
                  partner.sync.status === 'error' ? 'text-[var(--danger)]' :
                  'text-[var(--text-muted)]'
                }`}>
                  {!partner.configured ? 'Не настроено' :
                   partner.sync.status === 'ok' ? 'Активно' :
                   partner.sync.status === 'error' ? 'Ошибка' :
                   'Не синхронизировано'}
                </p>
              </div>
              <div className="bg-[var(--bg-hover)] rounded-md p-4">
                <p className="text-[var(--text-muted)] text-sm">Туров</p>
                <p className="text-lg font-semibold text-[var(--text-primary)]">{partner.sync.toursCount}</p>
              </div>
              <div className="bg-[var(--bg-hover)] rounded-md p-4">
                <p className="text-[var(--text-muted)] text-sm">Последняя синхронизация</p>
                <p className="text-lg font-semibold text-[var(--text-primary)]">
                  {partner.sync.lastSync
                    ? new Date(partner.sync.lastSync).toLocaleDateString('ru-RU')
                    : 'Никогда'}
                </p>
              </div>
            </div>

            {/* Configuration Warning */}
            {!partner.configured && (
              <div className="mt-4 p-4 bg-[var(--warning)]/5 border border-[var(--warning)]/20 rounded-md">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-[var(--warning)] mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-[var(--warning)]">Требуется настройка</h4>
                    <p className="text-[var(--text-muted)] text-sm mt-1">
                      Добавьте API ключи в переменные окружения:
                    </p>
                    <code className="block mt-2 p-2 bg-[var(--bg-primary)] rounded text-xs text-[var(--text-secondary)]">
                      KAMCHATKA_FISHING_API_KEY=REPLACE_WITH_PARTNER_API_KEY<br/>
                      KAMCHATKA_FISHING_API_SECRET=REPLACE_WITH_PARTNER_API_SECRET
                    </code>
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}

        {partners.length === 0 && (
          <div className="text-center py-12 text-[var(--text-muted)]">
            <Package className="w-16 h-16 mx-auto mb-4 opacity-40" />
            <p>Нет подключенных партнеров</p>
          </div>
        )}
      </div>
    </div>
  );
}
