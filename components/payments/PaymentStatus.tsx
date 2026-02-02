'use client';

import React, { useEffect, useState } from 'react';
import { LoadingSpinner } from '@/components/admin/shared';

interface PaymentStatusProps {
  paymentId: string;
  onSuccess?: () => void;
  onFailure?: () => void;
}

interface PaymentData {
  id: string;
  bookingId: string;
  amount: number;
  currency: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  failureReason?: string;
  completedAt?: Date;
}

export function PaymentStatus({ paymentId, onSuccess, onFailure }: PaymentStatusProps) {
  const [payment, setPayment] = useState<PaymentData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    checkPaymentStatus();
    
    // Проверяем статус каждые 3 секунды, пока платёж в процессе
    const interval = setInterval(() => {
      if (payment?.status === 'processing' || payment?.status === 'pending') {
        checkPaymentStatus();
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [paymentId, payment?.status]);

  const checkPaymentStatus = async () => {
    try {
      const response = await fetch(`/api/payments/${paymentId}/status`);
      const result = await response.json();

      if (result.success) {
        const paymentData = result.data;
        setPayment(paymentData);

        if (paymentData.status === 'completed' && onSuccess) {
          onSuccess();
        } else if (paymentData.status === 'failed' && onFailure) {
          onFailure();
        }
      } else {
        setError(result.error);
      }
    } catch (err) {
      console.error('Error checking payment status:', err);
      setError('Ошибка проверки статуса');
    } finally {
      setLoading(false);
    }
  };

  if (loading && !payment) {
    return (
      <div className="flex items-center justify-center py-10">
        <LoadingSpinner message="Проверка статуса платежа..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-6 text-center">
        <div className="text-5xl mb-4">!</div>
        <h3 className="text-xl font-bold text-white mb-2">Ошибка</h3>
        <p className="text-white/70">{error}</p>
      </div>
    );
  }

  if (!payment) {
    return null;
  }

  const formatCurrency = (value: number, currency: string) => {
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: currency || 'RUB',
      minimumFractionDigits: 0
    }).format(value);
  };

  // Статусы платежа
  if (payment.status === 'completed') {
    return (
      <div className="bg-green-500/10 border border-green-500/30 rounded-2xl p-8 text-center">
        <div className="text-6xl mb-4 animate-bounce">[]</div>
        <h3 className="text-2xl font-bold text-white mb-2">Оплата прошла успешно!</h3>
        <p className="text-white/70 mb-4">
          Бронирование подтверждено
        </p>
        <div className="bg-white/10 rounded-xl p-4 mb-4">
          <p className="text-premium-gold text-2xl font-bold">
            {formatCurrency(payment.amount, payment.currency)}
          </p>
          <p className="text-white/60 text-sm mt-1">
            Платёж #{payment.id.substring(0, 8)}
          </p>
        </div>
        <p className="text-white/60 text-sm">
          Детали бронирования отправлены на ваш email
        </p>
      </div>
    );
  }

  if (payment.status === 'failed') {
    return (
      <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-8 text-center">
        <div className="text-6xl mb-4">[]</div>
        <h3 className="text-2xl font-bold text-white mb-2">Платёж не прошёл</h3>
        <p className="text-white/70 mb-4">
          {payment.failureReason || 'Произошла ошибка при оплате'}
        </p>
        <button
          onClick={() => window.location.reload()}
          className="px-6 py-3 bg-premium-gold hover:bg-premium-gold/80 text-premium-black font-bold rounded-xl transition-colors"
        >
          Попробовать снова
        </button>
      </div>
    );
  }

  if (payment.status === 'processing' || payment.status === 'pending') {
    return (
      <div className="bg-blue-500/10 border border-blue-500/30 rounded-2xl p-8 text-center">
        <div className="text-6xl mb-4">
          <span className="animate-spin inline-block"> </span>
        </div>
        <h3 className="text-2xl font-bold text-white mb-2">Обработка платежа...</h3>
        <p className="text-white/70 mb-4">
          Пожалуйста, подождите. Это может занять несколько секунд.
        </p>
        <LoadingSpinner size="sm" />
      </div>
    );
  }

  return null;
}



