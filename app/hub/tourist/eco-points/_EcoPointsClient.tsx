'use client';

import { Protected } from '@/components/auth/Protected';
import { Leaf, Loader2, TreePine, Recycle, Camera, Users, Mountain } from 'lucide-react';
import { useApiFetch } from '@/hooks/use-api-fetch';

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
  const { data: currentPoints, loading, error } = useApiFetch<
    { totalPoints?: number },
    number
  >(
    '/api/eco-points/user',
    (d) => d?.totalPoints ?? 0,
    { errorMessage: 'Не удалось загрузить эко-баллы' },
  );

  const points = currentPoints ?? 0;
  const progressPercent = Math.min((points / NEXT_LEVEL) * 100, 100);

  return (
    <Protected roles={['tourist', 'admin']}>
      <div className="max-w-5xl mx-auto px-4 py-6 lg:py-8">
        <h1 className="font-playfair text-2xl sm:text-3xl font-bold text-[var(--text-primary)] mb-6">
          Эко-баллы
        </h1>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-[var(--accent)]" />
          </div>
        ) : (
          <div className="space-y-6">
            {/* Balance and progress */}
            <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg p-6 text-center">
              <Leaf className="w-12 h-12 mx-auto mb-3 text-[var(--success)]" />
              <p className={`text-5xl font-bold font-playfair ${error ? 'text-[var(--danger)]' : 'text-[var(--text-primary)]'}`}>
                {error ? '—' : points}
              </p>
              <p className="text-sm mt-1 text-[var(--text-muted)]">
                {error ? error : 'эко-баллов'}
              </p>

              {!error && (
                <div className="mt-6 max-w-md mx-auto">
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-[var(--text-secondary)]">
                      До следующего уровня
                    </span>
                    <span className="text-[var(--text-secondary)]">
                      {points} / {NEXT_LEVEL}
                    </span>
                  </div>
                  <div className="w-full h-3 rounded-full overflow-hidden bg-[var(--border)]">
                    <div
                      className="h-full rounded-full transition-all bg-[var(--success)]"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                  <p className="text-xs mt-2 text-[var(--text-muted)]">
                    500 баллов = скидка 10% на следующий тур
                  </p>
                </div>
              )}
            </div>

            {/* Action list */}
            <div>
              <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4">
                Как заработать баллы
              </h2>

              <div className="space-y-3">
                {ECO_ACTIONS.map((action) => (
                  <div
                    key={action.id}
                    className="flex items-center gap-4 bg-[var(--bg-card)] border border-[var(--border)] rounded-lg p-4"
                  >
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 bg-[var(--bg-primary)]">
                      <ActionIcon type={action.icon} className="w-5 h-5" />
                    </div>

                    <span className="flex-1 text-sm text-[var(--text-primary)]">
                      {action.label}
                    </span>

                    <span className="font-bold text-sm text-[var(--success)]">
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
