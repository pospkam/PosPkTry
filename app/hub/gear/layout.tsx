import { Metadata } from 'next';
import { ReactNode } from 'react';

export const metadata: Metadata = {
  title: 'Аренда снаряжения | Kamchatour',
  description: 'Аренда туристического снаряжения на Камчатке: палатки, спальники, снаряжение.',
  robots: 'noindex, nofollow',
};

export default function GearHubLayout({ children }: { children: ReactNode }) {
  return children;
}
