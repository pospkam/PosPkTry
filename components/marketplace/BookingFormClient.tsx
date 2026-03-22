'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function BookingFormClient({ tourId }: { tourId: number }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    tourist_name: '',
    tourist_email: '',
    tourist_phone: '',
    participants_count: '1',
    special_requests: ''
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/hub/bookings/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tour_id: tourId,
          ...formData,
          participants_count: parseInt(formData.participants_count)
        })
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Не удалось создать бронирование');
      }

      const data = await res.json();
      router.push(`/booking-success/${data.booking_id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="ds-card p-6 max-w-2xl space-y-4">
      <h2 className="ds-h2">Забронировать тур</h2>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="ds-label">Имя *</label>
          <input
            type="text"
            name="tourist_name"
            value={formData.tourist_name}
            onChange={handleChange}
            className="ds-input w-full"
            required
          />
        </div>

        <div>
          <label className="ds-label">Email *</label>
          <input
            type="email"
            name="tourist_email"
            value={formData.tourist_email}
            onChange={handleChange}
            className="ds-input w-full"
            required
          />
        </div>
      </div>

      <div>
        <label className="ds-label">Телефон *</label>
        <input
          type="tel"
          name="tourist_phone"
          value={formData.tourist_phone}
          onChange={handleChange}
          className="ds-input w-full"
          required
        />
      </div>

      <div>
        <label className="ds-label">Количество участников *</label>
        <select
          name="participants_count"
          value={formData.participants_count}
          onChange={handleChange}
          className="ds-input w-full"
        >
          {[1, 2, 3, 4, 5, 6, 8, 10].map(n => (
            <option key={n} value={n}>{n} {n === 1 ? 'человек' : 'человек'}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="ds-label">Особые пожелания</label>
        <textarea
          name="special_requests"
          value={formData.special_requests}
          onChange={handleChange}
          className="ds-input w-full"
          style={{ minHeight: '100px' }}
          placeholder="Дополнительная информация для оператора..."
        />
      </div>

      {error && (
        <div className="bg-[var(--danger)] bg-opacity-10 border border-[var(--danger)] text-[var(--danger)] p-3 rounded text-sm">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="ds-btn ds-btn-primary w-full"
      >
        {loading ? 'Бронирую...' : 'Забронировать и оплатить'}
      </button>

      <p className="text-xs text-[var(--text-muted)] text-center">
        После подтверждения вы сможете оплатить через CloudPayments
      </p>
    </form>
  );
}
