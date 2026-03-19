'use client';

import { Protected } from '@/components/auth/Protected';
import {
  Award, ArrowUpRight, ArrowDownRight,
  Clock, RotateCcw, Loader2, AlertCircle,
  ShoppingBag, MessageSquare, Camera, UserPlus,
  Zap, Copy, Share2, Check,
} from 'lucide-react';
import { useApiFetch } from '@/hooks/use-api-fetch';
import { useState, useCallback } from 'react';

interface UserLevel {
  name: string;
  minSpent: number;
  discount: number;
  earnMultiplier: number;
  benefits: string[];
  color: string;
}

interface BonusTransaction {
  id: string;
  type: 'earn' | 'redeem' | 'expire' | 'refund';
  source: string;
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
  totalSpent: number;
  transactions: BonusTransaction[];
  referral: {
    code: string | null;
    invited: number;
    completed: number;
    totalEarned: number;
  };
}

const LEVEL_ORDER = ['Новичок', 'Бронза', 'Серебро', 'Золото', 'Платина'];

const TX_CONFIG: Record<string, { icon: typeof ArrowUpRight; label: string; sign: string; cls: string }> = {
  earn:   { icon: ArrowUpRight,  label: 'Начислено', sign: '+', cls: 'text-[var(--success)]' },
  redeem: { icon: ArrowDownRight, label: 'Списано',  sign: '-', cls: 'text-[var(--accent)]' },
  expire: { icon: Clock,          label: 'Сгорело',  sign: '-', cls: 'text-[var(--text-muted)]' },
  refund: { icon: RotateCcw,      label: 'Возврат',  sign: '+', cls: 'text-[var(--ocean)]' },
};

const EARN_WAYS = [
  { icon: ShoppingBag,   label: 'Бронирование тура',    detail: '1% от суммы' },
  { icon: MessageSquare,  label: 'Написать отзыв',      detail: '+50 баллов' },
  { icon: Camera,         label: 'Добавить фото',       detail: '+20 баллов' },
  { icon: UserPlus,       label: 'Пригласить друга',     detail: '+500 баллов' },
  { icon: Zap,            label: 'Первое бронирование',  detail: '+100 баллов' },
];

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
}

function fmtMoney(n: number) {
  return new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 }).format(n);
}

function fmtPoints(n: number) {
  return n.toLocaleString('ru-RU');
}

