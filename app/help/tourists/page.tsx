import type { Metadata } from 'next';
import TouristsHelpClient from './_TouristsHelpClient';

export const metadata: Metadata = {
  title: 'Помощь туристам — TourHab Камчатка',
  description: 'Как найти тур, забронировать, оплатить и подготовиться к путешествию на Камчатку',
};

export default function TouristsHelpPage() {
  return <TouristsHelpClient />;
}
