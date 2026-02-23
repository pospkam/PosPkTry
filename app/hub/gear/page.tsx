import type { Metadata } from 'next';
import GearHubClient from './_GearHubClient';

export const metadata: Metadata = {
  title: 'Аренда снаряжения | Kamhub',
  description: 'Заказ и управление снаряжением для туров на Камчатке',
  robots: 'noindex, nofollow',
};

export default function GearHub() {
  return <GearHubClient />;
}
