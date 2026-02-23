import { Metadata } from 'next';
import { ReactNode } from 'react';

export const metadata: Metadata = {
  title: 'Агент | Kamchatour',
  description: 'Кабинет агента по турам на Камчатке.',
  robots: 'noindex, nofollow',
};

export default function AgentHubLayout({ children }: { children: ReactNode }) {
  return children;
}
