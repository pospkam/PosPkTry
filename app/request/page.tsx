import type { Metadata } from 'next';
import { Header } from '@/components/layout/Header';
import RequestClient from './_RequestClient';

export const metadata: Metadata = {
  title: 'Оставить заявку на тур | Kamchatour Hub',
  description: 'Персональный подбор туров на Камчатку. AI-помощник Кузьмич обработает заявку за 15 секунд и подберёт 3 лучших тура.',
  robots: 'index, follow',
};

export default function RequestPage() {
  return (
    <div className="bg-[var(--bg-primary)] text-[var(--text-primary)] min-h-[100dvh] flex flex-col">
      <Header />
      <RequestClient />
    </div>
  );
}
