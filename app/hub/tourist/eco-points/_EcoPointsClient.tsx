'use client';

import { useState, useEffect } from 'react';
import { Protected } from '@/components/Protected';
import { Leaf, Loader2, TreePine, Recycle, Camera, Users, Mountain } from 'lucide-react';

// Действия, за которые начисляются эко-баллы
interface EcoAction {
  id: string;
  label: string;
  points: number;
  icon: 'leaf' | 'camera' | 'users' | 'recycle' | 'mountain' | 'tree';
}

const ECO_ACTIONS: EcoAction[] = [
  { id: 'cleanup', label: 'Участие в уборке территории', points: 100, icon: 'recycle' },
  { id: 'multiday', label: 'Завершение многодневного тура', points: 60, icon: 'mountain' },
  { id: 'review', label: 'Оставить отзыв о туре', points: 50, icon: 'leaf' },
  { id: 'helicopter_skip', label: 'Отказ от вертолетной экскурсии', points: 40, icon: 'tree' },
  { id: 'photo', label: 'Загрузить фото тура', points: 30, icon: 'camera' },
  { id: 'group_transfer', label: 'Групповой трансфер вместо личного', points: 20, icon: 'users' },
];

// Текущий баланс и уровень
const CURRENT_POINTS = 350;
const NEXT_LEVEL = 500;

function ActionIcon({ type, className }: { type: EcoAction['icon']; className?: string }) {
  const props = { className };
  switch (type) {
    case 'leaf': return <Leaf {...props} />;
    case 'camera': return <Camera {...props} />;
    case 'users': return <Users {...props} />;
    case 'recycle': return <Recycle {...props} />;
    case 'mountain': return <Mountain {...props} />;
    case 'tree': return <TreePine {...props} />;
    default: return <Leaf {...props} />;
  }
}

export default function EcoPointsClient() {
  const [loading, setLoading] = useState(true);

  // Имитация загрузки данных
  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 500);
    return () => clearTimeout(timer);
  }, []);

  const progressPercent = Math.min((CURRENT_POINTS / NEXT_LEVEL) * 100, 100);

  return (
    <Protected roles={['tourist', 'admin']}>
      <div className="max-w-5xl mx-auto p-6">
        <h1
          className="text-2xl font-semibold mb-6"
          style={{ color: 'var(--text-primary)' }}
        >
          Эко-баллы
        </h1>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2
              className="w-8 h-8 animate-spin"
              style={{ color: 'var(--accent)' }}
            />
          </div>
        ) : (
          <div className="space-y-6">
            {/* Баланс и прогресс */}
            <div
              className="rounded-2xl border p-6 text-center"
              style={{
                backgroundColor: 'var(--bg-card)',
                borderColor: 'var(--border)',
              }}
            >
              <Leaf
                className="w-12 h-12 mx-auto mb-3"
                style={{ color: 'var(--success)' }}
              />
              <p
                className="text-5xl font-bold"
                style={{ color: 'var(--text-primary)' }}
              >
                {CURRENT_POINTS}
              </p>
              <p
                className="text-sm mt-1"
                style={{ color: 'var(--text-muted)' }}
              >
                эко-баллов
              </p>

              {/* Прогресс-бар до следующего уровня */}
              <div className="mt-6 max-w-md mx-auto">
                <div className="flex justify-between text-sm mb-1">
                  <span style={{ color: 'var(--text-secondary)' }}>
                    До следующего уровня
                  </span>
                  <span style={{ color: 'var(--text-secondary)' }}>
                    {CURRENT_POINTS} / {NEXT_LEVEL}
                  </span>
                </div>
                <div
                  className="w-full h-3 rounded-full overflow-hidden"
                  style={{ backgroundColor: 'var(--border)' }}
                >
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${progressPercent}%`,
                      backgroundColor: 'var(--success)',
                    }}
                  />
                </div>
                <p
                  className="text-xs mt-2"
                  style={{ color: 'var(--text-muted)' }}
                >
                  {/* Бонусы за достижение уровня */}
                  500 баллов = скидка 10% на следующий тур
                </p>
              </div>
            </div>

            {/* Список действий для начисления баллов */}
            <div>
              <h2
                className="text-lg font-semibold mb-4"
                style={{ color: 'var(--text-primary)' }}
              >
                Как заработать баллы
              </h2>

              <div className="space-y-3">
                {ECO_ACTIONS.map((action) => (
                  <div
                    key={action.id}
                    className="flex items-center gap-4 rounded-xl border p-4"
                    style={{
                      backgroundColor: 'var(--bg-card)',
                      borderColor: 'var(--border)',
                    }}
                  >
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: 'var(--bg-primary)' }}
                    >
                      <ActionIcon
                        type={action.icon}
                        className="w-5 h-5"
                      />
                    </div>

                    <span
                      className="flex-1 text-sm"
                      style={{ color: 'var(--text-primary)' }}
                    >
                      {action.label}
                    </span>

                    <span
                      className="font-bold text-sm"
                      style={{ color: 'var(--success)' }}
                    >
                      +{action.points}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </Protected>
  );
}
