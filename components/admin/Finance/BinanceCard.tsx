'use client';

import { useState, useCallback } from 'react';
import { RefreshCw, Copy, Check, AlertTriangle, TrendingUp } from 'lucide-react';

interface DepositRecord {
  amount: string;
  coin: string;
  network: string;
  status: number;
  address: string;
  txId: string;
  insertTime: number;
}

interface BinanceData {
  configured: boolean;
  error?: string;
  balance?: { free: string; locked: string; total: string };
  address?: { address: string; tag: string; network: string };
  rate?: number;
  recentDeposits?: DepositRecord[];
  generatedAt?: string;
}

function shortAddr(addr: string): string {
  if (addr.length <= 12) return addr;
  return `${addr.slice(0, 6)}...${addr.slice(-6)}`;
}

function formatDate(ms: number): string {
  return new Date(ms).toLocaleString('ru-RU', {
    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
  });
}

export function BinanceCard() {
  const [data, setData] = useState<BinanceData | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/finance/binance');
      const json = await res.json() as BinanceData;
      setData(json);
    } catch {
      setData({ configured: true, error: 'Сетевая ошибка' });
    } finally {
      setLoading(false);
    }
  }, []);

  const copyAddress = useCallback(async () => {
    if (!data?.address?.address) return;
    await navigator.clipboard.writeText(data.address.address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [data]);

  if (!data) {
    return (
      <div className="ds-card p-4 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-md bg-[var(--bg-hover)] flex items-center justify-center">
            <TrendingUp className="w-4 h-4 text-[var(--text-muted)]" />
          </div>
          <div>
            <p className="text-xs font-medium text-[var(--text-primary)]">Binance USDT</p>
            <p className="text-[11px] text-[var(--text-muted)]">Кошелёк не загружен</p>
          </div>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-[var(--bg-hover)] text-[var(--text-secondary)] rounded-md hover:text-[var(--text-primary)] transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Загрузить
        </button>
      </div>
    );
  }

  if (!data.configured) {
    return (
      <div className="ds-card p-4 flex items-center gap-3">
        <AlertTriangle className="w-4 h-4 text-[var(--warning)] shrink-0" />
        <p className="text-xs text-[var(--text-muted)]">
          Binance не настроен — добавьте <code className="text-[var(--accent)]">BINANCE_API_KEY</code> и{' '}
          <code className="text-[var(--accent)]">BINANCE_API_SECRET</code> в переменные окружения.
        </p>
      </div>
    );
  }

  if (data.error) {
    return (
      <div className="ds-card p-4 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <AlertTriangle className="w-4 h-4 text-[var(--warning)] shrink-0" />
          <p className="text-xs text-[var(--text-muted)]">Binance недоступен: {data.error}</p>
        </div>
        <button onClick={load} disabled={loading} className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-[var(--bg-hover)] rounded-md text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Повторить
        </button>
      </div>
    );
  }

  const totalRub = data.balance && data.rate
    ? (parseFloat(data.balance.total) * data.rate).toLocaleString('ru-RU', { maximumFractionDigits: 0 })
    : null;

  return (
    <div className="ds-card p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-[var(--success)]" />
          <span className="text-xs font-semibold text-[var(--text-primary)]">Binance USDT</span>
          {data.rate ? (
            <span className="text-[11px] text-[var(--text-muted)]">
              1 USDT ≈ {data.rate.toLocaleString('ru-RU', { maximumFractionDigits: 1 })} ₽
            </span>
          ) : null}
        </div>
        <button onClick={load} disabled={loading} className="flex items-center gap-1 text-[11px] text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors">
          <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
          Обновить
        </button>
      </div>

      {/* Balance */}
      {data.balance && (
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-[var(--bg-hover)] rounded-md p-3">
            <p className="text-[11px] text-[var(--text-muted)] mb-1">Доступно</p>
            <p className="text-base font-semibold text-[var(--text-primary)]">{parseFloat(data.balance.free).toLocaleString('ru-RU', { maximumFractionDigits: 2 })} <span className="text-xs font-normal text-[var(--text-muted)]">USDT</span></p>
            {totalRub && <p className="text-[11px] text-[var(--text-muted)] mt-0.5">≈ {totalRub} ₽</p>}
          </div>
          <div className="bg-[var(--bg-hover)] rounded-md p-3">
            <p className="text-[11px] text-[var(--text-muted)] mb-1">Заморожено</p>
            <p className="text-base font-semibold text-[var(--text-primary)]">{parseFloat(data.balance.locked).toLocaleString('ru-RU', { maximumFractionDigits: 2 })} <span className="text-xs font-normal text-[var(--text-muted)]">USDT</span></p>
          </div>
        </div>
      )}

      {/* Address */}
      {data.address?.address && (
        <div className="border border-[var(--border)] rounded-md p-3 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] text-[var(--text-muted)] mb-0.5">Адрес {data.address.network}</p>
            <p className="text-xs font-mono text-[var(--text-primary)] truncate">{shortAddr(data.address.address)}</p>
          </div>
          <button
            onClick={copyAddress}
            className="shrink-0 flex items-center gap-1 px-2.5 py-1.5 text-[11px] bg-[var(--bg-hover)] rounded-md text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
          >
            {copied ? <Check className="w-3 h-3 text-[var(--success)]" /> : <Copy className="w-3 h-3" />}
            {copied ? 'Скопировано' : 'Копировать'}
          </button>
        </div>
      )}

      {/* Recent deposits */}
      {data.recentDeposits && data.recentDeposits.length > 0 && (
        <div>
          <p className="text-[11px] text-[var(--text-muted)] mb-2">Последние поступления</p>
          <div className="space-y-1.5">
            {data.recentDeposits.slice(0, 5).map((d) => (
              <div key={d.txId || d.insertTime} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${d.status === 1 ? 'bg-[var(--success)]' : 'bg-[var(--warning)]'}`} />
                  <span className="text-[var(--text-primary)]">+{parseFloat(d.amount).toLocaleString('ru-RU', { maximumFractionDigits: 2 })} USDT</span>
                  <span className="text-[var(--text-muted)] text-[11px]">{d.network}</span>
                </div>
                <span className="text-[var(--text-muted)] text-[11px]">{formatDate(d.insertTime)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {data.recentDeposits?.length === 0 && (
        <p className="text-[11px] text-[var(--text-muted)]">Поступлений USDT пока нет</p>
      )}
    </div>
  );
}
