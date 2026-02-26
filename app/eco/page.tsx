import { Metadata } from 'next';
import { Leaf, TreePine, Award, TrendingUp } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Экология | Kamchatour',
  description: 'Эко-баллы Kamchatour: зарабатывайте баллы за экологичные решения, сажайте деревья, снижайте углеродный след.',
  alternates: { canonical: 'https://kamchatourhub.ru/eco' },
};

const ECO_ACTIONS = [
  { action: 'Оставить отзыв', points: 50, icon: Award },
  { action: 'Загрузить фото тура', points: 30, icon: TrendingUp },
  { action: 'Групповой трансфер вместо личного', points: 20, icon: Leaf },
  { action: 'Отказ от вертолётной экскурсии', points: 40, icon: TreePine },
  { action: 'Участие в уборке территории', points: 100, icon: Leaf },
  { action: 'Многодневный тур (меньше переездов)', points: 60, icon: TreePine },
];

export default function EcoPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex items-center gap-3 mb-6">
        <Leaf className="w-8 h-8 text-[var(--success)]" />
        <h1 className="text-3xl font-bold text-[var(--text-primary)]">Экология</h1>
      </div>

      <p className="text-[var(--text-secondary)] mb-8 max-w-2xl">
        Зарабатывайте эко-баллы за экологичные решения. 100 баллов = посаженное дерево.
        500 баллов = скидка 10% на следующий тур.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        <div className="bg-[var(--success)]/10 border border-[var(--success)]/30 rounded-[var(--radius-lg)] p-6 text-center">
          <TreePine className="w-10 h-10 text-[var(--success)] mx-auto mb-2" />
          <p className="text-2xl font-bold text-[var(--text-primary)]">10 000</p>
          <p className="text-sm text-[var(--text-secondary)]">Деревьев к концу 2026</p>
        </div>
        <div className="bg-[var(--accent-muted)] border border-[var(--accent)]/30 rounded-[var(--radius-lg)] p-6 text-center">
          <Leaf className="w-10 h-10 text-[var(--accent)] mx-auto mb-2" />
          <p className="text-2xl font-bold text-[var(--text-primary)]">50 тонн</p>
          <p className="text-sm text-[var(--text-secondary)]">CO2 сэкономлено</p>
        </div>
      </div>

      <h2 className="text-xl font-bold text-[var(--text-primary)] mb-4">Как заработать эко-баллы</h2>
      <div className="space-y-3">
        {ECO_ACTIONS.map(item => {
          const Icon = item.icon;
          return (
            <div
              key={item.action}
              className="flex items-center justify-between bg-[var(--bg-card)] border border-[var(--border)] rounded-[var(--radius-md)] p-4 min-h-[44px]"
            >
              <div className="flex items-center gap-3">
                <Icon className="w-5 h-5 text-[var(--success)]" />
                <span className="text-[var(--text-primary)]">{item.action}</span>
              </div>
              <span className="text-sm font-bold text-[var(--success)]">+{item.points}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
