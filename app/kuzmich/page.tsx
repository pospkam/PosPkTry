import type { Metadata } from 'next';
import { Header } from '@/components/layout/Header';
import KuzmichClient from './_KuzmichClient';

export const metadata: Metadata = {
  title: 'Кузьмич — AI-помощник по турам Камчатки | Kamchatour Hub',
  description: 'Опишите мечту — AI-оператор Кузьмич подберёт лучший тур. Рыбалка, вулканы, медведи, горячие источники.',
  robots: 'index, follow',
};

export default function KuzmichPage() {
  return (
    <div className="bg-[var(--bg-primary)] text-[var(--text-primary)] min-h-[100dvh] flex flex-col">
      <Header />
      <KuzmichClient />
    </div>
  );
}
