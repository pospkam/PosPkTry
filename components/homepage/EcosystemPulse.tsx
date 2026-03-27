import { Bot, Shield, Leaf, Users, Brain, Activity } from 'lucide-react';

interface EcosystemStats {
  chatsToday: number;
  activeRoutes: number;
  activeAgents: number;
}

const PLATFORM_PILLARS = [
  {
    icon: Bot,
    label: 'AI Кузьмич',
    desc: 'Персональный оператор',
    color: 'var(--accent)',
  },
  {
    icon: Users,
    label: 'Команда AI',
    desc: '10 AI-агентов в системе',
    color: 'var(--ocean)',
  },
  {
    icon: Shield,
    label: 'SAR Rescue',
    desc: 'Поиск и спасение 24/7',
    color: 'var(--danger)',
  },
  {
    icon: Leaf,
    label: 'Eco-мониторинг',
    desc: 'Нагрузка на природу',
    color: 'var(--success)',
  },
  {
    icon: Brain,
    label: 'AI Lead Processor',
    desc: 'Квалификация заявок',
    color: 'var(--warning)',
  },
];

export default function EcosystemPulse({ stats }: { stats: EcosystemStats }) {
  const liveStats = [
    stats.chatsToday > 0 && { label: 'Диалогов сегодня', value: stats.chatsToday },
    stats.activeRoutes > 0 && { label: 'Маршрутов', value: stats.activeRoutes },
    stats.activeAgents > 0 && { label: 'Агентов активно', value: stats.activeAgents },
  ].filter(Boolean) as Array<{ label: string; value: number }>;

  return (
    <section className="border-y border-[var(--border)] bg-[var(--bg-card)]">
      {/* Platform pillars */}
      <div className="max-w-6xl mx-auto px-5 py-6 overflow-x-auto">
        <div className="flex items-center gap-1 md:gap-0 md:justify-between min-w-max md:min-w-0">
          {PLATFORM_PILLARS.map(({ icon: Icon, label, desc, color }, i) => (
            <div key={label} className="flex items-center">
              <div className="flex items-center gap-3 px-4 py-2">
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ background: `color-mix(in srgb, ${color} 12%, transparent)` }}
                >
                  <Icon className="w-4 h-4" style={{ color }} />
                </div>
                <div>
                  <p className="text-xs font-semibold text-[var(--text-primary)] whitespace-nowrap">{label}</p>
                  <p className="text-[10px] text-[var(--text-muted)] whitespace-nowrap">{desc}</p>
                </div>
              </div>
              {i < PLATFORM_PILLARS.length - 1 && (
                <div className="w-px h-8 bg-[var(--border)] flex-shrink-0" />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Live stats — only if DB has data */}
      {liveStats.length > 0 && (
        <div className="border-t border-[var(--border)] py-3 px-5">
          <div className="max-w-6xl mx-auto flex items-center gap-6 flex-wrap">
            <div className="flex items-center gap-1.5 text-xs text-[var(--text-muted)]">
              <Activity className="w-3 h-3 animate-pulse" style={{ color: 'var(--success)' }} />
              <span>Прямо сейчас:</span>
            </div>
            {liveStats.map(({ label, value }) => (
              <span key={label} className="text-xs text-[var(--text-secondary)]">
                <span className="font-semibold text-[var(--text-primary)]">
                  {value.toLocaleString('ru-RU')}
                </span>
                {' '}
                {label.toLowerCase()}
              </span>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
