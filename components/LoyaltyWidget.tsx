'use client';
import React, { useState, useEffect } from 'react';
import { LoyaltyStats, UserLevel } from '@/lib/loyalty/loyalty-system';

interface LoyaltyWidgetProps {
  userId: string;
  className?: string;
}

export function LoyaltyWidget({ userId, className }: LoyaltyWidgetProps) {
  const [stats, setStats] = useState<LoyaltyStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [promoCode, setPromoCode] = useState('');
  const [promoResult, setPromoResult] = useState<{
    success: boolean;
    message: string;
    discountAmount?: number;
  } | null>(null);

  useEffect(() => {
    loadLoyaltyStats();
  }, [userId]);

  const loadLoyaltyStats = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/loyalty/stats?userId=${userId}`);
      const data = await response.json();
      
      if (data.success) {
        setStats(data.data);
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError('Ошибка загрузки данных лояльности');
    } finally {
      setLoading(false);
    }
  };

  const handlePromoCodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!promoCode.trim()) return;

    try {
      const response = await fetch('/api/loyalty/promo/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: promoCode,
          userId,
          orderAmount: 1000 // Заглушка, в реальном приложении передавать сумму заказа
        })
      });

      const data = await response.json();
      setPromoResult(data);
      
      if (data.success) {
        setPromoCode('');
        loadLoyaltyStats(); // Обновляем статистику
      }
    } catch (err) {
      setPromoResult({
        success: false,
        message: 'Ошибка применения промокода'
      });
    }
  };

  if (loading) {
    return (
      <div className={`bg-premium-black/90 backdrop-blur-sm rounded-2xl p-6 border border-premium-gold/20 ${className}`}>
        <div className="animate-pulse">
          <div className="h-6 bg-premium-gold/20 rounded mb-4"></div>
          <div className="h-4 bg-premium-gold/10 rounded mb-2"></div>
          <div className="h-4 bg-premium-gold/10 rounded mb-2"></div>
          <div className="h-4 bg-premium-gold/10 rounded"></div>
        </div>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className={`bg-premium-black/90 backdrop-blur-sm rounded-2xl p-6 border border-premium-gold/20 ${className}`}>
        <div className="text-center text-white/70">
          <p>Ошибка загрузки данных лояльности</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-premium-black/90 backdrop-blur-sm rounded-2xl p-6 border border-premium-gold/20 ${className}`}>
      {/* Заголовок */}
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-bold text-white">Система лояльности</h3>
        <div className={`px-3 py-1 rounded-full text-sm font-medium`} 
             style={{ backgroundColor: stats.currentLevel.color + '20', color: stats.currentLevel.color }}>
          {stats.currentLevel.name}
        </div>
      </div>

      {/* Текущий уровень и прогресс */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-2">
          <span className="text-white/70">Текущий уровень</span>
          <span className="text-premium-gold font-bold">{stats.currentLevel.name}</span>
        </div>
        
        {stats.nextLevel && (
          <>
            <div className="w-full bg-white/10 rounded-full h-2 mb-2">
              <div 
                className="bg-premium-gold h-2 rounded-full transition-all duration-300"
                style={{ 
                  width: `${Math.min(100, (stats.totalPoints / stats.nextLevel.minSpent) * 100)}%` 
                }}
              ></div>
            </div>
            <div className="flex justify-between text-sm text-white/70">
              <span>До {stats.nextLevel.name}</span>
              <span>{stats.pointsToNextLevel} руб.</span>
            </div>
          </>
        )}
      </div>

      {/* Баллы */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-white/5 rounded-xl p-4">
          <div className="text-2xl font-bold text-premium-gold">{stats.availablePoints}</div>
          <div className="text-sm text-white/70">Доступно баллов</div>
        </div>
        <div className="bg-white/5 rounded-xl p-4">
          <div className="text-2xl font-bold text-white">{stats.currentLevel.discount * 100}%</div>
          <div className="text-sm text-white/70">Скидка</div>
        </div>
      </div>

      {/* Преимущества уровня */}
      <div className="mb-6">
        <h4 className="text-white font-semibold mb-3">Преимущества уровня</h4>
        <div className="space-y-2">
          {stats.currentLevel.benefits.map((benefit) => (
            <div key={benefit} className="flex items-center text-white/70">
              <div className="w-2 h-2 bg-premium-gold rounded-full mr-3"></div>
              <span className="text-sm">{benefit}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Промокод */}
      <div className="mb-6">
        <h4 className="text-white font-semibold mb-3">Промокод</h4>
        <form onSubmit={handlePromoCodeSubmit} className="flex gap-2">
          <input
            type="text"
            value={promoCode}
            onChange={(e) => setPromoCode(e.target.value)}
            placeholder="Введите промокод"
            className="flex-1 px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:border-premium-gold"
          />
          <button
            type="submit"
            className="px-6 py-2 bg-premium-gold text-premium-black font-bold rounded-lg hover:bg-premium-gold/90 transition-colors"
          >
            Применить
          </button>
        </form>
        
        {promoResult && (
          <div className={`mt-2 p-3 rounded-lg text-sm ${
            promoResult.success 
              ? 'bg-green-500/20 text-green-400' 
              : 'bg-red-500/20 text-red-400'
          }`}>
            {promoResult.message}
            {promoResult.discountAmount && (
              <div className="font-bold">Скидка: {promoResult.discountAmount} руб.</div>
            )}
          </div>
        )}
      </div>

      {/* Последние транзакции */}
      <div>
        <h4 className="text-white font-semibold mb-3">Последние операции</h4>
        <div className="space-y-2 max-h-32 overflow-y-auto">
          {stats.transactions.slice(0, 5).map((transaction) => (
            <div key={transaction.id} className="flex justify-between items-center text-sm">
              <span className="text-white/70 truncate flex-1 mr-2">
                {transaction.description}
              </span>
              <span className={`font-medium ${
                transaction.type === 'earn' 
                  ? 'text-green-400' 
                  : transaction.type === 'redeem'
                  ? 'text-red-400'
                  : 'text-white/50'
              }`}>
                {transaction.type === 'earn' ? '+' : transaction.type === 'redeem' ? '-' : ''}
                {transaction.amount}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Компонент для отображения уровней лояльности
export function LoyaltyLevels({ className }: { className?: string }) {
  const [levels, setLevels] = useState<UserLevel[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadLevels();
  }, []);

  const loadLevels = async () => {
    try {
      const response = await fetch('/api/loyalty/levels');
      const data = await response.json();
      
      if (data.success) {
        setLevels(data.data);
      }
    } catch (err) {
      console.error('Error loading levels:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className={`bg-premium-black/90 backdrop-blur-sm rounded-2xl p-6 border border-premium-gold/20 ${className}`}>
        <div className="animate-pulse space-y-4">
          {[1, 2, 3, 4, 5].map((index) => (
            <div key={`skeleton-${index}`} className="h-16 bg-premium-gold/10 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-premium-black/90 backdrop-blur-sm rounded-2xl p-6 border border-premium-gold/20 ${className}`}>
      <h3 className="text-xl font-bold text-white mb-6">Уровни лояльности</h3>
      
      <div className="space-y-4">
        {levels.map((level) => (
          <div key={level.name} className="flex items-center justify-between p-4 rounded-xl" 
               style={{ backgroundColor: level.color + '10' }}>
            <div className="flex items-center">
              <div className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold mr-4"
                   style={{ backgroundColor: level.color }}>
                {levels.indexOf(level) + 1}
              </div>
              <div>
                <div className="text-white font-semibold">{level.name}</div>
                <div className="text-white/70 text-sm">
                  От {level.minSpent.toLocaleString()} руб.
                </div>
              </div>
            </div>
            
            <div className="text-right">
              <div className="text-premium-gold font-bold">
                {level.discount * 100}% скидка
              </div>
              <div className="text-white/70 text-sm">
                {level.benefits.length} преимуществ
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default LoyaltyWidget;