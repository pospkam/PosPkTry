'use client';

import { Protected } from '@/components/auth/Protected';
import {
  Award, ArrowUpRight, ArrowDownRight,
  Clock, RotateCcw, Loader2, AlertCircle,
} from 'lucide-react';
import { useApiFetch } from '@/hooks/use-api-fetch';

interface UserLevel {
  name: string;
  minSpent: number;
  discount: number;
  benefits: string[];
  color: string;
}

interface BonusTransaction {
  id: string;
  type: 'earn' | 'redeem' | 'expire' | 'refund';
  amount: number;
  description: string;
  createdAt: string;
}

interface LoyaltyStats {
  totalPoints: number;
  availablePoints: number;
  currentLevel: UserLevel;
  nextLevel: UserLevel | null;
  pointsToNextLevel: number;
  totalEarned: number;
  totalRedeemed: number;
  transactions: BonusTransaction[];
}

const LEVEL_ORDER = ['Новичок', 'Бронза', 'Серебро', 'Золото', 'Платина'];

const TX_CONFIG: Record<string, { icon: typeof ArrowUpRight; label: string; sign: string; className: string }> = {
  earn: { icon: ArrowUpRight, label: 'Начислено', sign: '+', className: 'text-[var(--success)]' },
  redeem: { icon: ArrowDownRight, label: 'Списано', sign: '-', className: 'text-[var(--accent)]' },
  expire: { icon: Clock, label: 'Сгорело', sign: '-', className: 'text-[var(--text-muted)]' },
  refund: { icon: RotateCcw, label: 'Возврат', sign: '+', className: 'text-[var(--ocean)]' },
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
}

function formatMoney(n: number) {
  return new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 }).format(n);
}

