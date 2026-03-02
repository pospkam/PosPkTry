'use client';

import { useEffect, useState } from 'react';
import { Protected } from '@/components/Protected';
import { Route, Plus, Loader2, MapPin, Clock, Banknote, Trash2 } from 'lucide-react';

interface TransferRoute {
  id: string;
  fromLocation: string;
  toLocation: string;
  distanceKm: number;
  durationMinutes: number;
  basePrice: number;
}

export default function RoutesClient() {
  const [loading, setLoading] = useState(true);
  const [routes, setRoutes] = useState<TransferRoute[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ from: '', to: '', distance: '', duration: '', price: '' });

  useEffect(() => {
    // Загрузка маршрутов трансфер-оператора
    setTimeout(() => {
      setRoutes([
        { id: '1', fromLocation: 'Аэропорт Елизово', toLocation: 'Петропавловск-Камчатский', distanceKm: 32, durationMinutes: 40, basePrice: 3000 },
        { id: '2', fromLocation: 'Петропавловск-Камчатский', toLocation: 'Паратунка', distanceKm: 65, durationMinutes: 90, basePrice: 5000 },
        { id: '3', fromLocation: 'Петропавловск-Камчатский', toLocation: 'Начики', distanceKm: 110, durationMinutes: 150, basePrice: 8000 },
      ]);
      setLoading(false);
    }, 500);
  }, []);

  function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    const newRoute: TransferRoute = {
      id: crypto.randomUUID(),
      fromLocation: form.from,
      toLocation: form.to,
      distanceKm: parseFloat(form.distance) || 0,
      durationMinutes: parseInt(form.duration) || 0,
      basePrice: parseFloat(form.price) || 0,
    };
    setRoutes(prev => [...prev, newRoute]);
    setForm({ from: '', to: '', distance: '', duration: '', price: '' });
    setShowForm(false);
  }

  function handleRemove(id: string) {
    setRoutes(prev => prev.filter(r => r.id !== id));
  }

  const inputCls = 'w-full min-h-[44px] px-4 bg-[var(--bg-card)] border border-[var(--border)] rounded-xl text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30';

  return (
    <Protected roles={['transfer_operator', 'transfer', 'admin']}>
      <div className="max-w-5xl mx-auto p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Route className="w-6 h-6 text-[var(--accent)]" />
            <h1 className="text-2xl font-bold text-[var(--text-primary)]">Маршруты</h1>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="min-h-[44px] px-4 py-2 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white rounded-xl font-medium inline-flex items-center gap-2 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Добавить маршрут
          </button>
        </div>

        {showForm && (
          <form onSubmit={handleAdd} className="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl p-5 mb-6 space-y-4">
            <h2 className="text-lg font-semibold text-[var(--text-primary)]">Новый маршрут</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <label className="block">
                <span className="text-sm text-[var(--text-secondary)] mb-1.5 block">Откуда</span>
                <input value={form.from} onChange={e => setForm(p => ({ ...p, from: e.target.value }))} className={inputCls} required placeholder="Аэропорт Елизово" />
              </label>
              <label className="block">
                <span className="text-sm text-[var(--text-secondary)] mb-1.5 block">Куда</span>
                <input value={form.to} onChange={e => setForm(p => ({ ...p, to: e.target.value }))} className={inputCls} required placeholder="Петропавловск-Камчатский" />
              </label>
              <label className="block">
                <span className="text-sm text-[var(--text-secondary)] mb-1.5 block">Расстояние (км)</span>
                <input type="number" value={form.distance} onChange={e => setForm(p => ({ ...p, distance: e.target.value }))} className={inputCls} required />
              </label>
              <label className="block">
                <span className="text-sm text-[var(--text-secondary)] mb-1.5 block">Время (мин)</span>
                <input type="number" value={form.duration} onChange={e => setForm(p => ({ ...p, duration: e.target.value }))} className={inputCls} required />
              </label>
              <label className="block">
                <span className="text-sm text-[var(--text-secondary)] mb-1.5 block">Базовая цена (руб)</span>
                <input type="number" value={form.price} onChange={e => setForm(p => ({ ...p, price: e.target.value }))} className={inputCls} required />
              </label>
            </div>
            <button type="submit" className="min-h-[44px] px-4 py-2 bg-[var(--accent)] text-white rounded-xl font-medium inline-flex items-center gap-2">
              <Plus className="w-4 h-4" /> Добавить
            </button>
          </form>
        )}

        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-[var(--text-muted)]" /></div>
        ) : routes.length === 0 ? (
          <div className="text-center py-16">
            <Route className="w-12 h-12 text-[var(--text-muted)] mx-auto mb-3" />
            <p className="text-[var(--text-secondary)]">Нет маршрутов</p>
            <p className="text-sm text-[var(--text-muted)]">Добавьте первый маршрут трансфера</p>
          </div>
        ) : (
          <div className="space-y-3">
            {routes.map(route => (
              <div key={route.id} className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-4 flex items-center justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 text-[var(--text-primary)] font-medium">
                    <MapPin className="w-4 h-4 text-[var(--accent)]" />
                    {route.fromLocation}
                    <span className="text-[var(--text-muted)]">&rarr;</span>
                    {route.toLocation}
                  </div>
                  <div className="flex items-center gap-4 mt-1.5 text-sm text-[var(--text-secondary)]">
                    <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> {route.distanceKm} km</span>
                    <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {route.durationMinutes} min</span>
                    <span className="flex items-center gap-1 text-[var(--accent)] font-medium"><Banknote className="w-3.5 h-3.5" /> {route.basePrice.toLocaleString('ru-RU')} rub</span>
                  </div>
                </div>
                <button
                  onClick={() => handleRemove(route.id)}
                  className="min-h-[44px] min-w-[44px] p-2 text-[var(--danger)] hover:bg-[var(--danger)]/10 rounded-xl transition-colors"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </Protected>
  );
}
