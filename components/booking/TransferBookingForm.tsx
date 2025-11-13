'use client';

import React, { useState, useEffect } from 'react';
import { TransferDateTimePicker } from './calendars/TransferDateTimePicker';
import { GuestSelector } from './ui/GuestSelector';
import { LoadingSpinner } from '@/components/admin/shared';
import { CloudPaymentsWidget } from '@/components/payments/CloudPaymentsWidget';

interface TransferBookingFormProps {
  routeId: string;
  fromLocation: string;
  toLocation: string;
  pricePerPerson: number;
  onSubmit: (booking: BookingData) => Promise<{ id: string }>;
}

interface BookingData {
  routeId: string;
  departureDate: Date;
  departureTime: string; // HH:MM
  passengers: number;
  totalPrice: number;
  specialRequirements?: string;
}

interface AvailableSchedule {
  time: string; // HH:MM
  available: number; // количество свободных мест
  price: number;
}

export function TransferBookingForm({
  routeId,
  fromLocation,
  toLocation,
  pricePerPerson,
  onSubmit
}: TransferBookingFormProps) {
  const [departureDate, setDepartureDate] = useState<Date | null>(null);
  const [departureTime, setDepartureTime] = useState<string>('09:00');
  const [passengers, setPassengers] = useState(1);
  const [specialRequirements, setSpecialRequirements] = useState('');
  const [schedules, setSchedules] = useState<AvailableSchedule[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [bookingId, setBookingId] = useState<string | null>(null);
  const [paymentId, setPaymentId] = useState<string | null>(null);
  const [showPayment, setShowPayment] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSchedules = async (date: Date) => {
    try {
      setLoading(true);
      setError(null);

      const dateStr = date.toISOString().split('T')[0];
      const response = await fetch(
        `/api/transfers/${routeId}/schedules?date=${dateStr}`
      );

      if (!response.ok) {
        throw new Error('Ошибка при загрузке расписания');
      }

      const result = await response.json();

      if (result.success) {
        setSchedules(result.data.schedules || []);
        // Выбираем первый доступный слот
        if (result.data.schedules && result.data.schedules.length > 0) {
          setDepartureTime(result.data.schedules[0].time);
        }
      } else {
        setError('Нет доступных рейсов на эту дату');
      }
    } catch (err) {
      console.error('Error fetching schedules:', err);
      setError('Ошибка при загрузке расписания');
    } finally {
      setLoading(false);
    }
  };

  const handleDateChange = (date: Date | null) => {
    setDepartureDate(date);
    if (date) {
      fetchSchedules(date);
    }
  };

  const getAvailableSeats = (): number => {
    const schedule = schedules.find(s => s.time === departureTime);
    return schedule ? schedule.available : 0;
  };

  const getPriceForTime = (): number => {
    const schedule = schedules.find(s => s.time === departureTime);
    return schedule ? schedule.price : pricePerPerson;
  };

  const calculateTotalPrice = (): number => {
    return passengers * getPriceForTime();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!departureDate) {
      setError('Пожалуйста, выберите дату отправления');
      return;
    }

    if (passengers === 0) {
      setError('Пожалуйста, добавьте хотя бы одного пассажира');
      return;
    }

    const availableSeats = getAvailableSeats();
    if (passengers > availableSeats) {
      setError(`Недостаточно мест. Доступно: ${availableSeats}`);
      return;
    }

    setSubmitting(true);
    try {
      const booking = await onSubmit({
        routeId,
        departureDate,
        departureTime,
        passengers,
        totalPrice: calculateTotalPrice(),
        specialRequirements: specialRequirements.trim() || undefined
      });

      setBookingId(booking.id);
      setPaymentId(booking.id);
      setShowPayment(true);
    } catch (err) {
      console.error('Error submitting booking:', err);
      setError('Ошибка при создании бронирования');
    } finally {
      setSubmitting(false);
    }
  };

  const handlePaymentSuccess = (transactionId: number) => {
    console.log('Payment successful:', transactionId);
    setError(null);
    // TODO: Редирект на страницу подтверждения
  };

  const handlePaymentFail = (reason: string) => {
    console.error('Payment failed:', reason);
    setError(`Ошибка оплаты: ${reason}`);
    setShowPayment(false);
  };

  const totalPrice = calculateTotalPrice();
  const availableSeats = getAvailableSeats();

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Route Info */}
      <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-white/70 text-sm">От:</p>
            <p className="text-xl font-semibold text-white">{fromLocation}</p>
          </div>
          <div className="text-2xl text-premium-gold">→</div>
          <div>
            <p className="text-white/70 text-sm">До:</p>
            <p className="text-xl font-semibold text-white">{toLocation}</p>
          </div>
        </div>
        <p className="text-premium-gold text-lg font-semibold mt-4">
          {pricePerPerson.toLocaleString('ru-RU')} ₽ за пассажира
        </p>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-500/20 border border-red-500/50 rounded-2xl p-4">
          <p className="text-red-400">{error}</p>
        </div>
      )}

      {/* Date and Time Selection */}
      <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
        <h4 className="text-lg font-semibold text-white mb-4">Время отправления</h4>
        <TransferDateTimePicker
          routeId={routeId}
          fromLocation={fromLocation}
          toLocation={toLocation}
          distance={0} // TODO: Получить из API
          onScheduleSelect={(scheduleId, date, schedule) => {
            setDepartureDate(date);
            setDepartureTime(schedule.departureTime);
          }}
          initialDate={departureDate}
        />

        {/* Available Schedules */}
        {departureDate && schedules.length > 0 && (
          <div className="mt-6 space-y-3">
            <p className="text-white/70 text-sm mb-3">Доступные рейсы:</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {schedules.map((schedule) => (
                <button
                  key={schedule.time}
                  type="button"
                  onClick={() => setDepartureTime(schedule.time)}
                  className={`p-3 rounded-lg transition-colors text-center ${
                    departureTime === schedule.time
                      ? 'bg-premium-gold text-premium-black font-semibold'
                      : 'bg-white/10 hover:bg-white/20 text-white'
                  }`}
                >
                  <p className="font-semibold">{schedule.time}</p>
                  <p className="text-xs mt-1">
                    {schedule.available > 0 
                      ? `${schedule.available} мест` 
                      : 'Нет мест'
                    }
                  </p>
                </button>
              ))}
            </div>
          </div>
        )}

        {departureDate && (
          <div className="mt-4 p-4 bg-green-500/10 border border-green-500/30 rounded-xl">
            <p className="text-green-400">
              [] Дата: {departureDate.toLocaleDateString('ru-RU')}
            </p>
            <p className="text-green-400">
              [] Время: {departureTime}
            </p>
            {availableSeats > 0 && (
              <p className="text-white/70 text-sm mt-2">
                Свободных мест: {availableSeats}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Passengers Selection */}
      <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
        <h4 className="text-lg font-semibold text-white mb-4">Количество пассажиров</h4>
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => setPassengers(Math.max(1, passengers - 1))}
            className="w-12 h-12 bg-white/10 hover:bg-white/20 rounded-lg text-white font-semibold transition-colors"
          >
            −
          </button>
          <div className="flex-1">
            <div className="bg-white/10 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-white">{passengers}</p>
              <p className="text-white/50 text-sm">
                {passengers === 1 ? 'пассажир' : 'пассажиров'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setPassengers(
              Math.min(availableSeats || 10, passengers + 1)
            )}
            disabled={passengers >= (availableSeats || 10)}
            className="w-12 h-12 bg-white/10 hover:bg-white/20 rounded-lg text-white font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            +
          </button>
        </div>
      </div>

      {/* Special Requirements */}
      <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
        <h4 className="text-lg font-semibold text-white mb-4">Особые пожелания</h4>
        <textarea
          value={specialRequirements}
          onChange={(e) => setSpecialRequirements(e.target.value)}
          placeholder="Например: нужна помощь при посадке, путешествую с животным..."
          rows={4}
          className="w-full px-4 py-3 bg-white/10 border border-white/10 rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-premium-gold resize-none"
        />
      </div>

      {/* Price Summary */}
      <div className="bg-gradient-to-r from-premium-gold/20 to-premium-gold/10 border border-premium-gold/30 rounded-2xl p-6">
        <div className="space-y-3 mb-4">
          <div className="flex justify-between items-center">
            <span className="text-white/70">Цена за пассажира:</span>
            <span className="text-white font-semibold">
              {getPriceForTime().toLocaleString('ru-RU')} ₽
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-white/70">Пассажиры ({passengers}):</span>
            <span className="text-white font-semibold">
              {totalPrice.toLocaleString('ru-RU')} ₽
            </span>
          </div>
        </div>
        <div className="border-t border-white/10 pt-4 mt-4">
          <div className="flex justify-between items-center">
            <span className="text-xl font-bold text-white">Итого:</span>
            <span className="text-2xl font-black text-premium-gold">
              {totalPrice.toLocaleString('ru-RU')} ₽
            </span>
          </div>
        </div>
      </div>

      {/* Payment or Submit */}
      {showPayment && bookingId && paymentId ? (
        <div className="space-y-4">
          <CloudPaymentsWidget
            amount={totalPrice}
            currency="RUB"
            description={`Трансфер: ${fromLocation} → ${toLocation}`}
            invoiceId={paymentId}
            accountId="user-id" // TODO: Получить из сессии
            email="user@example.com" // TODO: Получить из сессии
            onSuccess={handlePaymentSuccess}
            onFail={handlePaymentFail}
            buttonText={`Оплатить ${totalPrice.toLocaleString('ru-RU')} ₽`}
          />
          <button
            type="button"
            onClick={() => setShowPayment(false)}
            className="w-full px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors"
          >
            Вернуться к бронированию
          </button>
        </div>
      ) : (
        <button
          type="submit"
          disabled={!departureDate || submitting}
          className="w-full px-8 py-4 bg-premium-gold hover:bg-premium-gold/80 text-premium-black font-bold rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-lg"
        >
          {submitting ? (
            <span className="flex items-center justify-center">
              <span className="animate-spin mr-2"> </span>
              Оформление...
            </span>
          ) : (
            'Забронировать трансфер'
          )}
        </button>
      )}
    </form>
  );
}