export default function LoyaltyClient() {
  const { data: stats, loading, error } = useApiFetch<LoyaltyStats>(
    '/api/loyalty/stats',
    undefined,
    { errorMessage: 'Не удалось загрузить данные программы лояльности' },
  );
  const { data: levels } = useApiFetch<UserLevel[]>('/api/loyalty/levels');
  const [copied, setCopied] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [refCode, setRefCode] = useState<string | null>(null);

  const displayRefCode = refCode ?? stats?.referral?.code ?? null;

  const generateCode = useCallback(async () => {
    setGenerating(true);
    try {
      const res = await fetch('/api/loyalty/referral', { method: 'POST' });
      const json = await res.json();
      if (json.success) setRefCode(json.data.code);
    } finally {
      setGenerating(false);
    }
  }, []);

  const copyCode = useCallback(() => {
    if (!displayRefCode) return;
    const url = `https://tourhab.ru/?ref=${displayRefCode}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [displayRefCode]);

  const shareCode = useCallback(() => {
    if (!displayRefCode) return;
    const url = `https://tourhab.ru/?ref=${displayRefCode}`;
    if (navigator.share) {
      navigator.share({ title: 'KamchatourHub', text: 'Присоединяйся к путешествиям по Камчатке и получи бонус', url });
    } else {
      copyCode();
    }
  }, [displayRefCode, copyCode]);

  const currentLevelName = stats?.currentLevel?.name ?? 'Новичок';
  const currentColor = stats?.currentLevel?.color ?? '#6B7280';
  const nextLevel = stats?.nextLevel;

  const progressPercent = nextLevel && stats
    ? Math.min(((stats.totalSpent - (stats.currentLevel?.minSpent ?? 0)) / ((nextLevel.minSpent) - (stats.currentLevel?.minSpent ?? 0))) * 100, 100)
    : stats?.currentLevel?.name === 'Платина' ? 100 : 0;

  return (
    <Protected roles={['tourist', 'admin']}>
      <div className="max-w-3xl mx-auto px-4 py-6 lg:py-8 space-y-5">
        <h1 className="font-playfair text-2xl sm:text-3xl font-bold text-[var(--text-primary)]">
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
          <>
            {/* ── Hero: Current level ── */}
            <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg p-5 sm:p-6">
              <div className="flex items-center gap-4">
                <div
                  className="w-14 h-14 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: `${currentColor}22` }}
                >
                  <Award className="w-7 h-7" style={{ color: currentColor }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-[var(--text-muted)] uppercase tracking-wider">Уровень</p>
                  <p className="text-2xl font-bold font-playfair text-[var(--text-primary)]">
                    {currentLevelName}
                  </p>
                  {(stats?.currentLevel?.discount ?? 0) > 0 && (
                    <p className="text-sm text-[var(--success)]">
                      Скидка {((stats?.currentLevel.discount ?? 0) * 100).toFixed(0)}% на все туры
                    </p>
                  )}
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-3xl font-bold font-playfair text-[var(--text-primary)]">
                    {fmtPoints(stats?.availablePoints ?? 0)}
                  </p>
                  <p className="text-xs text-[var(--text-muted)]">баллов</p>
                </div>
              </div>

              {nextLevel && (
                <div className="mt-5">
                  <div className="flex justify-between text-xs mb-1.5">
                    <span className="text-[var(--text-secondary)]">
                      До <span className="font-medium">{nextLevel.name}</span>
                    </span>
                    <span className="text-[var(--text-secondary)]">
                      {fmtMoney(stats?.pointsToNextLevel ?? 0)}
                    </span>
                  </div>
                  <div className="w-full h-2.5 rounded-full bg-[var(--bg-hover)] overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${progressPercent}%`, backgroundColor: currentColor }}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* ── Stats grid ── */}
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: 'Заработано', value: fmtPoints(stats?.totalEarned ?? 0), sub: 'баллов' },
                { label: 'Потрачено', value: fmtPoints(stats?.totalRedeemed ?? 0), sub: 'баллов' },
                { label: 'Сумма заказов', value: fmtMoney(stats?.totalSpent ?? 0), sub: '' },
              ].map(s => (
                <div key={s.label} className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg p-3.5">
                  <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider mb-1">{s.label}</p>
                  <p className="text-lg font-bold text-[var(--text-primary)]">{s.value}</p>
                  {s.sub && <p className="text-[10px] text-[var(--text-muted)]">{s.sub}</p>}
                </div>
              ))}
            </div>

            {/* ── How to earn ── */}
            <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg p-5">
              <h2 className="font-semibold text-[var(--text-primary)] mb-3">Как заработать баллы</h2>
              <div className="space-y-2.5">
                {EARN_WAYS.map(w => (
                  <div key={w.label} className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-[var(--bg-hover)] flex items-center justify-center flex-shrink-0">
                      <w.icon className="w-4.5 h-4.5 text-[var(--accent)]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-[var(--text-primary)]">{w.label}</p>
                    </div>
                    <span className="text-sm font-medium text-[var(--success)] flex-shrink-0">{w.detail}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* ── Referral program ── */}
            <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg p-5">
              <h2 className="font-semibold text-[var(--text-primary)] mb-3">Реферальная программа</h2>
              {displayRefCode ? (
                <>
                  <div className="flex items-center gap-2 mb-4">
                    <div className="flex-1 px-3.5 py-2.5 bg-[var(--bg-primary)] border border-[var(--border)] rounded-lg font-mono text-sm text-[var(--text-primary)] tracking-wider">
                      {displayRefCode}
                    </div>
                    <button
                      onClick={copyCode}
                      className="p-2.5 bg-[var(--bg-primary)] border border-[var(--border)] rounded-lg hover:border-[var(--accent)] transition-colors"
                      title="Копировать ссылку"
                    >
                      {copied ? <Check className="w-4 h-4 text-[var(--success)]" /> : <Copy className="w-4 h-4 text-[var(--text-muted)]" />}
                    </button>
                    <button
                      onClick={shareCode}
                      className="p-2.5 bg-[var(--bg-primary)] border border-[var(--border)] rounded-lg hover:border-[var(--accent)] transition-colors"
                      title="Поделиться"
                    >
                      <Share2 className="w-4 h-4 text-[var(--text-muted)]" />
                    </button>
                  </div>
                  <div className="grid grid-cols-3 gap-3 text-center">
                    <div>
                      <p className="text-xl font-bold text-[var(--text-primary)]">{stats?.referral.invited ?? 0}</p>
                      <p className="text-[10px] text-[var(--text-muted)] uppercase">Приглашено</p>
                    </div>
                    <div>
                      <p className="text-xl font-bold text-[var(--text-primary)]">{stats?.referral.completed ?? 0}</p>
                      <p className="text-[10px] text-[var(--text-muted)] uppercase">Завершено</p>
                    </div>
                    <div>
                      <p className="text-xl font-bold text-[var(--success)]">{fmtPoints(stats?.referral.totalEarned ?? 0)}</p>
                      <p className="text-[10px] text-[var(--text-muted)] uppercase">Заработано</p>
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-center py-2">
                  <p className="text-sm text-[var(--text-secondary)] mb-3">
                    Приглашайте друзей и получайте 500 баллов за каждого, кто забронирует тур
                  </p>
                  <button
                    onClick={generateCode}
                    disabled={generating}
                    className="px-5 py-2.5 bg-[var(--accent)] text-white text-sm font-medium rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
                  >
                    <UserPlus className="w-4 h-4 inline mr-2 -mt-0.5" />
                    {generating ? 'Генерация...' : 'Получить реферальный код'}
                  </button>
                </div>
              )}
            </div>

            {/* ── Levels table ── */}
            {(levels?.length ?? 0) > 0 && (
              <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg overflow-hidden">
                <div className="p-5 pb-3">
                  <h2 className="font-semibold text-[var(--text-primary)]">Все уровни</h2>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-t border-[var(--border)] bg-[var(--bg-primary)]">
                        <th className="px-4 py-2.5 text-left text-[var(--text-muted)] font-medium text-xs">Уровень</th>
                        <th className="px-4 py-2.5 text-left text-[var(--text-muted)] font-medium text-xs">От (расходов)</th>
                        <th className="px-4 py-2.5 text-left text-[var(--text-muted)] font-medium text-xs">Скидка</th>
                        <th className="px-4 py-2.5 text-left text-[var(--text-muted)] font-medium text-xs hidden sm:table-cell">Привилегии</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(levels ?? [])
                        .slice()
                        .sort((a, b) => LEVEL_ORDER.indexOf(a.name) - LEVEL_ORDER.indexOf(b.name))
                        .map(lvl => {
                          const isCurrent = lvl.name === currentLevelName;
                          return (
                            <tr key={lvl.name} className={`border-t border-[var(--border)] ${isCurrent ? 'bg-[var(--accent)]/5' : ''}`}>
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-2">
                                  <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: lvl.color }} />
                                  <span className={`font-medium ${isCurrent ? 'text-[var(--text-primary)]' : 'text-[var(--text-secondary)]'}`}>
                                    {lvl.name}
                                  </span>
                                  {isCurrent && (
                                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--accent)]/20 text-[var(--accent)]">
                                      текущий
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="px-4 py-3 text-[var(--text-secondary)]">
                                {lvl.minSpent === 0 ? '---' : fmtMoney(lvl.minSpent)}
                              </td>
                              <td className="px-4 py-3 text-[var(--text-secondary)]">
                                {lvl.discount === 0 ? '---' : `${(lvl.discount * 100).toFixed(0)}%`}
                              </td>
                              <td className="px-4 py-3 text-[var(--text-secondary)] hidden sm:table-cell text-xs">
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

            {/* ── Transaction history ── */}
            {(stats?.transactions?.length ?? 0) > 0 && (
              <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg p-5">
                <h2 className="font-semibold text-[var(--text-primary)] mb-4">История операций</h2>
                <div className="space-y-2.5">
                  {(stats?.transactions ?? []).map(tx => {
                    const cfg = TX_CONFIG[tx.type] ?? TX_CONFIG.earn;
                    const Icon = cfg.icon;
                    return (
                      <div key={tx.id} className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 bg-[var(--bg-primary)]">
                            <Icon className={`w-4 h-4 ${cfg.cls}`} />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm text-[var(--text-primary)] truncate">{tx.description}</p>
                            <p className="text-[10px] text-[var(--text-muted)]">{fmtDate(tx.createdAt)}</p>
                          </div>
                        </div>
                        <span className={`text-sm font-semibold flex-shrink-0 ${cfg.cls}`}>
                          {cfg.sign}{fmtPoints(tx.amount)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </Protected>
  );
}
