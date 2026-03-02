import { ReactNode } from 'react';

/**
 * PageWrapper -- obolyochka kontenta stranicy.
 * Fon i tekst nasleduyutsya ot body (var(--bg-primary), var(--text-primary)).
 * Dobavlyaet nizhyj padding na mobile dlya MobileNav.
 */
export function PageWrapper({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen pb-16 md:pb-0">
      {children}
    </div>
  );
}
