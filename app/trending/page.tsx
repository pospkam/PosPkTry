import type { Metadata } from 'next';
import { TrendingClient } from './_TrendingClient';

export const metadata: Metadata = {
  title: 'Популярные маршруты и места Камчатки | КамчатурХаб',
  description: 'Самые популярные места и маршруты Камчатки прямо сейчас',
};

export default function TrendingPage() {
  return <TrendingClient />;
}
