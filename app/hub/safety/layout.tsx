import { Metadata } from 'next';
import { ReactNode } from 'react';

export const metadata: Metadata = {
  title: 'Безопасность | Kamchatour',
  description: 'Панель безопасности и мониторинга.',
  robots: 'noindex, nofollow',
};

export default function SafetyLayout({ children }: { children: ReactNode }) {
  return children;
}
