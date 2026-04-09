import { Metadata } from 'next';
import { ReactNode } from 'react';

export const metadata: Metadata = {
  title: {
    template: '%s | Tourhab',
    default: 'Правовые документы | Tourhab',
  },
  description: 'Правовые документы платформы Tourhab (tourhab.ru)',
};

export default function LegalLayout({ children }: { children: ReactNode }) {
  return children;
}
