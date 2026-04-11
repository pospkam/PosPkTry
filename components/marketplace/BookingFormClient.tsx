'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Calendar, Users, Phone, Mail, User, ChevronRight } from 'lucide-react';

interface BookingFormProps {
  tourId: number;
  basePrice: number;
  maxParticipants?: number;
  tourTitle?: string;
}

function formatPrice(p: number): string {
  return new Intl.NumberFormat('ru-RU').format(p) + ' ₽';
}

// Минимальная дата — завтра
function minDate(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().split('T')[0];
}

export default function BookingFormClient({ tourId, basePrice, maxParticipants = 10, tourTitle }: BookingFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    tourist_name: '',
    tourist_email: '',
    tourist_phone: '',
    participants_count: '1',
    booking_date: '',
    special_requests: '',
  });

  const participants = parseInt(formData.participants_count) || 1;
  const totalPrice = basePrice * participants;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.booking_date) {
      setError('Выберите дату заезда');
      return;
    }
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/hub/bookings/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tour_id: tourId,
          ...formData,
          participants_count: participants,
        }),
      });

      const data: unknown = await res.json();
      if (!res.ok) {
        const msg = typeof data === 'object' && data !== null && 'error' in data
          ? String((data as Record<string, unknown>).error)
          : 'Не удалось создать бронирование';
        throw new Error(msg);
      }

      const id = typeof data === 'object' && data !== null && 'booking_id' in data
        ? (data as Record<string, unknown>).booking_id
        : null;
      if (!id) throw new Error('Бронирование создано, но ID не получен. Проверьте раздел «Бронирования».');
      router.push(`/booking-success/${id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка');
    } finally {
      setLoading(false);
    }
  };

  const maxOpts = Math.min(maxParticipants, 12);

  return (
    <form onSubmit={handleSubmit} className="ds-card p-6 space-y-5">
      <div>
        <h2 className="ds-h2 mb-0.5">Оставить заявку на тур</h2>
        {tourTitle && <p className="text-sm text-[var(--text-secondary)]">{tourTitle}</p>}
        <p className="text-xs text-[var(--text-muted)] mt-2">
          Сначала фиксируем заявку и детали поездки. Финальные условия участия подтверждаются перед оплатой.
        </p>
      </div>

      {/* Дата — первое поле */}
      <div>
        <label className="ds-label flex items-center gap-1.5 mb-1.5">
          <Calendar className="w-3.5 h-3.5" />
          Дата заезда *
        </label>
        <input
          type="date"
          name="booking_date"
          value={formData.booking_date}
          onChange={handleChange}
          min={minDate()}
          className="ds-input w-full"
          required
        />
      </div>

      {/* Участники */}
      <div>
        <label className="ds-label flex items-center gap-1.5 mb-1.5">
          <Users className="w-3.5 h-3.5" />
          Количество участников *
        </label>
        <select
          name="participants_count"
          value={formData.participants_count}
          onChange={handleChange}
          className="ds-input w-full"
        >
          {Array.from({ length: maxOpts }, (_, i) => i + 1).map(n => (
            <option key={n} value={n}>{n} {n === 1 ? 'человек' : n < 5 ? 'человека' : 'человек'}</option>
          ))}
        </select>
      </div>

      {/* Контакты */}
      <div className="grid grid-cols-1 gap-4">
        <div>
          <label className="ds-label flex items-center gap-1.5 mb-1.5">
            <User className="w-3.5 h-3.5" />
            Имя *
          </label>
          <input
            type="text"
            name="tourist_name"
            value={formData.tourist_name}
            onChange={handleChange}
            placeholder="Иван Иванов"
            className="ds-input w-full"
            required
          />
        </div>
        <div>
          <label className="ds-label flex items-center gap-1.5 mb-1.5">
            <Phone className="w-3.5 h-3.5" />
            Телефон *
          </label>
          <input
            type="tel"
            name="tourist_phone"
            value={formData.tourist_phone}
            onChange={handleChange}
            placeholder="+7 900 000 00 00"
            className="ds-input w-full"
            required
          />
        </div>
        <div>
          <label className="ds-label flex items-center gap-1.5 mb-1.5">
            <Mail className="w-3.5 h-3.5" />
            Email *
          </label>
          <input
            type="email"
            name="tourist_email"
            value={formData.tourist_email}
            onChange={handleChange}
            placeholder="ivan@example.com"
            className="ds-input w-full"
            required
          />
        </div>
      </div>

      <div>
        <label className="ds-label mb-1.5">Пожелания оператору</label>
        <textarea
          name="special_requests"
          value={formData.special_requests}
          onChange={handleChange}
          className="ds-input w-full resize-none"
          rows={3}
          placeholder="Особые пожелания, вопросы по снаряжению..."
        />
      </div>

      {error && (
        <div className="bg-[var(--danger)] bg-opacity-10 border border-[var(--danger)] text-[var(--danger)] p-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      <p className="text-xs text-[var(--text-muted)]">
        Отправляя заявку, вы понимаете, что даты, наличие мест и точная стоимость уточняются перед оплатой.
      </p>

      {/* Итог */}
      <div className="border-t border-[var(--border)] pt-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-sm text-[var(--text-muted)]">
              {formatPrice(basePrice)} × {participants} чел.
            </p>
            <p className="text-2xl font-bold text-[var(--text-primary)]">
              {formatPrice(totalPrice)}
            </p>
          </div>
          <button
            type="submit"
            disabled={loading || !formData.booking_date}
            className="ds-btn ds-btn-primary flex items-center gap-2 px-6"
          >
            {loading ? (
              <span className="animate-spin rounded-full h-4 w-4 border border-white border-t-transparent" />
            ) : (
              <>
                Оставить заявку
                <ChevronRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
        <p className="text-xs text-[var(--text-muted)]">
          После создания заявки откроется страница бронирования с дальнейшими шагами. Оператор получит уведомление автоматически.
        </p>
      </div>
    </form>
  );
}
