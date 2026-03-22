import type { Metadata } from 'next';
import ShopPageClient from './_ShopPageClient';

export const metadata: Metadata = {
  title: 'Сувениры Камчатки | Kamhub',
  description: 'Купить сувениры и подарки с Камчатки: мед, икра, изделия из меха и камня',
};

export default function ShopPage() {
  return <ShopPageClient />;
}
