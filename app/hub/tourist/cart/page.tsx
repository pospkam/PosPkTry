import type { Metadata } from 'next';
import { Header } from '@/components/layout/Header';
import CartClient from './_CartClient';

export const metadata: Metadata = {
  title: 'Корзина | Tourhab',
};

export default function CartPage() {
  return (
    <>
      <Header />
      <CartClient />
    </>
  );
}
