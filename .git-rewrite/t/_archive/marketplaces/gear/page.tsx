import type { Metadata } from 'next';
import GearRentalPageClient from './_GearRentalPageClient';

export const metadata = {
  title: 'Аренда снаряжения на Камчатке | Kamhub',
  description: 'Аренда туристического снаряжения, палаток, спальников, рюкзаков и другого оборудования для походов на Камчатке',
};

export default function GearRentalPage() {
  return <GearRentalPageClient />;
}
