'use client';

import { useCart } from '@/contexts/CartContext';
import { useRouter } from 'next/navigation';
import { ShoppingCart, Trash2, ArrowRight, Package, Fish, Mountain, PawPrint, Plane, Thermometer, Footprints, Snowflake, Anchor, Leaf, Flame, Waves } from 'lucide-react';
import Image from 'next/image';

const ACTIVITY_ICONS: Record<string, React.ElementType> = {
  fishing:    Fish,
  trekking:   Footprints,
  helicopter: Plane,
  bears:      PawPrint,
  snowmobile: Snowflake,
  boat_trip:  Anchor,
  thermal:    Thermometer,
  eco:        Leaf,
  volcano:    Flame,
  mountain:   Mountain,
  river:      Waves,
};

const ACTIVITY_LABELS: Record<string, string> = {
  fishing:    'Рыбалка',
  trekking:   'Треккинг',
  helicopter: 'Вертолёт',
  bears:      'Медведи',
  snowmobile: 'Снегоходы',
  boat_trip:  'Морская прогулка',
  thermal:    'Термальные',
  eco:        'Экотуризм',
  volcano:    'Вулкан',
  mountain:   'Горы',
  river:      'Реки',
};

export default function CartClient() {
  const { items, remove, clear, count } = useCart();
  const router = useRouter();

  const total = items.reduce((sum, i) => sum + i.price, 0);

  if (count === 0) {
    return (
      <div className="ds-page pt-20 pb-16">
        <div className="max-w-xl mx-auto text-center py-24 space-y-4">
          <ShoppingCart className="w-12 h-12 mx-auto text-[var(--text-muted)]" />
          <h1 className="ds-h2">Корзина пуста</h1>
          <p className="text-[var(--text-secondary)] text-sm">
            Добавляйте туры из каталога и возвращайтесь сюда для бронирования
          </p>
          <button onClick={() => router.push('/marketplace')} className="ds-btn ds-btn-primary px-6 py-2.5">
            Перейти в каталог
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="ds-page pt-20 pb-16">
      <div className="max-w-2xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="ds-h1">Корзина</h1>
            <p className="text-[var(--text-secondary)] text-sm mt-0.5">{count} {plural(count)}</p>
          </div>
          <button onClick={clear} className="ds-btn ds-btn-secondary text-sm flex items-center gap-1.5">
            <Trash2 className="w-3.5 h-3.5" />
            Очистить
          </button>
        </div>

        {/* Items */}
        <div className="space-y-3">
          {items.map(item => {
            const Icon = ACTIVITY_ICONS[item.activityType] ?? Package;
            return (
              <div key={item.tourId} className="ds-card rounded-lg flex gap-4 p-4">
                {/* Image */}
                <div className="w-20 h-20 rounded-lg overflow-hidden shrink-0 bg-[var(--bg-hover)] flex items-center justify-center">
                  {item.image ? (
                    <Image src={item.image} alt={item.title} width={80} height={80} className="w-full h-full object-cover" />
                  ) : (
                    <Icon className="w-7 h-7 text-[var(--text-muted)]" />
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-[var(--text-primary)] leading-snug line-clamp-2" style={{ fontFamily: 'var(--font-playfair)' }}>
                    {item.title}
                  </p>
                  <p className="text-xs text-[var(--text-muted)] mt-0.5">{item.operatorName}</p>
                  <div className="flex items-center gap-2 mt-1.5">
                    <span className="text-xs px-2 py-0.5 rounded-full bg-[var(--bg-hover)] text-[var(--text-secondary)] flex items-center gap-1">
                      <Icon className="w-3 h-3" />
                      {ACTIVITY_LABELS[item.activityType] ?? item.activityType}
                    </span>
                    <span className="font-bold text-[var(--accent)] text-sm">
                      от {item.price.toLocaleString('ru-RU')} ₽
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-col items-end justify-between shrink-0">
                  <button onClick={() => remove(item.tourId)} className="text-[var(--text-muted)] hover:text-[var(--danger)] transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => router.push(`/marketplace/tours/${item.tourId}`)}
                    className="ds-btn ds-btn-primary px-3 py-1.5 text-xs flex items-center gap-1"
                  >
                    Забронировать
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Summary */}
        <div className="ds-card rounded-lg p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[var(--text-secondary)] text-sm">Итого туров</span>
            <span className="font-semibold text-[var(--text-primary)]">{count} {plural(count)}</span>
          </div>
          <div className="flex items-center justify-between border-t border-[var(--border)] pt-3">
            <span className="text-[var(--text-secondary)] text-sm">Сумма (от)</span>
            <span className="text-lg font-bold text-[var(--accent)]">{total.toLocaleString('ru-RU')} ₽</span>
          </div>
          <p className="text-xs text-[var(--text-muted)]">
            Точная стоимость зависит от выбранных дат и числа участников
          </p>
          <button
            onClick={() => router.push('/planner')}
            className="w-full ds-btn ds-btn-secondary py-2.5 flex items-center justify-center gap-2 text-sm"
          >
            <Package className="w-4 h-4" />
            Составить маршрут из этих туров
          </button>
        </div>

      </div>
    </div>
  );
}

function plural(n: number) {
  const m = n % 10, c = n % 100;
  if (c >= 11 && c <= 14) return 'туров';
  if (m === 1) return 'тур';
  if (m >= 2 && m <= 4) return 'тура';
  return 'туров';
}
