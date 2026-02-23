import type { Metadata } from 'next';
import SouvenirsHubClient from './_SouvenirsHubClient';

export const metadata: Metadata = {
  title: 'Сувениры | Kamhub',
  description: 'Каталог и заказ сувениров с Камчатки',
  robots: 'noindex, nofollow',
};

export default function SouvenirsHub() {
  return <SouvenirsHubClient />;
}
