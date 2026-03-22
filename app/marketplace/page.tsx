import { Metadata } from 'next';
import MarketplaceClient from '@/components/marketplace/MarketplaceClient';

export const metadata: Metadata = {
  title: 'Туры Камчатки',
  description: 'Каталог туров по Камчатке: рыбалка, треккинг, термальные источники',
  openGraph: {
    title: 'Туры Камчатки',
    description: 'Каталог туров по Камчатке',
    type: 'website'
  }
};

export default function MarketplacePage() {
  return <MarketplaceClient />;
}