export default function LoyaltyClient() {
  const { data: stats, loading, error } = useApiFetch<LoyaltyStats>(
    '/api/loyalty/stats',
    undefined,
    { errorMessage: 'Не удалось загрузить данные программы лояльности' },
  );

  const { data: levels } = useApiFetch<UserLevel[]>(
    '/api/loyalty/levels',
  );

  const currentLevelName = stats?.currentLevel?.name ?? 'Новичок';
  const nextLevel = stats?.nextLevel;

  // Progress toward next level: based on pointsToNextLevel vs required range
  const progressPercent = nextLevel
    ? Math.min(
        ((stats?.totalPoints ?? 0) / (stats?.totalPoints ?? 0 + (stats?.pointsToNextLevel ?? 1))) * 100,
        100,
      )
    : 100;

  return (
    <Protected roles={['tourist', 'admin']}>
      <div className="max-w-3xl mx-auto px-4 py-6 lg:py-8">
        <h1 className="font-playfair text-2xl sm:text-3xl font-bold text-[var(--text-primary)] mb-6">
          Программа лояльности
        </h1>

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-[var(--accent)]" />
          </div>
        ) : error ? (
          <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg p-8 text-center">
            <AlertCircle className="w-10 h-10 mx-auto mb-3 text-[var(--danger)]" />
            <p className="text-[var(--text-secondary)]">{error}</p>
          </div>
        ) : (
          <div className="space-y-6">

            {/* Current status card */}
            <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg p-6">
              <div className="flex items-center gap-4">
                <div
                  className="w-14 h-14 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: `${stats?.currentLevel?.color ?? '#6B7280'}22` }}
                >
                  <Award
                    className="w-7 h-7"
                    style={{ color: stats?.currentLevel?.color ?? '#6B7280' }}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-[var(--text-muted)]">Уровень</p>
                  <p className="text-2xl font-bold font-playfair text-[var(--text-primary)]">
                    {currentLevelName}
                  </p>
                  {(stats?.currentLevel?.discount ?? 0) > 0 && (
                    <p className="text-sm text-[var(--success)]">
                      Скидка {((stats?.currentLevel?.discount ?? 0) * 100).toFixed(0)}% на все туры
                    </p>
                  )}
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-3xl font-bold font-playfair text-[var(--text-primary)]">
                    {(stats?.availablePoints ?? 0).toLocaleString('ru-RU')}
                  </p>
                  <p className="text-sm text-[var(--text-muted)]">доступных баллов</p>
                </div>
              </div>

              {/* Progress to next level */}
              {nextLevel && (
                <div className="mt-5">
                  <div className="flex justify-between text-sm mb-1.5">
                    <span className="text-[var(--text-secondary)]">
                      До уровня <span className="font-medium">{nextLevel.name}</span>
                    </span>
                    <span className="text-[var(--text-secondary)]">
                      ещё {(stats?.pointsToNextLevel ?? 0).toLocaleString('ru-RU')} баллов
                    </span>
                  </div>
                  <div className="w-full h-2.5 rounded-full bg-[var(--bg-hover)] overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${progressPercent}%`,
                        backgroundColor: stats?.currentLevel?.color ?? 'var(--accent)',
                      }}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Stats grid */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg p-4">
                <p className="text-xs text-[var(--text-muted)] mb-1">Всего заработано</p>
                <p className="text-xl font-bold text-[var(--text-primary)]">
                  {(stats?.totalEarned ?? 0).toLocaleString('ru-RU')}
                </p>
                <p className="text-xs text-[var(--text-muted)]">баллов</p>
              </div>
              <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg p-4">
                <p className="text-xs text-[var(--text-muted)] mb-1">Всего потрачено</p>
                <p className="text-xl font-bold text-[var(--text-primary)]">
                  {(stats?.totalRedeemed ?? 0).toLocaleString('ru-RU')}
                </p>
                <p className="text-xs text-[var(--text-muted)]">баллов</p>
              </div>
            </div>

            {/* Benefits of current level */}
            {(stats?.currentLevel?.benefits?.length ?? 0) > 0 && (
              <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg p-5">
                <h2 className="font-semibold text-[var(--text-primary)] mb-3">
                  Привилегии уровня «{currentLevelName}»
                </h2>
                <ul className="space-y-2">
                  {(stats?.currentLevel?.benefits ?? []).map((b, i) => (
                    <li key={i} className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                      <span
                        className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                        style={{ backgroundColor: stats?.currentLevel?.color ?? '#6B7280' }}
                      />
                      {b}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Tiers table */}
            {(levels?.length ?? 0) > 0 && (
              <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg overflow-hidden">
                <div className="p-5 pb-3">
                  <h2 className="font-semibold text-[var(--text-primary)]">Все уровни</h2>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-t border-[var(--border)] bg-[var(--bg-primary)]">
                        <th className="px-4 py-2.5 text-left text-[var(--text-muted)] font-medium">Уровень</th>
                        <th className="px-4 py-2.5 text-left text-[var(--text-muted)] font-medium">От (расходов)</th>
                        <th className="px-4 py-2.5 text-left text-[var(--text-muted)] font-medium">Скидка</th>
                        <th className="px-4 py-2.5 text-left text-[var(--text-muted)] font-medium hidden sm:table-cell">Привилегии</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(levels ?? [])
                        .slice()
                        .sort((a, b) => LEVEL_ORDER.indexOf(a.name) - LEVEL_ORDER.indexOf(b.name))
                        .map((lvl) => {
                          const isCurrent = lvl.name === currentLevelName;
                          return (
                            <tr
                              key={lvl.name}
                              className={`border-t border-[var(--border)] ${isCurrent ? 'bg-[var(--accent)]/5' : ''}`}
                            >
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-2">
                                  <span
                                    className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                                    style={{ backgroundColor: lvl.color }}
                                  />
                                  <span className={`font-medium ${isCurrent ? 'text-[var(--text-primary)]' : 'text-[var(--text-secondary)]'}`}>
                                    {lvl.name}
                                  </span>
                                  {isCurrent && (
                                    <span className="text-xs px-1.5 py-0.5 rounded bg-[var(--accent)]/20 text-[var(--accent)]">
                                      текущий
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="px-4 py-3 text-[var(--text-secondary)]">
                                {lvl.minSpent === 0 ? '—' : formatMoney(lvl.minSpent)}
                              </td>
                              <td className="px-4 py-3 text-[var(--text-secondary)]">
                                {lvl.discount === 0 ? '—' : `${(lvl.discount * 100).toFixed(0)}%`}
                              </td>
                              <td className="px-4 py-3 text-[var(--text-secondary)] hidden sm:table-cell">
                                {lvl.benefits.join(', ')}
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Transaction history */}
            {(stats?.transactions?.length ?? 0) > 0 && (
              <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg p-5">
                <h2 className="font-semibold text-[var(--text-primary)] mb-4">История операций</h2>
                <div className="space-y-3">
                  {(stats?.transactions ?? []).slice(0, 20).map((tx) => {
                    const cfg = TX_CONFIG[tx.type] ?? TX_CONFIG.earn;
                    const Icon = cfg.icon;
                    return (
                      <div key={tx.id} className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 bg-[var(--bg-primary)]">
                            <Icon className={`w-4 h-4 ${cfg.className}`} />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm text-[var(--text-primary)] truncate">{tx.description}</p>
                            <p className="text-xs text-[var(--text-muted)]">{formatDate(tx.createdAt)}</p>
                          </div>
                        </div>
                        <span className={`text-sm font-semibold flex-shrink-0 ${cfg.className}`}>
                          {cfg.sign}{tx.amount.toLocaleString('ru-RU')}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* How to earn */}
            <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg p-5">
              <h2 className="font-semibold text-[var(--text-primary)] mb-3">Как копить баллы</h2>
              <ul className="space-y-2 text-sm text-[var(--text-secondary)]">
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] flex-shrink-0 mt-1.5" />
                  <span><strong>1% от суммы тура</strong> — начисляется автоматически после завершения бронирования</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] flex-shrink-0 mt-1.5" />
                  <span><strong>1 балл = 1 рубль</strong> — при оплате следующего тура</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] flex-shrink-0 mt-1.5" />
                  <span>Баллы <strong>действуют 365 дней</strong> с момента начисления</span>
                </li>
              </ul>
            </div>
          </div>
        )}
      </div>
    </Protected>
  );
}
