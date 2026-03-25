import { MessageSquare, Route, Bot } from 'lucide-react';

interface EcosystemStats {
  chatsToday: number;
  activeRoutes: number;
  activeAgents: number;
}

export default function EcosystemPulse({ stats }: { stats: EcosystemStats }) {
  const items = [
    { icon: MessageSquare, label: 'Диалогов сегодня', value: stats.chatsToday },
    { icon: Route, label: 'Активных маршрутов', value: stats.activeRoutes },
    { icon: Bot, label: 'AI-агентов работает', value: stats.activeAgents },
  ];

  return (
    <section className="py-8 px-5 border-y border-[var(--border)] bg-[var(--bg-card)]">
      <div className="max-w-4xl mx-auto flex items-center justify-center gap-8 md:gap-16 flex-wrap">
        {items.map(({ icon: Icon, label, value }) => (
          <div key={label} className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-[var(--accent)]/10 flex items-center justify-center">
              <Icon className="w-4 h-4 text-[var(--accent)]" />
            </div>
            <div>
              <p className="text-lg font-bold text-[var(--text-primary)] leading-none">
                {value > 0 ? value.toLocaleString('ru-RU') : '--'}
              </p>
              <p className="text-[10px] text-[var(--text-muted)] mt-0.5">{label}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
