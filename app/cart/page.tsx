import type { Metadata } from 'next';
import { Header } from '@/components/layout/Header';
import CartClient from '@/app/hub/tourist/cart/_CartClient';

export const metadata: Metadata = {
  title: 'Корзина | Tourhab',
  robots: { index: false, follow: true },
};

export default function CartPage() {
  return (
    <>
      <Header />
      <CartClient />
    </>
  );
}
