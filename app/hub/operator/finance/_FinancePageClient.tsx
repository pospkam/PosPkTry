'use client';

import { Wallet, CreditCard, FileText } from 'lucide-react';

const COMING_SOON = [
  { icon: Wallet,     label: 'Баланс и выплаты' },
  { icon: CreditCard, label: 'История транзакций' },
  { icon: FileText,   label: 'Акты и счета' },
];

export default function FinancePageClient() {
  return (
    <div className="p-6 max-w-2xl">
      <h1 className="text-2xl font-bold text-[var(--text-primary)] mb-1" style={{ fontFamily: 'var(--font-playfair)' }}>
        Финансы
      </h1>
      <p className="text-sm text-[var(--text-muted)] mb-8">
        Раздел в разработке — расчёты и выплаты будут доступны после запуска платёжного модуля.
      </p>

      <div className="space-y-3">
        {COMING_SOON.map(({ icon: Icon, label }) => (
          <div key={label} className="flex items-center gap-3 px-4 py-3 bg-[var(--bg-card)] border border-[var(--border)] rounded-lg">
            <Icon className="w-4 h-4 text-[var(--text-muted)]" />
            <span className="text-sm text-[var(--text-secondary)]">{label}</span>
            <span className="ml-auto text-[10px] uppercase tracking-widest text-[var(--text-muted)] bg-[var(--bg-hover)] px-2 py-0.5 rounded">
              скоро
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
