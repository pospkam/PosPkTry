'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus } from 'lucide-react';

export default function AddTourClient() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    base_price: '',
    location: '',
    activity_type: 'trekking',
    location_type: 'mountain'
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess(false);

    try {
      const res = await fetch('/api/hub/operator/tours', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          base_price: parseInt(formData.base_price)
        })
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Не удалось добавить тур');
      }

      setSuccess(true);
      setFormData({
        title: '',
        description: '',
        base_price: '',
        location: '',
        activity_type: 'trekking',
        location_type: 'mountain'
      });

      setTimeout(() => {
        router.push('/hub/operator/tours');
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-2xl">
      <div className="flex items-center gap-3 mb-6">
        <Plus className="w-6 h-6 text-[var(--accent)]" />
        <h1 className="ds-h1">Добавить новый тур</h1>
      </div>

      <form onSubmit={handleSubmit} className="ds-card p-6 space-y-4">
        <div>
          <label className="ds-label">Название тура *</label>
          <input
            type="text"
            name="title"
            value={formData.title}
            onChange={handleChange}
            className="ds-input w-full"
            placeholder="Вулкан Авачинский - 1 день"
            required
          />
        </div>

        <div>
          <label className="ds-label">Описание *</label>
          <textarea
            name="description"
            value={formData.description}
            onChange={handleChange}
            className="ds-input w-full" style={{ minHeight: '120px' }}
            placeholder="Опиши, что входит в тур, сложность, длительность..."
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="ds-label">Цена (₽) *</label>
            <input
              type="number"
              name="base_price"
              value={formData.base_price}
              onChange={handleChange}
              className="ds-input w-full"
              placeholder="5000"
              required
            />
          </div>

          <div>
            <label className="ds-label">Место *</label>
            <input
              type="text"
              name="location"
              value={formData.location}
              onChange={handleChange}
              className="ds-input w-full"
              placeholder="Петропавловск-Камчатский"
              required
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="ds-label">Тип активности</label>
            <select
              name="activity_type"
              value={formData.activity_type}
              onChange={handleChange}
              className="ds-input w-full"
            >
              <option value="trekking">Трекинг</option>
              <option value="fishing">Рыбалка</option>
              <option value="rafting">Сплав по реке</option>
              <option value="thermal">Горячие источники</option>
              <option value="helicopter">Вертолёт</option>
              <option value="boat_trip">Морской тур</option>
            </select>
          </div>

          <div>
            <label className="ds-label">Место</label>
            <select
              name="location_type"
              value={formData.location_type}
              onChange={handleChange}
              className="ds-input w-full"
            >
              <option value="mountain">Гора</option>
              <option value="volcano">Вулкан</option>
              <option value="river">Река</option>
              <option value="hot_spring">Горячий источник</option>
              <option value="lake">Озеро</option>
              <option value="sea">Море</option>
            </select>
          </div>
        </div>

        {error && (
          <div className="bg-[var(--danger)] bg-opacity-10 border border-[var(--danger)] text-[var(--danger)] p-3 rounded text-sm">
            {error}
          </div>
        )}

        {success && (
          <div className="bg-[var(--success)] bg-opacity-10 border border-[var(--success)] text-[var(--success)] p-3 rounded text-sm">
            ✅ Тур добавлен! Сейчас откроется список твоих туров...
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="ds-btn ds-btn-primary w-full"
        >
          {loading ? 'Добавляю...' : 'Добавить тур'}
        </button>
      </form>
    </div>
  );
}
